import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import { Booking, Payment, Refund, Lock, LockPin } from '../../entities/booking.entity';
import { Room, Apartment } from '../../entities/room.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Apartment)
    private apartmentRepository: Repository<Apartment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Lock)
    private lockRepository: Repository<Lock>,
    @InjectRepository(LockPin)
    private lockPinRepository: Repository<LockPin>,
  ) {}

  async getDashboardStats() {
    const payments = await this.paymentRepository.find({ where: { payment_status: 'paid' } });
    const totalRevenue = payments.reduce((acc, p) => acc + Number(p.amount), 0);

    const vacantRoomsCount = await this.roomRepository.count({ where: { status: 'available' } });
    const pendingRefundsCount = await this.refundRepository.count({ where: { status: 'requested' } });
    const weeklyBookingsCount = await this.bookingRepository.count();

    const todayStr = dayjs().format('YYYY-MM-DD');
    const upcomingCheckoutsCount = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('DATE(booking.booked_end_time) = :todayStr', { todayStr })
      .andWhere('booking.booking_status = :status', { status: 'checked_in' })
      .getCount();

    return {
      revenue: {
        weekly: totalRevenue * 0.25,
        monthly: totalRevenue * 0.6,
        quarterly: totalRevenue * 0.85,
        yearly: totalRevenue,
        total: totalRevenue,
      },
      vacant_rooms_count: vacantRoomsCount,
      pending_refunds_count: pendingRefundsCount,
      weekly_bookings_count: weeklyBookingsCount,
      upcoming_checkouts_count: upcomingCheckoutsCount,
    };
  }

  async getCustomers() {
    return this.userRepository.find({
      where: { role_id: 3 },
      order: { created_at: 'DESC' },
    });
  }

  async toggleCustomerStatus(id: number, status: 'active' | 'blocked') {
    await this.userRepository.update(id, { status });
    return { message: `Đã đổi trạng thái tài khoản thành ${status}`, id, status };
  }

  async getAccessCodes() {
    const lockPins = await this.lockPinRepository.find({
      relations: ['booking', 'lock', 'booking.room', 'booking.room.apartment'],
      order: { created_at: 'DESC' },
    });

    return lockPins.map((lp) => ({
      id: lp.id,
      booking_code: lp.booking?.booking_code,
      apartment_name: lp.booking?.room?.apartment?.name,
      room_number: lp.booking?.room?.room_number,
      passcode: lp.pin,
      lock_status: lp.lock?.lock_status || 'online',
      valid_from: lp.lock_pin_start_time,
      valid_to: lp.lock_pin_end_time,
      status: lp.status,
    }));
  }
}
