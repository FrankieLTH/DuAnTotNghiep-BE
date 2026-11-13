import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { randomUUID } from 'crypto';
import { Customer } from '../../entities/user.entity';
import { Room, RoomType } from '../../entities/room.entity';
import { Booking, BookingRoom, BookingGuest, Payment, Transaction, Refund } from '../../entities/booking.entity';
import { BookingStatus, BookingType, GuestType, GuestSlotStatus } from '@shared/enums';
import { CustomerBookingQuery, GuestBookingDto, CompleteCheckoutDto, CheckoutBookerDto, SaveGuestDraftDto } from './customer.dto';
import { computeStayWindow } from '@shared/stay-window';
import { customerNetPaid } from './customer-finance';

@Injectable()
export class CustomerBookingsService {
  constructor(private db: DataSource) {}
  async list(customerId: number, query: CustomerBookingQuery) {
    const page = query.page || 1;
    const [bookings, total] = await this.db.getRepository(Booking).findAndCount({
      where: { customer_id: customerId, ...(query.status ? { booking_status: query.status as BookingStatus } : {}) },
      relations: ['apartment', 'room', 'room.room_type', 'booking_rooms', 'booking_rooms.room_type', 'booking_rooms.room'],
      order: { created_at: 'DESC', id: 'DESC' }, skip: (page - 1) * 10, take: 10,
    });
    const ids = bookings.map(b => b.id);
    const payments = ids.length ? await this.db.getRepository(Payment).find({ where: { booking_id: In(ids) } }) : [];
    const transactions = ids.length ? await this.db.getRepository(Transaction).find({ where: { booking_id: In(ids) } }) : [];
    const refunds = ids.length ? await this.db.getRepository(Refund).find({ where: { booking_id: In(ids) } }) : [];
    return { items: bookings.map(b => this.serialize(b, payments.filter(p => p.booking_id === b.id), transactions.filter(t => t.booking_id === b.id), refunds.filter(r => r.booking_id === b.id))), total, page, page_size: 10 };
  }
  async detail(customerId: number, id: number) {
    // Ownership is part of the query: another customer's ID behaves like a missing ID.
    const b = await this.db.getRepository(Booking).findOne({
      where: { id, customer_id: customerId },
      relations: ['apartment', 'room', 'room.room_type', 'booking_rooms', 'booking_rooms.room_type', 'booking_rooms.room'],
    });
    if (!b) throw new NotFoundException('Không tìm thấy booking.');
    const payments = await this.db.getRepository(Payment).find({ where: { booking_id: id }, order: { created_at: 'DESC' } });
    const transactions = await this.db.getRepository(Transaction).find({ where: { booking_id: id }, order: { created_at: 'DESC' } });
    const refunds = await this.db.getRepository(Refund).find({ where: { booking_id: id }, order: { created_at: 'DESC' } });
    return {
      ...this.serialize(b, payments, transactions, refunds),
      payments: payments.map(p => ({ id: p.id, amount: Number(p.amount), status: p.payment_status, paid_at: p.paid_at })),
      transactions: transactions.map(t => ({ id: t.id, type: t.type, amount: Number(t.amount), payment_method: t.payment_method, created_at: t.created_at })),
      refunds: refunds
        .map(r => ({ id: r.id, amount: Number(r.refund_amount), status: r.status, created_at: r.created_at })),
      verification_status: b.verification_status,
    };
  }
  private serialize(b: Booking, payments: Payment[], transactions: Transaction[], refunds: Refund[] = []) {
    // TRANSACTION is the cash ledger; payments may describe the same receipts, so never add both totals.
    const paid = customerNetPaid(payments, transactions, refunds);
    const total = Number(b.total_price);
    const payment_status = paid >= total && total > 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
    return {
      id: b.id, booking_code: b.booking_code, booking_status: b.booking_status,
      apartment_name: b.apartment?.name || b.room?.apartment?.name || null,
      address: b.apartment?.address || null, booked_start_time: b.booked_start_time, booked_end_time: b.booked_end_time,
      adults: b.adults, children: b.children, total_price: total, discount_amount: Number(b.discount_amount),
      paid_amount: paid, remaining_amount: Math.max(0, total - paid), payment_status,
      hold_expires_at: b.hold_expires_at, created_at: b.created_at,
      can_resume: (b.booking_status === 'expired' || (['draft', 'pending_payment'].includes(b.booking_status) && !!b.hold_expires_at && b.hold_expires_at <= new Date())) && b.booked_start_time > new Date() && !!b.checkout_data?.booker && paid === 0,
      can_continue: ['draft', 'pending_payment'].includes(b.booking_status) && !!b.hold_expires_at && b.hold_expires_at > new Date(),
      rooms: b.booking_rooms?.length ? b.booking_rooms.map(r => ({ room_type_name: r.room_type?.name, room_number: r.room?.room_number || null }))
        : b.room ? [{ room_type_name: b.room.room_type?.name, room_number: b.room.room_number }] : [],
    };
  }
  private ensureCheckoutOpen(booking: Booking) {
    if (!['draft', 'pending_payment'].includes(booking.booking_status) || !booking.hold_expires_at || booking.hold_expires_at <= new Date()) {
      throw new ConflictException('Đơn đã hết thời gian giữ chỗ hoặc không còn được tiếp tục. Vui lòng chọn phòng lại.');
    }
  }

