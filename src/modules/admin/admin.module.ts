import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Booking, Payment, Refund, Lock, LockPin } from '../../entities/booking.entity';
import { Room, Apartment } from '../../entities/room.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Payment, Refund, Room, Apartment, User, Lock, LockPin]),
  ],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule { }