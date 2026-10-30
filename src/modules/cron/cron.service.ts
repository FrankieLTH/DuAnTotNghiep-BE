import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Booking, LockPin } from '../../entities/booking.entity';
import { Room } from '../../entities/room.entity';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(LockPin)
    private lockPinRepository: Repository<LockPin>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleAutoCheckOutCron() {
    this.logger.log('Running Auto Check-out & Lock PIN Revocation Cron Job...');

    const now = new Date();
    const expiredBookings = await this.bookingRepository.find({
      where: [
        { booked_end_time: LessThan(now), booking_status: 'checked_in' },
        { booked_end_time: LessThan(now), booking_status: 'confirmed' },
      ],
    });

    for (const b of expiredBookings) {
      b.booking_status = 'checked_out';
      b.check_out_actual = now;
      await this.bookingRepository.save(b);

      // Thu hồi mã PIN
      await this.lockPinRepository.update(
        { booking_id: b.id, status: 'active' },
        { status: 'expired' },
      );

      // Đổi trạng thái phòng sang cần dọn dẹp
      await this.roomRepository.update(b.room_id, { status: 'maintenance' });

      this.logger.log(`Auto Check-out booking ${b.booking_code} for room ${b.room_id}. PIN revoked, room set to maintenance.`);
    }
  }
}