  async resume(customerId: number, id: number) {
    await this.db.transaction(async manager => {
      const original = await manager.getRepository(Booking).findOne({ where: { id, customer_id: customerId }, relations: ['booking_rooms'] });
      if (!original) throw new NotFoundException('Không tìm thấy booking.');
      const quantities = new Map<number, number>();
      for (const row of original.booking_rooms) quantities.set(row.room_types_id, (quantities.get(row.room_types_id) || 0) + 1);
      if (!quantities.size || !original.checkout_data?.booker) throw new ConflictException('Đơn này cần lễ tân hỗ trợ để tiếp tục.');
      // Match the lock order used when creating reservations to serialize capacity checks.
      const types: RoomType[] = [];
      for (const typeId of [...quantities.keys()].sort((a, b) => a - b)) {
        const type = await manager.getRepository(RoomType).findOne({ where: { id: typeId, is_active: true }, lock: { mode: 'pessimistic_write' } });
        if (!type) throw new ConflictException('Loại phòng này hiện không còn nhận đặt.');
        types.push(type);
      }
      const booking = await manager.getRepository(Booking).findOne({ where: { id, customer_id: customerId }, lock: { mode: 'pessimistic_write' } });
      if (!booking) throw new NotFoundException('Không tìm thấy booking.');
      const now = new Date();
      if (['draft', 'pending_payment'].includes(booking.booking_status) && booking.hold_expires_at > now) return;
      if (!['expired', 'draft', 'pending_payment'].includes(booking.booking_status)) throw new ConflictException('Trạng thái đơn không cho phép tiếp tục đặt phòng.');
      if (booking.booked_start_time <= now) throw new ConflictException('Đã qua giờ nhận phòng của đơn. Vui lòng chọn ngày ở mới.');
      if (Number(booking.discount_amount) !== 0 || await manager.getRepository(Payment).countBy({ booking_id: id }) || await manager.getRepository(Transaction).countBy({ booking_id: id }) || await manager.getRepository(Refund).countBy({ booking_id: id })) throw new ConflictException('Đơn có ưu đãi hoặc giao dịch cần lễ tân kiểm tra trước khi tiếp tục.');
      const date = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
      const window = computeStayWindow(date(booking.booked_start_time), date(booking.booked_end_time), booking.stay_type || 'fullday');
      let total = 0;
      for (const type of types) {
        const capacity = await manager.getRepository(Room).count({ where: { room_type_id: type.id, status: 'available', is_hidden: false } });
        const occupied = await manager.getRepository(BookingRoom).createQueryBuilder('br').innerJoin('br.booking', 'b')
          .where('br.room_types_id = :type AND b.id != :id', { type: type.id, id })
          .andWhere('b.booked_start_time < :end AND b.booked_end_time > :start', { start: booking.booked_start_time, end: booking.booked_end_time })
          .andWhere("(b.booking_status IN ('confirmed', 'checked_in') OR (b.booking_status IN ('draft', 'pending_payment') AND b.hold_expires_at > :now))", { now }).getCount();
        const legacy = await manager.getRepository(Booking).createQueryBuilder('b').innerJoin('b.room', 'r')
          .where('r.room_type_id = :type AND b.id != :id', { type: type.id, id })
          .andWhere('b.booked_start_time < :end AND b.booked_end_time > :start', { start: booking.booked_start_time, end: booking.booked_end_time })
          .andWhere("(b.booking_status IN ('confirmed', 'checked_in') OR (b.booking_status IN ('draft', 'pending_payment') AND (b.hold_expires_at IS NULL OR b.hold_expires_at > :now)))", { now })
          .andWhere('NOT EXISTS (SELECT 1 FROM Booking_rooms x WHERE x.bookings_id = b.id)').getCount();
        if (capacity - occupied - legacy < quantities.get(type.id)) throw new ConflictException('Phòng đã có khách khác giữ chỗ. Vui lòng chọn phòng hoặc ngày ở khác.');
        const unit = Number(type.base_price) * window.nightsOrDays * window.priceFactor;
        total += unit * quantities.get(type.id);
        await manager.getRepository(BookingRoom).update({ bookings_id: id, room_types_id: type.id }, { unit_price: unit });
      }
      booking.total_price = Math.round(total);
      booking.hold_expires_at = new Date(Math.floor((Date.now() + 15 * 60000) / 1000) * 1000);
      const guests = booking.checkout_data?.guests || [];
      const completedGuests = await manager.getRepository(BookingGuest).countBy({ bookings_id: id });
      booking.booking_status = completedGuests === booking.adults + booking.children && guests.length === completedGuests && guests.every(g => g.slot_status === 'confirmed') ? BookingStatus.PENDING_PAYMENT : BookingStatus.DRAFT;
      await manager.getRepository(Booking).save(booking);
    });
    return this.checkout(customerId, id);
  }

