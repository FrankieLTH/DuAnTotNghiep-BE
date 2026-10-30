import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronService } from './cron.service';
import { Booking, LockPin } from '../../entities/booking.entity';
import { Room } from '../../entities/room.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, LockPin, Room])],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
