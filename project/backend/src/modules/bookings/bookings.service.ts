import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import { Booking, Voucher, LockPin } from '../../entities/booking.entity';
import { Room } from '../../entities/room.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Voucher)
    private voucherRepository: Repository<Voucher>,
    @InjectRepository(LockPin)
    private lockPinRepository: Repository<LockPin>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  async applyVoucher(code: string, orderValue: number) {
    const voucher = await this.voucherRepository.findOne({ where: { code, is_active: true } });
    if (!voucher) {
      throw new NotFoundException('Mã giảm giá không tồn tại hoặc đã hết hạn');
    }

    if (voucher.min_order_value && orderValue < Number(voucher.min_order_value)) {
      throw new BadRequestException(`Đơn hàng phải từ ${Number(voucher.min_order_value).toLocaleString()}đ trở lên mới được dùng mã này`);
    }

    let discount = 0;
    if (voucher.discount_type === 'percentage') {
      discount = (orderValue * Number(voucher.discount_value)) / 100;
      if (voucher.max_discount_amount && discount > Number(voucher.max_discount_amount)) {
        discount = Number(voucher.max_discount_amount);
      }
    } else {
      discount = Number(voucher.discount_value);
    }

    return {
      voucher_id: voucher.id,
      code: voucher.code,
      title: voucher.title,
      discount_amount: discount,
      final_price: Math.max(0, orderValue - discount),
    };
  }

  async createBooking(data: {
    user_id?: number;
    room_id: number;
    voucher_code?: string;
    booking_type?: string;
    booked_start_time: string;
    booked_end_time: string;
    guests_list?: any[];
  }) {
    const room = await this.roomRepository.findOne({ where: { id: data.room_id }, relations: ['room_type'] });
    if (!room) {
      throw new NotFoundException('Không tìm thấy thông tin phòng');
    }

    const start = dayjs(data.booked_start_time);
    const end = dayjs(data.booked_end_time);
    const durationDays = Math.max(1, end.diff(start, 'day'));

    const basePrice = room.room_type ? Number(room.room_type.base_price) : 500000;
    const rawTotal = basePrice * durationDays;

    let discountAmount = 0;
    let voucherId: number | undefined = undefined;

    if (data.voucher_code) {
      try {
        const vResult = await this.applyVoucher(data.voucher_code, rawTotal);
        discountAmount = vResult.discount_amount;
        voucherId = vResult.voucher_id;
      } catch (err) {
        // Bỏ qua nếu mã lỗi
      }
    }

    const totalPrice = Math.max(0, rawTotal - discountAmount);
    const bookingCode = 'BK' + dayjs().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 100);

    const booking = this.bookingRepository.create({
      booking_code: bookingCode,
      apartment_id: room.apartment_id,
      user_id: data.user_id,
      room_id: data.room_id,
      voucher_id: voucherId,
      guests_list: data.guests_list ? JSON.stringify(data.guests_list) : null,
      booking_type: (data.booking_type as any) || 'overnight',
      booked_start_time: start.toDate(),
      booked_end_time: end.toDate(),
      booking_status: 'pending_payment' as any,
      total_price: totalPrice,
      discount_amount: discountAmount,
    });

    await this.bookingRepository.save(booking);

    return {
      message: 'Tạo đơn đặt phòng thành công',
      booking_id: booking.id,
      booking_code: booking.booking_code,
      total_price: booking.total_price,
      discount_amount: booking.discount_amount,
      booking_status: booking.booking_status,
    };
  }

  async getUserBookings(userId: number) {
    const bookings = await this.bookingRepository.find({
      where: { user_id: userId },
      relations: ['room', 'room.apartment'],
      order: { created_at: 'DESC' },
    });

    const result = [];
    for (const b of bookings) {
      const lockPin = await this.lockPinRepository.findOne({
        where: { booking_id: b.id, status: 'active' },
      });

      result.push({
        id: b.id,
        booking_code: b.booking_code,
        room_number: b.room?.room_number,
        apartment_name: b.room?.apartment?.name,
        booked_start_time: b.booked_start_time,
        booked_end_time: b.booked_end_time,
        booking_status: b.booking_status,
        total_price: Number(b.total_price),
        discount_amount: Number(b.discount_amount),
        passcode: lockPin ? lockPin.pin : null,
        created_at: b.created_at,
      });
    }

    return result;
  }

  async getBookingById(id: number, userId?: number) {
    const b = await this.bookingRepository.findOne({
      where: { id },
      relations: ['room', 'room.apartment', 'voucher'],
    });

    if (!b || !userId || b.user_id !== userId) {
      throw new NotFoundException('Không tìm thấy thông tin đơn đặt phòng');
    }

    const lockPin = await this.lockPinRepository.findOne({
      where: { booking_id: b.id, status: 'active' },
    });

    return {
      id: b.id,
      booking_code: b.booking_code,
      room_id: b.room_id,
      room_number: b.room?.room_number,
      apartment_name: b.room?.apartment?.name,
      address: b.room?.apartment?.address,
      guests_list: b.guests_list ? JSON.parse(b.guests_list) : [],
      booked_start_time: b.booked_start_time,
      booked_end_time: b.booked_end_time,
      booking_status: b.booking_status,
      total_price: Number(b.total_price),
      discount_amount: Number(b.discount_amount),
      passcode: lockPin ? lockPin.pin : null,
      created_at: b.created_at,
    };
  }

  async cancelBooking(id: number, reason?: string, userId?: number) {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking || !userId || booking.user_id !== userId) {
      throw new NotFoundException('Booking not found');
    }

    // Prevent the legacy endpoint from bypassing admin review and wallet refund handling.
    void reason;
    throw new BadRequestException('Submit cancellation/refund requests from the booking lookup page. An administrator must review the request; approval credits 50% of the paid amount to the customer wallet.');
  }

  async getVouchers() {
    return this.voucherRepository.find({ where: { is_active: true } });
  }
}