  async checkout(customerId: number, id: number) {
    const booking = await this.db.getRepository(Booking).findOne({ where: { id, customer_id: customerId }, relations: ['customer', 'apartment', 'booking_rooms', 'booking_rooms.room_type'] });
    if (!booking) throw new NotFoundException('Không tìm thấy booking.');
    this.ensureCheckoutOpen(booking);
    const date = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
    const selections = new Map<number, any>();
    for (const room of booking.booking_rooms) {
      const old = selections.get(room.room_types_id);
      if (old) old.count++;
      else selections.set(room.room_types_id, { room_type_id: room.room_types_id, room_type_name: room.room_type?.name || 'Loại phòng', room_type_image: '', count: 1, price: Number(room.unit_price), max_occupancy: room.room_type?.max_occupancy || 1 });
    }
    const types = [...selections.values()];
    const saved = booking.checkout_data || {};
    const guests = saved.guests?.length ? saved.guests : Array.from({ length: booking.adults + booking.children }, (_, i) => ({ id: `slot-${i + 1}`, slot_index: i + 1, guest_type: i < booking.adults ? 'adult' : 'child', full_name: '', date_of_birth: '', is_booker: i === 0 && saved.booker?.is_staying !== false, is_foreigner: false, id_type: 'cccd', id_number: '', slot_status: 'empty', retry_count: 0 }));
    return {
      id: String(id), server_booking_id: id, booking_code: booking.booking_code,
      apartment_id: booking.apartment_id, apartment_name: booking.apartment?.name || '', apartment_address: booking.apartment?.address || '',
      room_type_id: types[0]?.room_type_id, room_type_name: types[0]?.room_type_name || '', room_type_image: '', booking_rooms: types,
      num_rooms: booking.booking_rooms.length, check_in_date: date(booking.booked_start_time), check_out_date: date(booking.booked_end_time),
      stay_type: booking.stay_type || 'fullday', nights: Math.max(1, Math.round((booking.booked_end_time.getTime() - booking.booked_start_time.getTime()) / 86400000)),
      num_adults: booking.adults, num_children: booking.children, children_ages: [], price_breakdown: [],
      room_subtotal: Number(booking.total_price), extra_fee_total: 0, service_total: 0, discount_amount: Number(booking.discount_amount), total_price: Number(booking.total_price),
      hold_expires_at: booking.hold_expires_at.getTime(), status: booking.booking_status === 'draft' ? 'pending_info' : 'pending_payment',
      resume_stage: booking.booking_status === 'draft' ? 'guests' : 'payment',
      booker: { ...saved.booker, full_name: saved.booker?.full_name || booking.customer.full_name, email: booking.customer.email, phone: saved.booker?.phone || booking.customer.phone || '', is_staying: saved.booker?.is_staying !== false, email_verified: true, consent_data_protection: true },
      guests,
    };
  }

  async updateBooker(customerId: number, id: number, data: CheckoutBookerDto) {
    return this.db.transaction(async manager => {
      const booking = await manager.getRepository(Booking).findOne({ where: { id, customer_id: customerId }, lock: { mode: 'pessimistic_write' } });
      if (!booking) throw new NotFoundException('Không tìm thấy booking.');
      this.ensureCheckoutOpen(booking);
      const customer = await manager.getRepository(Customer).findOneByOrFail({ id: customerId });
      booking.checkout_data = { ...booking.checkout_data, booker: { ...data, email: customer.email, consent_data_protection: true } };
      await manager.getRepository(Booking).save(booking);
      return { booking_id: id, booking_code: booking.booking_code, total_price: Number(booking.total_price), hold_expires_at: booking.hold_expires_at };
    });
  }

