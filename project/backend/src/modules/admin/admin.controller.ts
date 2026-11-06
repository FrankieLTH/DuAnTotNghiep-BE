import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  Sse,
} from '@nestjs/common';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission, StaffRole, StaffContext } from '../../common/config/permissions.config';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator';
import { AdminBookingService } from './admin-booking.service';
import { RealtimeSyncService } from './realtime-sync.service';
import { AutoRoomAssignmentService } from './auto-room-assignment.service';
import { RetentionJobsService } from './retention-jobs.service';
import { AdminCustomerService, CreateCustomerDto, UpdateCustomerDto } from './admin-customer.service';
import { AdminLockPinService } from './admin-lock-pin.service';
import { AdminCatalogStaffService } from './admin-catalog-staff.service';
import { AuditLogService } from './audit-log.service';
import { AdminBranchService, CreateBranchDto, UpdateBranchDto } from './admin-branch.service';
import { AdminRoomService, CreateRoomTypeDto, UpdateRoomTypeDto, CreateRoomDto, UpdateRoomDto } from './admin-room.service';
import { CustomerManagementService } from '../customer/customer-management.service';
import { ReviewCustomerRequestDto } from '../customer/customer.dto';

@Controller('admin')
@UseGuards(PermissionsGuard)
export class AdminController {
  constructor(
    private readonly customerManagement: CustomerManagementService,
    private readonly bookingService: AdminBookingService,
    private readonly autoAssignService: AutoRoomAssignmentService,
    private readonly retentionService: RetentionJobsService,
    private readonly customerService: AdminCustomerService,
    private readonly lockPinService: AdminLockPinService,
    private readonly catalogStaffService: AdminCatalogStaffService,
    private readonly auditLogService: AuditLogService,
    private readonly branchService: AdminBranchService,
    private readonly roomService: AdminRoomService,
    private readonly realtimeSyncService: RealtimeSyncService,
  ) {}

  // ============================================================
  // 1. QUẢN LÝ CHI NHÁNH (BRANCHES / APARTMENT)
  // ============================================================
  @Get('branches')
  @RequirePermissions(Permission.BRANCHES_VIEW)
  async getBranches(@CurrentStaff() staff: StaffContext) {
    return this.branchService.getBranches(staff);
  }

