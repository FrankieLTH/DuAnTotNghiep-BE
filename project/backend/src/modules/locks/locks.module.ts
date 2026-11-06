import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocksService } from './locks.service';
import { LocksController } from './locks.controller';
import { LocksGateway } from './locks.gateway';
import { Lock, LockPin, Booking } from '../../entities/booking.entity';
import { Room } from '../../entities/room.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lock, LockPin, Booking, Room])],
  providers: [LocksService, LocksGateway],
  controllers: [LocksController],
  exports: [LocksService, LocksGateway],
})
export class LocksModule {}
