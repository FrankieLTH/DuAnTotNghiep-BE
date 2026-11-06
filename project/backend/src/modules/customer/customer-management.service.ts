import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Booking, BookingRoom, BookingRequest, LockPin, Payment, Transaction, AuditLog, Refund } from '../../entities/booking.entity';
import { customerNetPaid } from './customer-finance';
import { Customer } from '../../entities/user.entity';
import { RoomType } from '../../entities/room.entity';
import { CustomerBookingRequestDto, ReviewCustomerRequestDto, UpdateCustomerProfileDto } from './customer.dto';
import { StaffContext } from '../../common/config/permissions.config';

@Injectable()
export class CustomerManagementService {
  constructor(private db: DataSource) {}
  async updateProfile(customerId: number, data: UpdateCustomerProfileDto) {
    await this.db.getRepository(Customer).update({ id: customerId, is_blocked: false, is_hidden: false }, {
      full_name: data.full_name, phone: data.phone || null,
    });
    const customer = await this.db.getRepository(Customer).findOneBy({ id: customerId, is_blocked: false, is_hidden: false });
    if (!customer) throw new NotFoundException('Không tìm thấy tài khoản.');
    return { customer: { id: customer.id, full_name: customer.full_name, email: customer.email, phone: customer.phone, account_created_at: customer.account_created_at, email_verified_at: customer.email_verified_at } };
  }

  async ownedBooking(customerId: number, id: number) {
    const booking = await this.db.getRepository(Booking).findOne({
      where: { id, customer_id: customerId }, relations: ['booking_rooms', 'room'],
    });
    if (!booking) throw new NotFoundException('Không tìm thấy booking.');
    return booking;
  }

  async requests(customerId: number, bookingId: number) {
    await this.ownedBooking(customerId, bookingId);
    const rows = await this.db.getRepository(BookingRequest).find({ where: { booking_id: bookingId, customer_id: customerId }, order: { created_at: 'DESC' } });
    return rows.map(({ handled_by, customer, booking, ...request }) => request);
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
        const transactions = await manager.getRepository(Transaction).findBy({ booking_id: bookingId });
        const payments = await manager.getRepository(Payment).findBy({ booking_id: bookingId, payment_status: 'paid' });
        const refunds = await manager.getRepository(Refund).findBy({ booking_id: bookingId });
        const received = customerNetPaid(payments, transactions, refunds);
        if (received <= 0) throw new BadRequestException('Booking chưa có khoản thanh toán có thể yêu cầu hoàn.');
      }
      if (data.type === 'extend') {
        const target = new Date(`${data.requested_end_date}T12:00:00+07:00`);
        const validDate = Number.isFinite(target.getTime()) && target.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }) === data.requested_end_date;
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
      const repo = manager.getRepository(BookingRequest);
      if (await repo.existsBy({ booking_id: bookingId, type: data.type, status: In(['pending', 'reviewing']) })) {
        throw new ConflictException('Yêu cầu cùng loại đang được xử lý. Bạn có thể theo dõi phản hồi bên dưới.');
      }
      const request = await repo.save(repo.create({ booking_id: bookingId, customer_id: customerId, type: data.type, reason: data.reason,
        requested_end_date: data.type === 'extend' ? data.requested_end_date : null,
        requested_room_type_id: data.type === 'change_room' ? data.requested_room_type_id : null,
      }));
      return { id: request.id, status: request.status, message: 'Đã gửi yêu cầu. Nhân viên sẽ kiểm tra tình trạng phòng và chi phí trước khi xử lý.' };
    });
  }

  async pins(customerId: number, bookingId: number) {
    const booking = await this.ownedBooking(customerId, bookingId);
    const transactions = await this.db.getRepository(Transaction).findBy({ booking_id: bookingId });
    const payments = await this.db.getRepository(Payment).findBy({ booking_id: bookingId, payment_status: 'paid' });
    const refunds = await this.db.getRepository(Refund).findBy({ booking_id: bookingId });
    const paid = customerNetPaid(payments, transactions, refunds);
    const now = new Date();
    if (!['confirmed', 'checked_in'].includes(booking.booking_status) || booking.verification_status !== 'passed' ||
        Number(booking.total_price) <= 0 || paid < Number(booking.total_price) || now < booking.booked_start_time || now >= booking.booked_end_time) {
      throw new ForbiddenException('Chỉ xem được mã trong thời gian lưu trú, khi đơn đã thanh toán đủ, giấy tờ được duyệt và mã đã được cấp.');
    }
    const roomIds = [...booking.booking_rooms.map(r => r.room_id), booking.room_id].filter(Boolean);
    const pins = await this.db.getRepository(LockPin).find({ where: { booking_id: bookingId, status: 'active' }, relations: ['lock', 'lock.room'] });
    const visible = pins.filter(p => p.lock_pin_start_time && p.lock_pin_end_time && p.lock_pin_start_time <= now && p.lock_pin_end_time > now && roomIds.includes(p.lock?.room_id));
    if (!visible.length) throw new NotFoundException('Chưa có mã vào cửa còn hiệu lực. Vui lòng liên hệ lễ tân.');
    await this.db.getRepository(AuditLog).save({ actor: `customer:${customerId}`, action: 'CUSTOMER_VIEW_PIN', entity_type: 'BOOKINGS', entity_id: bookingId });
    return visible.map(p => ({ room_number: p.lock.room.room_number, pin: p.pin, valid_from: p.lock_pin_start_time, valid_until: p.lock_pin_end_time }));
  }

  async staffRequests(staff: StaffContext) {
    const query = this.db.getRepository(BookingRequest).createQueryBuilder('r')
      .innerJoinAndSelect('r.booking', 'booking').innerJoinAndSelect('r.customer', 'customer')
      .addSelect("CASE WHEN r.status = 'pending' THEN 0 WHEN r.status = 'reviewing' THEN 1 ELSE 2 END", 'request_priority')
      .orderBy('request_priority', 'ASC').addOrderBy('r.created_at', 'DESC').take(100);
    if (staff.apartmentId) query.andWhere('booking.apartment_id = :branch', { branch: staff.apartmentId });
    return (await query.getMany()).map(r => ({ ...r, booking: undefined, customer: undefined, booking_code: r.booking.booking_code, customer_name: r.customer.full_name }));
  }

  async reviewRequest(staff: StaffContext, id: number, data: ReviewCustomerRequestDto) {
    return this.db.transaction(async manager => {
      const row = await manager.getRepository(BookingRequest).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!row) throw new NotFoundException('Không tìm thấy yêu cầu.');
      const booking = await manager.getRepository(Booking).findOneBy({ id: row.booking_id });
      if (!booking || (staff.apartmentId && booking.apartment_id !== staff.apartmentId)) throw new NotFoundException('Không tìm thấy yêu cầu.');
      if (['resolved', 'rejected'].includes(row.status)) throw new ConflictException('Yêu cầu đã được kết thúc.');
      row.status = data.status; row.staff_reply = data.staff_reply; row.handled_by = staff.actor; row.handled_at = new Date();
      await manager.getRepository(BookingRequest).save(row);
      await manager.getRepository(AuditLog).save({ actor: staff.actor, action: 'REVIEW_CUSTOMER_REQUEST', entity_type: 'booking_requests', entity_id: id, new_value: JSON.stringify({ status: row.status }) });
      return { message: 'Đã cập nhật phản hồi yêu cầu. Trạng thái booking và giao dịch được xử lý tại nghiệp vụ tương ứng.' };
    });
  }
}
