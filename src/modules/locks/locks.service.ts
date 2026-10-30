import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Lock, LockPin, Booking } from '../../entities/booking.entity';
import { Room } from '../../entities/room.entity';
import { LocksGateway } from './locks.gateway';

@Injectable()
export class LocksService {
  constructor(
    @InjectRepository(Lock)
    private lockRepository: Repository<Lock>,
    @InjectRepository(LockPin)
    private lockPinRepository: Repository<LockPin>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    private locksGateway: LocksGateway,
  ) {}

  @OnEvent('payment.success')
  async handlePaymentSuccessEvent(payload: { bookingId: number; roomId: number; startTime: Date; endTime: Date }) {
    await this.generatePasscodeForBooking(payload.bookingId);
  }

  async generatePasscodeForBooking(bookingId: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['room'],
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt phòng');
    }

    const lock = await this.lockRepository.findOne({
      where: { room_id: booking.room_id },
    });

    if (!lock) {
      throw new NotFoundException(`Không tìm thấy ổ khóa TTLock gắn cho phòng ID ${booking.room_id}`);
    }

    // Tạo mã PIN ngẫu nhiên 6 chữ số (hoặc kết nối TTLock Cloud Open API)
    const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
    const cloudPwId = 'PW_TTL_' + Math.floor(1000 + Math.random() * 9000);

    const lockPin = this.lockPinRepository.create({
      booking_id: booking.id,
      lock_id: lock.id,
      cloud_pw_id: cloudPwId,
      pin: generatedPin,
      lock_pin_start_time: booking.booked_start_time,
      lock_pin_end_time: booking.booked_end_time,
      status: 'active',
    });

    await this.lockPinRepository.save(lockPin);

    return {
      message: 'Tạo mã PIN mở cửa TTLock thành công',
      booking_id: booking.id,
      lock_id: lock.id,
      passcode: generatedPin,
      start_time: booking.booked_start_time,
      end_time: booking.booked_end_time,
    };
  }

  async getPasscodeForCustomer(bookingId: number) {
    const lockPin = await this.lockPinRepository.findOne({
      where: { booking_id: bookingId, status: 'active' },
      relations: ['booking', 'lock', 'booking.room', 'booking.room.apartment'],
    });

    if (!lockPin) {
      throw new NotFoundException('Chưa có mã PIN mở cửa hoặc đơn đặt phòng đã hết hạn');
    }

    return {
      booking_code: lockPin.booking?.booking_code,
      room_number: lockPin.booking?.room?.room_number,
      apartment_name: lockPin.booking?.room?.apartment?.name,
      address: lockPin.booking?.room?.apartment?.address,
      passcode: lockPin.pin,
      valid_from: lockPin.lock_pin_start_time,
      valid_to: lockPin.lock_pin_end_time,
      instructions: 'Bấm mã PIN trên bàn phím khóa vật lý, sau đó bấm phím # để mở cửa.',
    };
  }

  async selfCheckIn(data: { booking_id: number; guests_list: any[] }) {
    const booking = await this.bookingRepository.findOne({ where: { id: data.booking_id } });
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt phòng');
    }

    booking.guests_list = JSON.stringify(data.guests_list);
    booking.check_in_actual = new Date();
    booking.booking_status = 'checked_in';
    await this.bookingRepository.save(booking);

    // Cập nhật trạng thái phòng sang occupied
    await this.roomRepository.update(booking.room_id, { status: 'occupied' });

    return {
      message: 'Khai báo check-in thành công. Bạn có thể sử dụng mã PIN để mở cửa phòng.',
      booking_id: booking.id,
      check_in_actual: booking.check_in_actual,
    };
  }

  async earlyCheckOut(bookingId: number) {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt phòng');
    }

    booking.check_out_actual = new Date();
    booking.booking_status = 'checked_out';
    await this.bookingRepository.save(booking);

    // Vô hiệu mã PIN ngay lập tức
    await this.lockPinRepository.update({ booking_id: bookingId }, { status: 'revoked' });

    // Đổi trạng thái phòng sang maintenance (cần dọn dẹp)
    await this.roomRepository.update(booking.room_id, { status: 'maintenance' });

    return {
      message: 'Check-out thành công. Mã PIN đã được vô hiệu hóa.',
      booking_id: booking.id,
      room_status: 'maintenance',
    };
  }

  async remoteUnlock(lockId: number) {
    const lock = await this.lockRepository.findOne({ where: { id: lockId }, relations: ['room'] });
    if (!lock) {
      throw new NotFoundException('Không tìm thấy ổ khóa Smart Lock');
    }

    // Giả lập gửi lệnh mở từ xa qua TTLock Wi-Fi Gateway
    return {
      message: `Đã phát lệnh mở cửa từ xa cho ${lock.lock_name || 'Khóa phòng ' + lock.room?.room_number}`,
      lock_id: lock.id,
      cloud_lock_id: lock.cloud_lock_id,
      status: 'unlocked_remotely',
      timestamp: new Date(),
    };
  }

  async handleTTLockWebhook(body: any) {
    const { eventType, lockId, message } = body;

    if (eventType === 'tamperAlarm') {
      this.locksGateway.sendLockAlert({
        roomId: lockId || 1,
        alertType: 'TAMPER_ALARM',
        message: message || 'CẢNH BÁO: Phát hiện dấu hiệu cạy khóa khẩn cấp!',
      });
    } else if (eventType === 'lowBatteryAlarm') {
      this.locksGateway.sendLockAlert({
        roomId: lockId || 1,
        alertType: 'BATTERY_LOW',
        message: message || 'Cảnh báo: Pin khóa cửa giảm dưới 20%, cần thay Pin gấp.',
      });
    }

    return { success: true, message: 'Đã nhận webhook xử lý từ TTLock SaaS' };
  }
}