  async saveGuestDraft(customerId: number, id: number, data: SaveGuestDraftDto) {
    return this.db.transaction(async manager => {
      const booking = await manager.getRepository(Booking).findOne({ where: { id, customer_id: customerId }, lock: { mode: 'pessimistic_write' } });
      if (!booking) throw new NotFoundException('Không tìm thấy booking.');
      this.ensureCheckoutOpen(booking);
      if (booking.booking_status !== 'draft') throw new ConflictException('Đơn đã sang bước thanh toán.');
      if (data.guests.length !== booking.adults + booking.children) throw new BadRequestException('Số người ở không khớp với đơn.');
      booking.checkout_data = { ...booking.checkout_data, guests: data.guests.map((g, i) => ({ ...g, id: `slot-${i + 1}`, slot_index: i + 1, retry_count: 0 })) };
      await manager.getRepository(Booking).save(booking);
      return { saved: true };
    });
  }

  async completeCheckout(customerId: number, id: number, data: CompleteCheckoutDto) {
    return this.db.transaction(async manager => {
      const booking = await manager.getRepository(Booking).findOne({ where: { id, customer_id: customerId }, lock: { mode: 'pessimistic_write' } });
      if (!booking) throw new NotFoundException('Không tìm thấy booking.');
      this.ensureCheckoutOpen(booking);
      if (data.guests.length !== booking.adults + booking.children || data.guests.filter(g => g.guest_type === 'adult').length !== booking.adults) throw new BadRequestException('Danh sách người ở chưa khớp số khách đã đặt.');
      const documents = data.guests.map(g => g.id_number?.trim()).filter(Boolean);
      if (new Set(documents).size !== documents.length) throw new BadRequestException('Giấy tờ của các thành viên bị trùng.');
      for (const guest of data.guests) {
        const dob = new Date(`${guest.date_of_birth}T00:00:00+07:00`);
        if (!Number.isFinite(dob.getTime()) || dob >= booking.booked_start_time || dob.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }) !== guest.date_of_birth) throw new BadRequestException('Ngày sinh của thành viên không hợp lệ.');
        const age = Math.floor((booking.booked_start_time.getTime() - dob.getTime()) / (365.25 * 86400000));
        if ((guest.guest_type === 'adult' || age >= 10) && !guest.id_number?.trim()) throw new BadRequestException('Thiếu số giấy tờ của người ở.');
      }
      // Persist text fields only; client OCR/confirmation is not staff verification.
      await manager.getRepository(BookingGuest).delete({ bookings_id: id });
      await manager.getRepository(BookingGuest).save(data.guests.map(g => ({ bookings_id: id, full_name: g.full_name.trim(), date_of_birth: new Date(`${g.date_of_birth}T00:00:00+07:00`), guest_type: g.is_booker ? GuestType.PRIMARY : GuestType.ADDITIONAL, is_staying: true, doc_type: g.id_type as any, doc_number: g.id_number?.trim() || null, status: GuestSlotStatus.EMPTY })));
      booking.checkout_data = { ...booking.checkout_data, guests: data.guests.map((g, i) => ({ ...g, id: `slot-${i + 1}`, slot_index: i + 1, slot_status: 'confirmed', retry_count: 0 })) };
      booking.booking_status = BookingStatus.PENDING_PAYMENT;
      booking.verification_status = 'pending' as any;
      await manager.getRepository(Booking).save(booking);
      return { booking_id: id, booking_code: booking.booking_code, booking_status: booking.booking_status, total_price: Number(booking.total_price), hold_expires_at: booking.hold_expires_at };
    });
  }

  async createGuestBooking(data: GuestBookingDto, draft = false) {
    const selected = data.selected_rooms || (data.room_type_id ? [{ room_type_id: data.room_type_id, quantity: data.num_rooms || 1 }] : []);
    const quantities = new Map<number, number>();
    for (const item of selected) quantities.set(item.room_type_id, (quantities.get(item.room_type_id) || 0) + item.quantity);
    const roomCount = [...quantities.values()].reduce((a, b) => a + b, 0);
    if (!roomCount || roomCount > 10 || roomCount > data.adults) throw new BadRequestException('Chọn từ 1 đến 10 phòng, mỗi phòng có ít nhất một người lớn.');
    const stayType = data.stay_type || 'fullday';
    const window = computeStayWindow(data.check_in_date, data.check_out_date, stayType);
    const start = new Date(`${window.startAt}+07:00`), end = new Date(`${window.endAt}+07:00`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start <= new Date() || end <= start || window.nightsOrDays > 90 ||
      start.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }) !== data.check_in_date ||
      (stayType !== 'daytime' && (data.check_out_date <= data.check_in_date || end.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }) !== data.check_out_date))) throw new BadRequestException('Ngày nhận/trả phòng không hợp lệ hoặc đã qua.');
    return this.db.transaction(async manager => {
      const types: RoomType[] = [];
      for (const id of [...quantities.keys()].sort((a, b) => a - b)) {
        const type = await manager.getRepository(RoomType).findOne({ where: { id, is_active: true }, lock: { mode: 'pessimistic_write' } });
        if (!type) throw new NotFoundException('Loại phòng không khả dụng.');
        types.push(type);
      }
      if (new Set(types.map(t => t.apartment_id)).size !== 1) throw new BadRequestException('Các phòng phải thuộc cùng một chi nhánh.');
      if (types.reduce((sum, t) => sum + t.max_occupancy * quantities.get(t.id), 0) < data.adults) throw new BadRequestException('Số khách vượt sức chứa phòng.');
      let total = 0;
      for (const type of types) {
        const capacity = await manager.getRepository(Room).count({ where: { room_type_id: type.id, status: 'available', is_hidden: false } });
        const occupied = await manager.getRepository(BookingRoom).createQueryBuilder('br').innerJoin('br.booking', 'b')
          .where('br.room_types_id = :type', { type: type.id })
          .andWhere('b.booked_start_time < :end AND b.booked_end_time > :start', { start, end })
          .andWhere("(b.booking_status IN ('confirmed', 'checked_in') OR (b.booking_status IN ('draft', 'pending_payment') AND b.hold_expires_at > :now))", { now: new Date() }).getCount();
        const legacy = await manager.getRepository(Booking).createQueryBuilder('b').innerJoin('b.room', 'r')
          .where('r.room_type_id = :type', { type: type.id }).andWhere('b.booked_start_time < :end AND b.booked_end_time > :start', { start, end })
          .andWhere("(b.booking_status IN ('confirmed', 'checked_in') OR (b.booking_status IN ('draft', 'pending_payment') AND (b.hold_expires_at IS NULL OR b.hold_expires_at > :now)))", { now: new Date() })
          .andWhere('NOT EXISTS (SELECT 1 FROM Booking_rooms x WHERE x.bookings_id = b.id)').getCount();
        if (capacity - occupied - legacy < quantities.get(type.id)) throw new BadRequestException('Không còn đủ phòng cho thời gian đã chọn.');
        total += Number(type.base_price) * quantities.get(type.id) * window.nightsOrDays * window.priceFactor;
      }
      const customer = await manager.getRepository(Customer).findOneBy({ email: data.email.trim().toLowerCase(), is_blocked: false, is_hidden: false });
      if (!customer) throw new BadRequestException('Vui lòng xác thực email người đặt trước.');
      if (!customer.account_created_at) await manager.getRepository(Customer).update(customer.id, { full_name: data.full_name, phone: data.phone || customer.phone });
      const booking = await manager.getRepository(Booking).save({
        booking_code: `BK-${randomUUID().slice(0, 8).toUpperCase()}`, customer_id: customer.id,
        apartment_id: types[0].apartment_id, booking_type: (stayType === 'daytime' ? 'daily' : stayType === 'fullday' ? 'extended' : 'overnight') as BookingType,
        stay_type: stayType, start_at: start, end_at: end, booked_start_time: start, booked_end_time: end,
        adults: data.adults, children: data.children, booking_status: draft ? BookingStatus.DRAFT : BookingStatus.PENDING_PAYMENT,
        checkout_data: { booker: { full_name: data.full_name, email: data.email.trim().toLowerCase(), phone: data.phone || '', is_staying: data.is_staying !== false, consent_data_protection: true } },
        total_price: Math.round(total), hold_expires_at: new Date(Math.floor((Date.now() + 15 * 60000) / 1000) * 1000),
      });
      for (const type of types) await manager.getRepository(BookingRoom).save(Array.from({ length: quantities.get(type.id) }, () => ({ bookings_id: booking.id, room_types_id: type.id, unit_price: Number(type.base_price) * window.priceFactor * window.nightsOrDays })));
      return { booking_id: booking.id, booking_code: booking.booking_code, booking_status: booking.booking_status, total_price: Number(booking.total_price), hold_expires_at: booking.hold_expires_at };
    });
  }
}
