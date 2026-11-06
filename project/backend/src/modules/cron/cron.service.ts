import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Booking, LockPin } from '../../entities/booking.entity';
import { Room } from '../../entities/room.entity';
import { AdminBookingService } from '../admin/admin-booking.service';
import { RetentionJobsService } from '../admin/retention-jobs.service';

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
    private readonly adminBookingService: AdminBookingService,
    private readonly retentionService: RetentionJobsService,
  ) {}

  /**
   * 1. Quét tự động check-out và đổi trạng thái phòng sang bảo trì/dọn dẹp
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleAutoCheckOutCron() {
    this.logger.log('Running Auto Check-out & Lock PIN Revocation Cron Job...');

    const now = new Date();
    const expiredBookings = await this.bookingRepository.find({
      where: [
        { booked_end_time: LessThan(now), booking_status: 'checked_in' as any },
        { booked_end_time: LessThan(now), booking_status: 'confirmed' as any },
      ],
    });

    for (const b of expiredBookings) {
      b.booking_status = 'checked_out' as any;
      b.check_out_actual = now;
      await this.bookingRepository.save(b);

      // Thu hồi mã PIN
      await this.lockPinRepository.update(
        { booking_id: b.id, status: 'sent' },
        { status: 'expired' },
      );

      // Đổi trạng thái phòng sang cần dọn dẹp
      if (b.room_id) {
        await this.roomRepository.update(b.room_id, { status: 'maintenance' });
      }

      this.logger.log(`Auto Check-out booking ${b.booking_code}. PIN expired, room set to maintenance.`);
    }
  }

  /**
   * 2. Quét đơn giữ chỗ quá hạn 30 phút (hold_expires_at < now)
   * Chuyển trạng thái sang expired và nhả phòng giữ chỗ
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpireOverdueHolds() {
    try {
      await this.adminBookingService.expireOverdueHolds();
    } catch (err: any) {
      this.logger.error(`Error in handleExpireOverdueHolds: ${err.message}`);
    }
  }

  /**
   * 3. Xóa ảnh CCCD sau khi khách check-out (chạy mỗi giờ)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handlePhotoCleanupJob() {
    try {
      this.logger.log('Running photo cleanup job for checked-out bookings...');
      await this.retentionService.runPhotoCleanupJob('system_cron_hourly');
    } catch (err: any) {
      this.logger.error(`Error in handlePhotoCleanupJob: ${err.message}`);
    }
  }

  /**
   * 4. Ẩn danh hóa hồ sơ lưu trú sau 36 tháng kể từ check-out (chạy lúc 2:00 sáng mỗi ngày)
   */
  @Cron('0 2 * * *')
  async handleAnonymizationJob() {
    try {
      this.logger.log('Running 36-month PII anonymization job...');
      await this.retentionService.runAnonymizationJob('system_cron_nightly');
    } catch (err: any) {
      this.logger.error(`Error in handleAnonymizationJob: ${err.message}`);
    }
  }
}