  @Get('branches/:id')
  @RequirePermissions(Permission.BRANCHES_VIEW)
  async getBranchById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.branchService.getBranchById(id, staff);
  }

  @Post('branches')
  @RequirePermissions(Permission.BRANCHES_MANAGE)
  async createBranch(
    @Body() dto: CreateBranchDto,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.branchService.createBranch(dto, staff.actor);
  }

  @Put('branches/:id')
  @RequirePermissions(Permission.BRANCHES_MANAGE)
  async updateBranch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBranchDto,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.branchService.updateBranch(id, dto, staff.actor);
  }

  @Post('branches/:id/hide')
  @RequirePermissions(Permission.BRANCHES_MANAGE)
  async hideBranch(
    @Param('id', ParseIntPipe) id: number,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.branchService.hideBranch(id, staff.actor);
  }

  @Post('branches/:id/activate')
  @RequirePermissions(Permission.BRANCHES_MANAGE)
  async activateBranch(
    @Param('id', ParseIntPipe) id: number,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.branchService.activateBranch(id, staff.actor);
  }

  // ============================================================
  // 2. QUẢN LÝ LOẠI PHÒNG (ROOM TYPES)
  // ============================================================
  @Get('room-types')
  @RequirePermissions(Permission.ROOM_TYPES_VIEW)
  async getRoomTypes(
    @Query('apartment_id') apartmentId?: number,
    @CurrentStaff() staff?: StaffContext,
  ) {
    return this.roomService.getRoomTypes(apartmentId ? Number(apartmentId) : undefined, staff);
  }

  @Get('room-types/:id')
  @RequirePermissions(Permission.ROOM_TYPES_VIEW)
  async getRoomTypeById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentStaff() staff?: StaffContext,
  ) {
    return this.roomService.getRoomTypeById(id, staff);
  }

  @Post('room-types')
  @RequirePermissions(Permission.ROOM_TYPES_MANAGE)
  async createRoomType(
    @Body() dto: CreateRoomTypeDto,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.roomService.createRoomType(dto, staff.actor);
  }

  @Put('room-types/:id')
  @RequirePermissions(Permission.ROOM_TYPES_MANAGE)
  async updateRoomType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoomTypeDto,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.roomService.updateRoomType(id, dto, staff.actor);
  }

  @Post('room-types/:id/hide')
  @RequirePermissions(Permission.ROOM_TYPES_MANAGE)
  async hideRoomType(
    @Param('id', ParseIntPipe) id: number,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.roomService.hideRoomType(id, staff.actor);
  }

  // ============================================================
  // 3. QUẢN LÝ PHÒNG CỤ THỂ (ROOMS & LOCK ASSIGNMENT)
  // ============================================================
  @Get('rooms/available-locks')
  @RequirePermissions(Permission.ROOMS_VIEW)
  async getAvailableLocks() {
    return this.roomService.getAvailableLocks();
  }

  @Get('rooms')
  @RequirePermissions(Permission.ROOMS_VIEW)
  async getRooms(
    @Query('apartment_id') apartmentId?: number,
    @Query('room_type_id') roomTypeId?: number,
    @Query('status') status?: 'available' | 'maintenance',
    @Query('is_hidden') isHidden?: string,
    @CurrentStaff() staff?: StaffContext,
  ) {
    return this.roomService.getRooms(
      {
        apartment_id: apartmentId ? Number(apartmentId) : undefined,
        room_type_id: roomTypeId ? Number(roomTypeId) : undefined,
        status,
        is_hidden: isHidden !== undefined ? isHidden === 'true' : undefined,
      },
      staff || { role: 'manager', apartmentId: 1, actor: 'staff' },
    );
  }

  @Get('rooms/:id')
  @RequirePermissions(Permission.ROOMS_VIEW)
  async getRoomById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.roomService.getRoomById(id, staff);
  }

  @Post('rooms')
  @RequirePermissions(Permission.ROOMS_MANAGE)
  async createRoom(
    @Body() dto: CreateRoomDto,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.roomService.createRoom(dto, staff.actor);
  }

  @Put('rooms/:id')
  @RequirePermissions(Permission.ROOMS_MANAGE)
  async updateRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoomDto,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.roomService.updateRoom(id, dto, staff.actor);
  }

  @Put('rooms/:id/status')
  @RequirePermissions(Permission.ROOMS_STATUS_UPDATE)
  async updateRoomStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: 'available' | 'maintenance',
    @Body('reason') _reason: string,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.roomService.updateRoomStatus(id, status, staff.actor, staff);
  }

  @Post('rooms/:id/hide')
  @RequirePermissions(Permission.ROOMS_MANAGE)
  async hideRoom(
    @Param('id', ParseIntPipe) id: number,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.roomService.hideRoom(id, staff.actor);
  }

  @Post('rooms/:id/unhide')
  @RequirePermissions(Permission.ROOMS_MANAGE)
  async unhideRoom(
    @Param('id', ParseIntPipe) id: number,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.roomService.unhideRoom(id, staff.actor);
  }

  @Post('rooms/:id/assign-lock')
  @RequirePermissions(Permission.ROOMS_MANAGE)
  async assignLock(
    @Param('id', ParseIntPipe) id: number,
    @Body('lock_id') lockId: number | null,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.roomService.assignLock(id, lockId !== undefined ? (lockId === null ? null : Number(lockId)) : null, staff.actor);
  }

  // ============================================================
  // 4. QUẢN LÝ ĐƠN ĐẶT PHÒNG (BOOKINGS MANAGEMENT)
  // ============================================================
  @Get('bookings')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  async getBookings(
    @Query('tab') tab?: 'pending_payment' | 'confirmed' | 'expired' | 'cancelled',
    @Query('sub_status') subStatus?: any,
    @Query('apartment_id') apartmentId?: number,
    @Query('booking_type') bookingType?: any,
    @Query('check_in_from') checkInFrom?: string,
    @Query('check_in_to') checkInTo?: string,
    @Query('room_type_id') roomTypeId?: number,
    @Query('source') source?: any,
    @Query('is_waiting_info') isWaitingInfo?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: 'ASC' | 'DESC',
    @CurrentStaff() staff?: StaffContext,
  ) {
    const staffInfo = {
      id: staff?.staffId || 1,
      role: (staff?.role || 'admin') as any,
      apartment_id: staff?.apartmentId ?? null,
      full_name: staff?.actor || 'Admin',
    };

    return this.bookingService.getBookings(
      {
        tab: tab || 'pending_payment',
        sub_status: subStatus,
        apartment_id: apartmentId ? Number(apartmentId) : undefined,
        booking_type: bookingType,
        check_in_from: checkInFrom,
        check_in_to: checkInTo,
        room_type_id: roomTypeId ? Number(roomTypeId) : undefined,
        source,
        is_waiting_info: isWaitingInfo === 'true',
        search,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 15,
        sort_by: sortBy,
        sort_order: sortOrder,
      },
      staffInfo
    );
  }

  @Get('bookings/realtime-alerts')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  async getBookingRealtimeAlerts(@CurrentStaff() staff: StaffContext) {
    const staffInfo = {
      id: staff?.staffId || 1,
      role: (staff?.role || 'admin') as any,
      apartment_id: staff?.apartmentId ?? null,
      full_name: staff?.actor || 'Staff',
    };
    return this.bookingService.getRealtimeAlerts(staffInfo);
  }

  @Post('bookings/calculate-quote')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  async calculateQuote(@Body() body: any) {
    return this.bookingService.calculateQuote({
      apartment_id: Number(body.apartment_id),
      room_type_id: Number(body.room_type_id),
      check_in: body.check_in,
      check_out: body.check_out,
      adults: Number(body.adults || 1),
      children: Number(body.children || 0),
      booking_type: body.booking_type,
    });
  }

  @Post('bookings/manual-hold')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  async manualHoldBooking(@Body() body: any, @CurrentStaff() staff: StaffContext) {
    const staffInfo = {
      id: staff?.staffId || 1,
      role: (staff?.role || 'admin') as any,
      apartment_id: staff?.apartmentId ?? null,
      full_name: staff?.actor || 'Staff',
    };
    return this.bookingService.holdManualBooking(body, staffInfo);
  }

  @Get('bookings/:id')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  async getBookingDetail(@Param('id', ParseIntPipe) id: number, @CurrentStaff() staff: StaffContext) {
    const staffInfo = {
      id: staff?.staffId || 1,
      role: (staff?.role || 'admin') as any,
      apartment_id: staff?.apartmentId ?? null,
      full_name: staff?.actor || 'Staff',
    };
    return this.bookingService.getBookingDetail(id, staffInfo);
  }

  @Get('bookings/:id/guests/:guestId/doc-image')
  @RequirePermissions(Permission.DOCS_VIEW_UNMASKED)
  async getGuestDocSignedUrl(
    @Param('id', ParseIntPipe) id: number,
    @Param('guestId', ParseIntPipe) guestId: number,
    @Query('side') side: 'front' | 'back' = 'front',
    @CurrentStaff() staff: StaffContext,
  ) {
    const staffInfo = {
      id: staff?.staffId || 1,
      role: (staff?.role || 'admin') as any,
      apartment_id: staff?.apartmentId ?? null,
      full_name: staff?.actor || 'Admin',
    };
    return this.bookingService.getSignedDocumentUrl(id, guestId, side, staffInfo);
  }

  @Post('bookings/:id/record-payment')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  async recordCounterPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentStaff() staff: StaffContext,
  ) {
    const staffInfo = {
      id: staff?.staffId || 1,
      role: (staff?.role || 'admin') as any,
      apartment_id: staff?.apartmentId ?? null,
      full_name: staff?.actor || 'Staff',
    };
    return this.bookingService.recordCounterPayment(
      id,
      {
        amount: Number(body.amount),
        payment_method: body.payment_method || 'counter_cash',
        note: body.note,
      },
      staffInfo
    );
  }

  @Post('bookings/:id/fill-guests')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  async fillGuestInfo(
    @Param('id', ParseIntPipe) id: number,
    @Body('guests') guests: any[],
    @CurrentStaff() staff: StaffContext,
  ) {
    const staffInfo = {
      id: staff?.staffId || 1,
      role: (staff?.role || 'admin') as any,
      apartment_id: staff?.apartmentId ?? null,
      full_name: staff?.actor || 'Staff',
    };
    return this.bookingService.fillGuestInfo(id, guests || [], staffInfo);
  }

  @Put('bookings/:id')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  async editBooking(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentStaff() staff: StaffContext,
  ) {
    const staffInfo = {
      id: staff?.staffId || 1,
      role: (staff?.role || 'admin') as any,
      apartment_id: staff?.apartmentId ?? null,
      full_name: staff?.actor || 'Staff',
    };
    return this.bookingService.editBooking(id, body, staffInfo);
  }

  @Post('bookings/:id/cancel')
  @RequirePermissions(Permission.BOOKINGS_CANCEL_UNPAID)
  async cancelBooking(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentStaff() staff: StaffContext,
  ) {
    const staffInfo = {
      id: staff?.staffId || 1,
      role: (staff?.role || 'admin') as any,
      apartment_id: staff?.apartmentId ?? null,
      full_name: staff?.actor || 'Staff',
    };
    return this.bookingService.cancelBooking(id, reason, staffInfo);
  }

  @Post('bookings/:id/cancel-unpaid')
  @RequirePermissions(Permission.BOOKINGS_CANCEL_UNPAID)
  async cancelUnpaidBooking(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentStaff() staff: StaffContext,
  ) {
    const staffInfo = {
      id: staff?.staffId || 1,
      role: (staff?.role || 'admin') as any,
      apartment_id: staff?.apartmentId ?? null,
      full_name: staff?.actor || 'Staff',
    };
    return this.bookingService.cancelBooking(id, reason || 'Hủy đơn giữ chỗ chưa thanh toán', staffInfo);
  }

  @Post('bookings/:id/extend-hold')
  @RequirePermissions(Permission.BOOKINGS_EXTEND_HOLD)
  async extendHoldTime(
    @Param('id', ParseIntPipe) id: number,
    @CurrentStaff() staff: StaffContext,
  ) {
    const staffInfo = {
      id: staff?.staffId || 1,
      role: (staff?.role || 'admin') as any,
      apartment_id: staff?.apartmentId ?? null,
      full_name: staff?.actor || 'Staff',
    };
    return this.bookingService.extendHold(id, staffInfo);
  }

  @Post('bookings/:id/check-in')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  async checkIn(@Param('id', ParseIntPipe) id: number, @CurrentStaff() staff: StaffContext) {
    const staffInfo = {
      id: staff?.staffId || 1,
      role: (staff?.role || 'admin') as any,
      apartment_id: staff?.apartmentId ?? null,
      full_name: staff?.actor || 'Staff',
    };
    return this.bookingService.checkIn(id, staffInfo);
  }

  @Post('bookings/:id/check-out')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  async checkOut(@Param('id', ParseIntPipe) id: number, @CurrentStaff() staff: StaffContext) {
    const staffInfo = {
      id: staff?.staffId || 1,
      role: (staff?.role || 'admin') as any,
      apartment_id: staff?.apartmentId ?? null,
      full_name: staff?.actor || 'Staff',
    };
    return this.bookingService.checkOut(id, staffInfo);
  }

  @Post('bookings/expire-overdue-holds')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  async expireOverdueHolds() {
    return this.bookingService.expireOverdueHolds();
  }

  // ============================================================
  // REALTIME SYNCHRONIZATION: SSE STREAM & POLLING FALLBACK
  // ============================================================
  @Sse('events/stream')
  streamEvents(
    @Query('apartment_id') apartmentId?: number,
    @Query('customer_id') customerId?: number,
    @CurrentStaff() staff?: StaffContext,
  ) {
    const isStaff = !!staff;
    const staffApartmentId = staff?.role === 'manager' ? staff.apartmentId || undefined : (apartmentId ? Number(apartmentId) : undefined);
    return this.realtimeSyncService.getEventStream({
      apartment_id: staffApartmentId,
      customer_id: customerId ? Number(customerId) : undefined,
      isStaff,
    });
  }

  @Get('events/poll')
  pollEvents(
    @Query('since') since?: string,
    @Query('apartment_id') apartmentId?: number,
    @Query('customer_id') customerId?: number,
  ) {
    return this.realtimeSyncService.pollEvents(
      since,
      apartmentId ? Number(apartmentId) : undefined,
      customerId ? Number(customerId) : undefined
    );
  }

  // ============================================================
  // 5. GÁN PHÒNG TỰ ĐỘNG & BẢO TRÌ PHÒNG
  // ============================================================
  @Post('rooms/auto-assign-on-payment/:bookingId')
  async triggerAutoAssign(@Param('bookingId', ParseIntPipe) bookingId: number, @Req() req: any) {
    const actor: string = req.staffActor || 'system_payment';
    return this.autoAssignService.assignRoomsOnPaymentSuccess(bookingId, actor);
  }

  @Put('rooms/:id/maintenance')
  @RequirePermissions(Permission.ROOMS_STATUS_UPDATE)
  async setRoomMaintenance(@Param('id', ParseIntPipe) roomId: number, @Req() req: any) {
    const actor: string = req.staffActor || 'manager_user';
    return this.autoAssignService.handleRoomMaintenance(roomId, actor);
  }

  @Get('rooms/emergency-alerts')
  @RequirePermissions(Permission.ALERTS_VIEW)
  async getEmergencyAlerts() {
    return this.autoAssignService.getEmergencyAlerts();
  }

  @Post('rooms/emergency-alerts/:alertId/dismiss')
  @RequirePermissions(Permission.ALERTS_VIEW)
  async dismissEmergencyAlert(@Param('alertId') alertId: string) {
    return this.autoAssignService.dismissAlert(alertId);
  }

  // ============================================================
  // 6. DUYỆT GIẤY TỜ (VERIFICATION QUEUE - MENU RIÊNG)
  // ============================================================
  @Get('verification/queue')
  @RequirePermissions(Permission.VERIFICATION_REVIEW)
  async getVerificationQueue() {
    return this.bookingService.getVerificationQueue();
  }

  @Post('verification/review')
  @RequirePermissions(Permission.VERIFICATION_REVIEW)
  async reviewGuestDocument(
    @Body()
    body: {
      booking_id: number;
      guest_id: number;
      decision: 'passed' | 'rejected';
      notes?: string;
      corrected_data?: { name?: string; date_of_birth?: string; doc_number?: string };
    },
    @Req() req: any,
  ) {
    const reviewedBy: string = req.staffActor || 'staff_reviewer';
    return this.bookingService.reviewGuestDocument(
      body.booking_id,
      body.guest_id,
      body.decision,
      reviewedBy,
      body.notes,
      body.corrected_data,
    );
  }

  @Get('verification/guest/:guestId/unmasked')
  @RequirePermissions(Permission.DOCS_VIEW_UNMASKED)
  async getUnmaskedGuestDoc(@Param('guestId', ParseIntPipe) guestId: number, @Req() req: any) {
    const actor: string = req.staffActor || 'staff';
    return this.bookingService.getUnmaskedGuestDoc(guestId, actor);
  }

  @Get('verification/guest/:guestId/signed-doc-url')
  @RequirePermissions(Permission.VERIFICATION_REVIEW)
  async getSignedDocUrl(
    @Param('guestId', ParseIntPipe) guestId: number,
    @Query('type') type: 'front' | 'back' = 'front',
    @Query('url') rawUrl: string,
    @Req() req: any,
  ) {
    const actor: string = req.staffActor || 'staff';
    const signedUrl = this.retentionService.generateSignedDocUrl(guestId, type, actor, rawUrl);
    return { signed_url: signedUrl };
  }

  // ============================================================
  // 7. VÒNG ĐỜI DỮ LIỆU & STORAGE PRIVACY (RETENTION JOBS)
  // ============================================================
  @Get('retention/dashboard')
  @RequirePermissions(Permission.RETENTION_VIEW_JOBS)
  async getRetentionDashboard() {
    return this.retentionService.getRetentionDashboardStats();
  }

  @Post('retention/run-photo-cleanup')
  @RequirePermissions(Permission.RETENTION_VIEW_JOBS)
  async runPhotoCleanupJob(@Req() req: any) {
    const actor: string = req.staffActor || 'manual_trigger';
    return this.retentionService.runPhotoCleanupJob(actor);
  }

  @Post('retention/run-anonymization')
  @RequirePermissions(Permission.RETENTION_VIEW_JOBS)
  async runAnonymizationJob(@Req() req: any) {
    const actor: string = req.staffActor || 'manual_trigger';
    return this.retentionService.runAnonymizationJob(actor);
  }

  @Get('retention/config')
  @RequirePermissions(Permission.RETENTION_VIEW_JOBS)
  async getRetentionConfig() {
    return this.retentionService.getConfig();
  }

  @Put('retention/config')
  @RequirePermissions(Permission.RETENTION_CONFIGURE)
  async updateRetentionConfig(@Body() body: any, @Req() req: any) {
    const actor: string = req.staffActor || 'admin_user';
    return this.retentionService.updateConfig(body, actor);
  }

  // ============================================================
  // 8. QUẢN LÝ KHÁCH HÀNG (CUSTOMER MANAGEMENT)
  // ============================================================
  @Get('customers')
  @RequirePermissions(Permission.CUSTOMERS_VIEW)
  async getCustomers(
    @Query('search') search?: string,
    @Query('status') status?: 'all' | 'active' | 'hidden' | 'blocked',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.customerService.getCustomers({
      search,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('customers/:id')
  @RequirePermissions(Permission.CUSTOMERS_VIEW)
  async getCustomerById(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.getCustomerById(id);
  }

  @Post('customers')
  @RequirePermissions(Permission.CUSTOMERS_MANAGE)
  async createCustomer(
    @Body() dto: CreateCustomerDto,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.customerService.createCustomer(dto, staff.actor);
  }

  @Put('customers/:id')
  @RequirePermissions(Permission.CUSTOMERS_MANAGE)
  async updateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.customerService.updateCustomer(id, dto, staff.actor);
  }

  @Post('customers/:id/toggle-hide')
  @RequirePermissions(Permission.CUSTOMERS_MANAGE)
  async toggleHideCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body('is_hidden') isHidden: boolean,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.customerService.toggleHideCustomer(id, Boolean(isHidden), staff.actor);
  }

  @Get('customers/:id/history')
  @RequirePermissions(Permission.CUSTOMERS_VIEW)
  async getCustomerHistory(
    @Param('id', ParseIntPipe) id: number,
    @CurrentStaff() staff: StaffContext,
  ) {
    return this.customerService.getCustomerBookingHistory(id, staff);
  }

  @Put('customers/:id/block')
  @RequirePermissions(Permission.CUSTOMERS_MANAGE)
  async toggleBlockCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body('block') block: boolean,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    const actor: string = req.staffActor || 'staff';
    return this.customerService.toggleBlockCustomer(id, block, reason, actor);
  }

  @Post('customers/merge')
  @RequirePermissions(Permission.CUSTOMERS_MANAGE)
  async mergeDuplicateAccounts(
    @Body('master_id') masterId: number,
    @Body('duplicate_id') duplicateId: number,
    @Req() req: any,
  ) {
    const actor: string = req.staffActor || 'staff';
    return this.customerService.mergeDuplicateAccounts(Number(masterId), Number(duplicateId), actor);
  }

  @Post('customers/:id/resend-invite')
  @RequirePermissions(Permission.CUSTOMERS_MANAGE)
  async resendActivationInvite(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const actor: string = req.staffActor || 'staff';
    return this.customerService.resendActivationInvite(id, actor);
  }

  // ============================================================
  // 9. MÃ KHÓA THÔNG MINH (LOCK PINS MANAGEMENT)
  // ============================================================
  @Get('locks/pins')
  @RequirePermissions(Permission.LOCKS_VIEW)
  async getLockPins(@Query('status') status?: string, @Query('search') search?: string) {
    return this.lockPinService.getLockPins({ status, search });
  }

  @Post('locks/pins/issue')
  @RequirePermissions(Permission.LOCKS_MANAGE)
  async issueOrRegeneratePin(
    @Body('booking_id') bookingId: number,
    @Body('lock_id') lockId: number,
    @Req() req: any,
  ) {
    const actor: string = req.staffActor || 'staff';
    return this.lockPinService.issueOrRegeneratePin(Number(bookingId), Number(lockId), actor);
  }

  @Post('locks/pins/revoke')
  @RequirePermissions(Permission.LOCKS_MANAGE)
  async revokePin(
    @Body('booking_id') bookingId: number,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    const actor: string = req.staffActor || 'staff';
    return this.lockPinService.revokePin(Number(bookingId), reason || 'Thu hồi thủ công', actor);
  }

  @Post('locks/pins/resend-email')
  @RequirePermissions(Permission.LOCKS_MANAGE)
  async resendPinEmail(@Body('booking_id') bookingId: number, @Req() req: any) {
    const actor: string = req.staffActor || 'staff';
    return this.lockPinService.resendPinEmail(Number(bookingId), actor);
  }

  // ============================================================
  // 10. DANH MỤC & CẤU HÌNH HỆ THỐNG (CATALOG & STAFF & AUDIT)
  // ============================================================
  @Get('catalog/room-types')
  @RequirePermissions(Permission.CATALOG_VIEW)
  async getCatalogRoomTypes() {
    return this.catalogStaffService.getRoomTypes();
  }

  @Post('catalog/room-types')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async saveRoomType(@Body() body: any, @Req() req: any) {
    const actor: string = req.staffActor || 'admin_user';
    return this.catalogStaffService.saveRoomType(body, actor);
  }

  @Get('catalog/prices')
  @RequirePermissions(Permission.CATALOG_VIEW)
  async getPrices() {
    return this.catalogStaffService.getPrices();
  }

  @Post('catalog/prices')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async savePrice(@Body() body: any, @Req() req: any) {
    const actor: string = req.staffActor || 'admin_user';
    return this.catalogStaffService.savePrice(body, actor);
  }

  @Get('catalog/extra-fees')
  @RequirePermissions(Permission.CATALOG_VIEW)
  async getExtraFees() {
    return this.catalogStaffService.getExtraFees();
  }

  @Post('catalog/extra-fees')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async saveExtraFee(@Body() body: any, @Req() req: any) {
    const actor: string = req.staffActor || 'admin_user';
    return this.catalogStaffService.saveExtraFee(body, actor);
  }

  @Get('catalog/vouchers')
  @RequirePermissions(Permission.CATALOG_VIEW)
  async getVouchers() {
    return this.catalogStaffService.getVouchers();
  }

  @Post('catalog/vouchers')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async saveVoucher(@Body() body: any, @Req() req: any) {
    const actor: string = req.staffActor || 'admin_user';
    return this.catalogStaffService.saveVoucher(body, actor);
  }

  @Get('catalog/services')
  @RequirePermissions(Permission.CATALOG_VIEW)
  async getServices() {
    return this.catalogStaffService.getServices();
  }

  @Post('catalog/services')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async saveService(@Body() body: any, @Req() req: any) {
    const actor: string = req.staffActor || 'admin_user';
    return this.catalogStaffService.saveService(body, actor);
  }

  @Get('staff')
  @RequirePermissions(Permission.STAFF_MANAGE)
  async getStaffList() {
    return this.catalogStaffService.getStaffList();
  }

  @Put('staff/:id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  async updateStaff(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role_id?: number; is_blocked?: boolean },
    @Req() req: any,
  ) {
    const role: StaffRole = req.staffRole || 'admin';
    const actor: string = req.staffActor || 'admin_user';
    return this.catalogStaffService.updateStaffRoleOrBlock(id, body, role, actor);
  }

  @Get('customer-requests')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  getCustomerRequests(@CurrentStaff() staff: StaffContext) { return this.customerManagement.staffRequests(staff); }

  @Put('customer-requests/:id')
  @RequirePermissions(Permission.CUSTOMERS_MANAGE)
  reviewCustomerRequest(@CurrentStaff() staff: StaffContext, @Param('id', ParseIntPipe) id: number, @Body() body: ReviewCustomerRequestDto) {
    return this.customerManagement.reviewRequest(staff, id, body);
  }

  @Get('audit-logs')
  @RequirePermissions(Permission.AUDIT_VIEW)
  async getAuditLogs(
    @Query('actor') actor?: string,
    @Query('entity_type') entityType?: string,
    @Query('action') action?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.auditLogService.queryLogs({
      actor,
      entity_type: entityType,
      action,
      from_date: fromDate,
      to_date: toDate,
      limit,
      offset,
    });
  }
}
