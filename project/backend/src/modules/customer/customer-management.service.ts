import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Booking, BookingRoom, LockPin, Lock, Payment, Transaction, AuditLog, Refund } from '../../entities/booking.entity';
import { customerNetPaid } from './customer-finance';
import { Customer } from '../../entities/user.entity';
import { RoomType } from '../../entities/room.entity';
import { CustomerBookingRequestDto, ReviewCustomerRequestDto, UpdateCustomerProfileDto } from './customer.dto';
import { BookingStatus, TransactionType } from '@shared/enums';
import { StaffContext } from '../../common/config/permissions.config';
import { bangkokDateString } from '../../common/utils/bangkok-date';

@Injectable()
export class CustomerManagementService {
  constructor(private db: DataSource) {}
  async updateProfile(customerId: number, data: UpdateCustomerProfileDto) {
    await this.db.getRepository(Customer).update({ id: customerId, is_blocked: false, is_hidden: false }, {
      full_name: data.full_name, phone: data.phone || null,
    });
    const customer = await this.db.getRepository(Customer).findOneBy({ id: customerId, is_blocked: false, is_hidden: false });
    if (!customer) throw new NotFoundException('Không tìm thấy tài khoản.');
    return { customer: { id: customer.id, full_name: customer.full_name, email: customer.email, phone: customer.phone, account_created_at: customer.account_created_at, email_verified_at: customer.email_verified_at, wallet_balance: Number(customer.wallet_balance || 0), wallet_available: Math.max(0, Number(customer.wallet_balance || 0) - Number(customer.wallet_reserved || 0)) } };
  }

  async ownedBooking(customerId: number, id: number) {
    const booking = await this.db.getRepository(Booking).findOne({
      where: { id, customer_id: customerId }, relations: ['booking_rooms', 'booking_rooms.room', 'room'],
    });
    if (!booking) throw new NotFoundException('Không tìm thấy booking.');
    return booking;
  }

  private requestView(row: any, refunds: Refund[]) {
    const refund = refunds.find(r => r.id === row.refund_id);
    const status = refund ? ({ requested: row.status === 'reviewing' ? 'reviewing' : 'pending', approved: 'approved', rejected: 'rejected', processed: 'processed' })[refund.status] : row.status;
    return { ...row, status, ...(refund ? { refund_amount: Number(refund.refund_amount) } : {}) };
  }
  private async refundRequest(manager: EntityManager, bookingId: number, reason: string) {
    const booking = await manager.getRepository(Booking).findOneBy({ id: bookingId });
    if (!booking) throw new NotFoundException('Không tìm thấy booking.');
    // Project policy: refund requests are reviewed by staff; approval credits exactly 50% of the remaining paid amount to the customer's wallet.
    const percent = 50;
    const transactions = await manager.getRepository(Transaction).findBy({ booking_id: bookingId });
    const payments = await manager.getRepository(Payment).findBy({ booking_id: bookingId });
    const refunds = await manager.getRepository(Refund).findBy({ booking_id: bookingId });
    if (refunds.some(r => ['approved', 'processed'].includes(r.status))) throw new ConflictException('Đơn đã được hoàn tiền một lần.');
    const available = customerNetPaid(payments, transactions, refunds) - refunds.filter(r => ['requested'].includes(r.status)).reduce((n, r) => n + Number(r.refund_amount), 0);
    if (available <= 0) throw new BadRequestException('Không còn khoản thanh toán có thể yêu cầu hoàn.');
    const amount = Math.floor(available * 0.5);
    if (amount < 1) throw new BadRequestException('Số tiền hoàn phải từ 1 đồng.');
    const paidRows = payments.filter(p => p.payment_status === 'paid');
    const payment = paidRows.length === 1 && Number(paidRows[0].amount) >= amount ? paidRows[0] : null;
    return manager.getRepository(Refund).save({ booking_id: bookingId, payment_id: payment?.id || null, refund_amount: amount, refund_percentage: percent, reason, status: 'requested' });
  }
  async requests(customerId: number, bookingId: number) {
    const booking = await this.ownedBooking(customerId, bookingId);
    const refunds = await this.db.getRepository(Refund).findBy({ booking_id: bookingId });
    return (booking.checkout_data?.requests || []).map(row => this.requestView(row, refunds)).sort((a, b) => b.id - a.id);
  }

