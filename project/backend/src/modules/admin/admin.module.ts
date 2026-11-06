import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Booking, Payment, Refund, Lock, LockPin } from '../../entities/booking.entity';
import { Room, Apartment, RoomType, RoomImage, Service } from '../../entities/room.entity';
import { User, Customer, Staff } from '../../entities/user.entity';
import { AuditLogService } from './audit-log.service';
import { AutoRoomAssignmentService } from './auto-room-assignment.service';
import { RetentionJobsService } from './retention-jobs.service';
import { AdminBookingService } from './admin-booking.service';
import { AdminCustomerService } from './admin-customer.service';
import { AdminLockPinService } from './admin-lock-pin.service';
import { AdminCatalogStaffService } from './admin-catalog-staff.service';
import { AdminBranchService } from './admin-branch.service';
import { AdminRoomService } from './admin-room.service';
import { RealtimeSyncService } from './realtime-sync.service';
import { BookingStateMachineService } from './booking-state-machine.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CustomerManagementService } from '../customer/customer-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Payment,
      Refund,
      Room,
      Apartment,
      RoomType,
      RoomImage,
      Service,
      User,
      Customer,
      Staff,
      Lock,
      LockPin,
    ]),
  ],
  providers: [
    CustomerManagementService,
    AdminService,
    AuditLogService,
    AutoRoomAssignmentService,
    RetentionJobsService,
    AdminBookingService,
    AdminCustomerService,
    AdminLockPinService,
    AdminCatalogStaffService,
    AdminBranchService,
    AdminRoomService,
    RealtimeSyncService,
    BookingStateMachineService,
    PermissionsGuard,
  ],
  controllers: [AdminController],
  exports: [
    AdminService,
    AuditLogService,
    AutoRoomAssignmentService,
    RetentionJobsService,
    AdminBookingService,
    AdminCustomerService,
    AdminLockPinService,
    AdminCatalogStaffService,
    AdminBranchService,
    AdminRoomService,
    RealtimeSyncService,
    BookingStateMachineService,
  ],
})
export class AdminModule {}
