import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingWorkflowService } from './booking-workflow.service';
import { BookingWorkflowController } from './booking-workflow.controller';
import { Booking, Voucher, Refund, LockPin } from '../../entities/booking.entity';
import { Room } from '../../entities/room.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Voucher, Refund, LockPin, Room]),
  ],
  providers: [BookingsService, BookingWorkflowService],
  controllers: [BookingsController, BookingWorkflowController],
  exports: [BookingsService, BookingWorkflowService],
})
export class BookingsModule {}