  async roomOptions(customerId: number, bookingId: number) {
    const booking = await this.ownedBooking(customerId, bookingId);
    return this.db.getRepository(RoomType).find({
      where: { apartment_id: booking.apartment_id, is_active: true },
      select: ['id', 'name', 'max_occupancy', 'base_price'], order: { name: 'ASC' },
    });
  }

  async createRequest(customerId: number, bookingId: number, data: CustomerBookingRequestDto) {
    return this.db.transaction(async manager => {
      const booking = await manager.getRepository(Booking).findOne({ where: { id: bookingId, customer_id: customerId }, lock: { mode: 'pessimistic_write' } });
      if (!booking) throw new NotFoundException('Không tìm thấy booking.');
      const active = ['draft', 'pending_payment', 'confirmed', 'checked_in'].includes(booking.booking_status);
      if (data.type !== 'refund' && (!active || booking.booked_end_time <= new Date())) {
        throw new BadRequestException('Booking không còn được gửi yêu cầu thay đổi.');
      }
      if (data.type === 'cancel' && (booking.booking_status === 'checked_in' || booking.booked_start_time <= new Date())) {
        throw new BadRequestException('Đã đến thời gian lưu trú. Vui lòng liên hệ lễ tân để xử lý.');
      }
      if (['extend', 'change_room'].includes(data.type) && !['confirmed', 'checked_in'].includes(booking.booking_status)) {
        throw new BadRequestException('Chỉ booking đã xác nhận hoặc đang lưu trú mới được yêu cầu đổi phòng/gia hạn.');
      }
      if (data.type === 'refund') {
        if (!['confirmed', 'cancelled'].includes(booking.booking_status) || booking.booked_start_time <= new Date()) throw new BadRequestException('Yêu cầu hoàn tiền chỉ áp dụng cho đơn đã thanh toán trước ngày nhận phòng.');
        const transactions = await manager.getRepository(Transaction).findBy({ booking_id: bookingId });
        const payments = await manager.getRepository(Payment).findBy({ booking_id: bookingId, payment_status: 'paid' });
        const refunds = await manager.getRepository(Refund).findBy({ booking_id: bookingId });
        const received = customerNetPaid(payments, transactions, refunds);
        if (received <= 0) throw new BadRequestException('Booking chưa có khoản thanh toán có thể yêu cầu hoàn.');
      }
      if (data.type === 'extend') {
        const target = new Date(`${data.requested_end_date}T12:00:00+07:00`);
        const validDate = Number.isFinite(target.getTime()) && bangkokDateString(target) === data.requested_end_date;
        if (!validDate || target <= booking.booked_end_time || target.getTime() - booking.booked_end_time.getTime() > 90 * 86400000) {
          throw new BadRequestException('Ngày trả phòng mới phải sau ngày hiện tại của đơn và không quá 90 ngày gia hạn.');
        }
      }
      if (data.type === 'change_room') {
        const type = await manager.getRepository(RoomType).findOneBy({ id: data.requested_room_type_id, apartment_id: booking.apartment_id, is_active: true });
        if (!type) throw new BadRequestException('Loại phòng phải đang hoạt động và thuộc cùng chi nhánh.');
        const roomCount = Math.max(1, await manager.getRepository(BookingRoom).countBy({ bookings_id: bookingId }));
        if (type.max_occupancy * roomCount < booking.adults) throw new BadRequestException('Loại phòng không đủ sức chứa cho đoàn.');
      }
      const rows = booking.checkout_data?.requests || [];
      if (rows.some(row => row.type === data.type && ['pending', 'reviewing'].includes(row.status))) {
        throw new ConflictException('Yêu cầu cùng loại đang được xử lý. Bạn có thể theo dõi phản hồi bên dưới.');
      }
      const refund = data.type === 'refund' ? await this.refundRequest(manager, bookingId, data.reason) : null;
      const log = await manager.getRepository(AuditLog).save({ actor: `customer:${customerId}`, action: 'CUSTOMER_BOOKING_REQUEST', entity_type: 'BOOKINGS', entity_id: bookingId, new_value: JSON.stringify({ type: data.type, reason: data.reason }) });
      const request = { id: log.id, booking_id: bookingId, customer_id: customerId, type: data.type, status: 'pending', reason: data.reason, created_at: new Date().toISOString(),
        requested_end_date: data.type === 'extend' ? data.requested_end_date : null,
        requested_room_type_id: data.type === 'change_room' ? data.requested_room_type_id : null,
        ...(refund ? { refund_id: refund.id } : {}) };
      booking.checkout_data = { ...booking.checkout_data, requests: [...rows, request] };
      await manager.getRepository(Booking).save(booking);
      return { id: request.id, status: request.status, message: 'Đã gửi yêu cầu. Admin sẽ duyệt hoặc từ chối và phản hồi tại đơn này.' };
    });
  }

