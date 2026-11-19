import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronService } from './cron.service';
import { Booking, LockPin } from '../../entities/booking.entity';
import { Room } from '../../entities/room.entity';
import { AdminModule } from '../admin/admin.module';
import { PaymentsModule } from '../payments/payments.module';
import { ScheduledJobsController } from './scheduled-jobs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, LockPin, Room]),
    AdminModule,
    PaymentsModule,
  ],
  providers: [CronService],
  controllers: [ScheduledJobsController],
  exports: [CronService],
})
export class CronModule {}
