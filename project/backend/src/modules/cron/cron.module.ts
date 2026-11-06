import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronService } from './cron.service';
import { Booking, LockPin } from '../../entities/booking.entity';
import { Room } from '../../entities/room.entity';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, LockPin, Room]),
    AdminModule,
  ],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
