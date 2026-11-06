import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { randomUUID } from 'crypto';
import { Customer } from '../../entities/user.entity';
import { Room, RoomType } from '../../entities/room.entity';
import { Booking, BookingRoom, Payment, Transaction, Refund } from '../../entities/booking.entity';
import { BookingStatus, BookingType } from '@shared/enums';
import { CustomerBookingQuery, GuestBookingDto } from './customer.dto';
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
      rooms: b.booking_rooms?.length ? b.booking_rooms.map(r => ({ room_type_name: r.room_type?.name, room_number: r.room?.room_number || null }))
        : b.room ? [{ room_type_name: b.room.room_type?.name, room_number: b.room.room_number }] : [],
    };
  }
  async createGuestBooking(data: GuestBookingDto) {
    const email = data.email.trim().toLowerCase();
    const start = new Date(`${data.check_in_date}T14:00:00+07:00`);
    const end = new Date(`${data.check_out_date}T12:00:00+07:00`);
    const nights = Math.round((Date.parse(`${data.check_out_date}T00:00:00Z`) - Date.parse(`${data.check_in_date}T00:00:00Z`)) / 86400000);
    if (!Number.isFinite(nights) || nights < 1 || nights > 90 || start <= new Date()
      || start.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }) !== data.check_in_date
      || end.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }) !== data.check_out_date) {
      throw new BadRequestException('Ngày nhận/trả phòng không hợp lệ; tối đa 90 đêm.');
    }
    return this.db.transaction(async manager => {
      const type = await manager.getRepository(RoomType).findOne({ where: { id: data.room_type_id, is_active: true }, lock: { mode: 'pessimistic_write' } });
      if (!type) throw new NotFoundException('Loại phòng không khả dụng.');
      if (data.adults > type.max_occupancy * data.num_rooms) throw new BadRequestException('Số khách vượt sức chứa phòng.');
      const capacity = await manager.getRepository(Room).count({ where: { room_type_id: type.id, status: 'available', is_hidden: false } });
      const occupied = await manager.getRepository(BookingRoom).createQueryBuilder('br').innerJoin('br.booking', 'b')
        .where('br.room_types_id = :type', { type: type.id })
        .andWhere('b.booked_start_time < :end AND b.booked_end_time > :start', { start, end })
        .andWhere("(b.booking_status IN ('confirmed', 'checked_in') OR (b.booking_status IN ('draft', 'pending_payment') AND b.hold_expires_at > :now))", { now: new Date() })
        .getCount();
      const legacyOccupied = await manager.getRepository(Booking).createQueryBuilder('b')
        .innerJoin('b.room', 'room')
        .where('room.room_type_id = :type', { type: type.id })
        .andWhere('b.booked_start_time < :end AND b.booked_end_time > :start', { start, end })
        .andWhere("(b.booking_status IN ('confirmed', 'checked_in') OR (b.booking_status IN ('draft', 'pending_payment') AND (b.hold_expires_at IS NULL OR b.hold_expires_at > :now)))", { now: new Date() })
        .andWhere('NOT EXISTS (SELECT 1 FROM Booking_rooms legacy_br WHERE legacy_br.bookings_id = b.id)')
        .getCount();
      if (capacity - occupied - legacyOccupied < data.num_rooms) throw new BadRequestException('Không còn đủ phòng cho thời gian đã chọn.');
      const customers = manager.getRepository(Customer);
      await customers.createQueryBuilder().insert().values({ email, full_name: data.full_name.trim(), phone: data.phone }).orIgnore().updateEntity(false).execute();
      const customer = await customers.findOne({ where: { email } });
      if (!customer || customer.is_blocked || customer.is_hidden) throw new BadRequestException('Không thể đặt phòng với email này.');
      const booking = await manager.getRepository(Booking).save({
        booking_code: `BK-${randomUUID().slice(0, 8).toUpperCase()}`, customer_id: customer.id,
        apartment_id: type.apartment_id, booking_type: BookingType.OVERNIGHT,
        booked_start_time: start, booked_end_time: end, adults: data.adults, children: data.children,
        booking_status: BookingStatus.PENDING_PAYMENT, total_price: Number(type.base_price) * nights * data.num_rooms,
        hold_expires_at: new Date(Date.now() + 15 * 60 * 1000),
      });
      await manager.getRepository(BookingRoom).save(Array.from({ length: data.num_rooms }, () => ({ bookings_id: booking.id, room_types_id: type.id })));
      return { booking_id: booking.id, booking_code: booking.booking_code, booking_status: booking.booking_status, total_price: Number(booking.total_price), hold_expires_at: booking.hold_expires_at };
    });
  }
}