  async pins(customerId: number, bookingId: number) {
    const booking = await this.ownedBooking(customerId, bookingId);
    const transactions = await this.db.getRepository(Transaction).findBy({ booking_id: bookingId });
    const payments = await this.db.getRepository(Payment).findBy({ booking_id: bookingId, payment_status: 'paid' });
    const refunds = await this.db.getRepository(Refund).findBy({ booking_id: bookingId });
    const paid = customerNetPaid(payments, transactions, refunds);
    const total = Number(booking.total_price);
    const isPaid = ['confirmed', 'checked_in', 'checked_out'].includes(booking.booking_status) || (total > 0 && paid >= total);

    if (!isPaid) {
      throw new ForbiddenException('Mã khóa phòng sẽ hiển thị sau khi đơn hàng được xác nhận thanh toán.');
    }

    const generateBookingPin = (seed: string | number): string => {
      const str = String(seed);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
      }
      return String((hash % 900000) + 100000);
    };

    let pins = await this.db.getRepository(LockPin).find({
      where: { booking_id: bookingId },
      relations: ['lock', 'lock.room'],
    });
    pins = pins.filter(p => p.status !== 'revoked');

    if (!pins.length) {
      const assignedRooms = [
        ...booking.booking_rooms.map(br => br.room).filter(Boolean),
        booking.room,
      ].filter(Boolean);

      const uniqueRooms = Array.from(new Map(assignedRooms.map(r => [r.id, r])).values());

      for (const room of uniqueRooms) {
        const lock = await this.db.getRepository(Lock).findOne({ where: { room_id: room.id } });
        if (lock) {
          const pin = generateBookingPin(`${booking.booking_code}_${room.id}`);
          const newPin = this.db.getRepository(LockPin).create({
            booking_id: booking.id,
            lock_id: lock.id,
            pin,
            lock_pin_start_time: booking.booked_start_time,
            lock_pin_end_time: booking.booked_end_time,
            status: 'active',
          });
          await this.db.getRepository(LockPin).save(newPin);
          newPin.lock = lock;
          newPin.lock.room = room;
          pins.push(newPin);
        }
      }
    }

    if (!pins.length) {
      const roomNumber = booking.booking_rooms?.[0]?.room?.room_number || booking.room?.room_number || 'Đang cập nhật';
      return [{
        room_number: roomNumber,
        pin: generateBookingPin(booking.booking_code),
        valid_from: booking.booked_start_time,
        valid_until: booking.booked_end_time,
      }];
    }

