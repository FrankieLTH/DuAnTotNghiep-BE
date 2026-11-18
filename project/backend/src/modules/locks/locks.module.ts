import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocksService } from './locks.service';
import { LocksController } from './locks.controller';
import { LocksGateway } from './locks.gateway';
import { Lock, LockPin, Booking } from '../../entities/booking.entity';
import { Room } from '../../entities/room.entity';
import { CustomerModule } from '../customer/customer.module';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Lock, LockPin, Booking, Room]), CustomerModule],
  providers: [LocksService, LocksGateway, PermissionsGuard],
  controllers: [LocksController],
  exports: [LocksService, LocksGateway],
})
export class LocksModule {}