    await this.db.getRepository(AuditLog).save({ actor: `customer:${customerId}`, action: 'CUSTOMER_VIEW_PIN', entity_type: 'BOOKINGS', entity_id: bookingId });
    return pins.map(p => ({
      room_number: p.lock?.room?.room_number || 'Phòng',
      pin: p.pin,
      valid_from: p.lock_pin_start_time || booking.booked_start_time,
      valid_until: p.lock_pin_end_time || booking.booked_end_time,
    }));
  }

  async staffRequests(staff: StaffContext) {
    const query = this.db.getRepository(Booking).createQueryBuilder('b').innerJoinAndSelect('b.customer', 'customer')
      .where("JSON_LENGTH(b.checkout_data, '$.requests') > 0");
    if (staff.apartmentId) query.andWhere('b.apartment_id = :branch', { branch: staff.apartmentId });
    const bookings = await query.getMany();
    const refunds = bookings.length ? await this.db.getRepository(Refund).find({ where: bookings.map(b => ({ booking_id: b.id })) }) : [];
    return bookings.flatMap(b => (b.checkout_data.requests || []).map(row => ({ ...this.requestView(row, refunds), booking_code: b.booking_code, customer_name: b.customer.full_name })))
      .sort((a, b) => Number(!['pending', 'reviewing'].includes(a.status)) - Number(!['pending', 'reviewing'].includes(b.status)) || b.id - a.id).slice(0, 100);
  }

  async reviewRequest(staff: StaffContext, id: number, data: ReviewCustomerRequestDto) {
    if (staff.role !== 'admin') throw new ForbiddenException('Chỉ admin được duyệt hoặc từ chối yêu cầu hủy/hoàn.');
    return this.db.transaction(async manager => {
      const log = await manager.getRepository(AuditLog).findOneBy({ id, action: 'CUSTOMER_BOOKING_REQUEST', entity_type: 'BOOKINGS' });
      if (!log) throw new NotFoundException('Không tìm thấy yêu cầu.');
      const booking = await manager.getRepository(Booking).findOne({ where: { id: log.entity_id }, lock: { mode: 'pessimistic_write' } });
      if (!booking || (staff.apartmentId && booking.apartment_id !== staff.apartmentId)) throw new NotFoundException('Không tìm thấy yêu cầu.');
      const rows = booking.checkout_data?.requests || [];
      const row = rows.find(r => r.id === id);
      if (!row) throw new NotFoundException('Không tìm thấy yêu cầu.');
      if (!['pending', 'reviewing'].includes(row.status)) throw new ConflictException('Yêu cầu đã được kết thúc.');
      if (['cancel', 'refund'].includes(row.type) && data.status === 'resolved') throw new BadRequestException('Vui lòng chọn duyệt hoặc từ chối yêu cầu.');
      if (!['cancel', 'refund'].includes(row.type) && data.status === 'approved') throw new BadRequestException('Đổi phòng/gia hạn cần thực hiện nghiệp vụ riêng trước khi phản hồi.');
      if (row.type === 'refund') {
        let refund = row.refund_id ? await manager.getRepository(Refund).findOneBy({ id: row.refund_id, booking_id: booking.id }) : null;
        if (!refund && data.status !== 'rejected') { refund = await this.refundRequest(manager, booking.id, row.reason); row.refund_id = refund.id; }
        if (refund) {
          if (refund.status !== 'requested') throw new ConflictException('Yêu cầu hoàn tiền đã được xử lý.');
          if (data.status === 'approved') {
            const payments = await manager.getRepository(Payment).findBy({ booking_id: booking.id });
            const transactions = await manager.getRepository(Transaction).findBy({ booking_id: booking.id });
            const refunds = await manager.getRepository(Refund).findBy({ booking_id: booking.id });
            const reserved = refunds.filter(r => r.id !== refund.id && ['requested', 'approved'].includes(r.status)).reduce((n, r) => n + Number(r.refund_amount), 0);
            if (Number(refund.refund_amount) > customerNetPaid(payments, transactions, refunds) - reserved) throw new ConflictException('Số tiền còn có thể hoàn đã thay đổi. Cần kiểm tra lại giao dịch.');
            if (refunds.some(r => r.id !== refund.id && ['approved', 'processed'].includes(r.status))) throw new ConflictException('Đơn đã được hoàn tiền.');
            if (!['confirmed', 'cancelled'].includes(booking.booking_status) || booking.booked_start_time <= new Date()) throw new ConflictException('Đơn không còn đủ điều kiện hoàn tiền trước ngày nhận phòng.');
            const customer = await manager.getRepository(Customer).findOne({ where: { id: booking.customer_id }, lock: { mode: 'pessimistic_write' } });
            if (!customer) throw new NotFoundException('Không tìm thấy khách hàng để cộng số dư.');
            const amount = Number(refund.refund_amount);
            customer.wallet_balance = Number(customer.wallet_balance || 0) + amount;
            await manager.getRepository(Customer).save(customer);
            await manager.getRepository(Transaction).save(manager.getRepository(Transaction).create({ booking_id: booking.id, type: TransactionType.REFUND, amount, payment_method: 'customer_wallet', transaction_code: `WALLET_REFUND_${refund.id}`, note: `Hoàn ${refund.refund_percentage}% vào số dư khách hàng`, created_by: staff.staffId || null }));
            refund.status = 'processed';

            await manager.getRepository(Refund).save(refund);
            if (booking.booking_status !== BookingStatus.CANCELLED) {
              booking.booking_status = BookingStatus.CANCELLED;
              booking.cancel_reason = row.reason;
              booking.cancelled_at = new Date();
              booking.cancelled_by = staff.staffId || null;
              booking.hold_expires_at = null;
              await manager.getRepository(BookingRoom).update({ bookings_id: booking.id }, { room_id: null });
              await manager.getRepository(LockPin).update({ booking_id: booking.id }, { status: 'revoked' });
            }
          }
          if (data.status === 'rejected') { refund.status = 'rejected'; await manager.getRepository(Refund).save(refund); }
        }
      }
      if (row.type === 'cancel' && data.status === 'approved') {
        if (!['draft', 'pending_payment', 'confirmed'].includes(booking.booking_status) || booking.booked_start_time <= new Date()) throw new ConflictException('Đơn không còn đủ điều kiện hủy trước giờ nhận phòng.');
        booking.booking_status = BookingStatus.CANCELLED; booking.cancel_reason = row.reason; booking.cancelled_at = new Date(); booking.cancelled_by = staff.staffId || null; booking.hold_expires_at = null;
        await manager.getRepository(BookingRoom).update({ bookings_id: booking.id }, { room_id: null });
        await manager.getRepository(LockPin).update({ booking_id: booking.id }, { status: 'revoked' });
      }
      const previous = { ...row };
      row.status = row.type === 'refund' && data.status === 'approved' ? 'processed' : data.status; row.staff_reply = data.staff_reply; row.handled_by = staff.actor; row.handled_at = new Date().toISOString();
      booking.checkout_data = { ...booking.checkout_data, requests: rows };
      await manager.getRepository(Booking).save(booking);
      await manager.getRepository(AuditLog).save({ actor: staff.actor, action: 'REVIEW_CUSTOMER_REQUEST', entity_type: 'BOOKINGS', entity_id: booking.id, old_value: JSON.stringify(previous), new_value: JSON.stringify(row) });
      return { message: data.status === 'approved' ? (row.type === 'cancel' ? 'Đã duyệt hủy đơn. Hoàn tiền (nếu có) được xử lý riêng.' : 'Đã cộng 50% tiền hoàn vào số dư khách hàng.') : 'Đã cập nhật phản hồi cho khách.' };
    });
  }
}
