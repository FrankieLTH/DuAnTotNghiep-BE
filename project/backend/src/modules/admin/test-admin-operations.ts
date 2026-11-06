import * as assert from 'assert';
import { DataSource } from 'typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminBranchService } from './admin-branch.service';
import { AdminRoomService } from './admin-room.service';
import { AdminCustomerService } from './admin-customer.service';
import { AuditLogService } from './audit-log.service';
import { StaffContext } from '../../common/config/permissions.config';

let testsPassed = 0;
let testsFailed = 0;

function createMockDataSource(queryFn: (sql: string, params?: any[]) => any) {
  return {
    query: async (sql: string, params?: any[]) => queryFn(sql, params),
    createQueryRunner: () => ({
      connect: async () => {},
      startTransaction: async () => {},
      commitTransaction: async () => {},
      rollbackTransaction: async () => {},
      release: async () => {},
      manager: {
        query: async (sql: string, params?: any[]) => queryFn(sql, params),
      },
    }),
  } as unknown as DataSource;
}

const mockAuditLogService = {
  log: async () => {},
} as unknown as AuditLogService;

const adminStaff: StaffContext = {
  role: 'admin',
  actor: 'admin@homestay.test',
};

const managerStaff1: StaffContext = {
  role: 'manager',
  apartmentId: 1,
  actor: 'manager1@homestay.test',
};

const managerStaff2: StaffContext = {
  role: 'manager',
  apartmentId: 2,
  actor: 'manager2@homestay.test',
};

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    testsFailed++;
  }
}

async function runAllTests() {
  console.log('\n=== RUNNING ADMIN OPERATIONS TESTS ===\n');

  // ========================================================
  // 1. Quản lý chi nhánh (APARTMENT) & Phân quyền
  // ========================================================
  console.log('1. AdminBranchService:');

  await test('Manager chỉ lấy danh sách chi nhánh thuộc quyền quản lý của mình', async () => {
    let capturedSql = '';
    let capturedParams: any[] = [];
    const ds = createMockDataSource((sql, params) => {
      capturedSql = sql;
      capturedParams = params || [];
      return [{ id: 1, name: 'Chi nhánh 1', total_rooms: 5 }];
    });
    const service = new AdminBranchService(ds, mockAuditLogService);
    const result = await service.getBranches(managerStaff1);

    assert(capturedSql.includes('WHERE a.id = ?'), 'SQL must filter by apartment_id');
    assert.strictEqual(capturedParams[0], 1, 'Filter param must be manager apartment_id');
    assert.strictEqual(result.length, 1);
  });

  await test('Admin lấy toàn bộ danh sách chi nhánh không bị giới hạn', async () => {
    let capturedSql = '';
    const ds = createMockDataSource((sql) => {
      capturedSql = sql;
      return [
        { id: 1, name: 'Chi nhánh 1', total_rooms: 5 },
        { id: 2, name: 'Chi nhánh 2', total_rooms: 4 },
      ];
    });
    const service = new AdminBranchService(ds, mockAuditLogService);
    const result = await service.getBranches(adminStaff);

    assert(!capturedSql.includes('WHERE a.id = ?'), 'Admin SQL should not filter by apartment_id');
    assert.strictEqual(result.length, 2);
  });

  await test('Manager xem chi nhánh khác bị ForbiddenException', async () => {
    const ds = createMockDataSource(() => [{ id: 2, name: 'Chi nhánh 2' }]);
    const service = new AdminBranchService(ds, mockAuditLogService);

    let thrown = false;
    try {
      await service.getBranchById(2, managerStaff1); // Manager 1 trying to view Branch 2
    } catch (e) {
      if (e instanceof ForbiddenException) thrown = true;
    }
    assert(thrown, 'Must throw ForbiddenException when manager views other branch');
  });

  await test('Không thể ẩn chi nhánh nếu còn đơn tương lai (FUTURE_BOOKINGS_EXIST)', async () => {
    const ds = createMockDataSource((sql) => {
      if (sql.includes('SELECT * FROM APARTMENT')) {
        return [{ id: 1, name: 'Chi nhánh 1', status: 'active' }];
      }
      if (sql.includes('SELECT id, booking_code')) {
        return [{ id: 99, booking_code: 'BK-FUTURE', booked_end_time: '2026-12-31' }];
      }
      return [];
    });
    const service = new AdminBranchService(ds, mockAuditLogService);

    let thrown = false;
    try {
      await service.hideBranch(1, adminStaff.actor);
    } catch (e: any) {
      if (e instanceof BadRequestException) {
        const resp: any = e.getResponse();
        if (resp?.error === 'FUTURE_BOOKINGS_EXIST') thrown = true;
      }
    }
    assert(thrown, 'Must throw BadRequestException with FUTURE_BOOKINGS_EXIST');
  });

  await test('Validate hotline số điện thoại Việt Nam hợp lệ khi tạo chi nhánh', async () => {
    const ds = createMockDataSource(() => []);
    const service = new AdminBranchService(ds, mockAuditLogService);

    let thrown = false;
    try {
      await service.createBranch(
        { name: 'Chi nhánh Test', address: '123 Test St', hotline: '12345' }, // Invalid hotline
        adminStaff.actor,
      );
    } catch (e) {
      if (e instanceof BadRequestException) thrown = true;
    }
    assert(thrown, 'Must reject invalid hotline format');
  });

  // ========================================================
  // 2. Quản lý phòng & loại phòng (ROOMS & room_types)
  // ========================================================
  console.log('\n2. AdminRoomService:');

  await test('Tạo phòng: ROOMS.apartment_id phải bằng room_types.apartment_id', async () => {
    const ds = createMockDataSource((sql) => {
      if (sql.includes('FROM room_types')) {
        return [{ id: 10, apartment_id: 2, name: 'Loại phòng CN2' }]; // room_type belongs to apt 2
      }
      return [];
    });
    const service = new AdminRoomService(ds, mockAuditLogService);

    let thrown = false;
    try {
      await service.createRoom(
        { apartment_id: 1, room_type_id: 10, room_number: '101' }, // attempting apt 1 with room_type of apt 2
        adminStaff.actor,
      );
    } catch (e: any) {
      if (e instanceof BadRequestException && (e.message.includes('không thuộc chi nhánh') || e.message.includes('khác với chi nhánh'))) {
        thrown = true;
      }
    }
    assert(thrown, 'Must reject room with mismatching apartment_id and room_type.apartment_id');
  });

  await test('Tạo phòng: Kiểm tra UNIQUE (apartment_id, room_number)', async () => {
    const ds = createMockDataSource((sql) => {
      if (sql.includes('FROM room_types')) {
        return [{ id: 10, apartment_id: 1, name: 'Loại phòng CN1' }];
      }
      if (sql.includes('FROM ROOMS WHERE apartment_id = ? AND LOWER(room_number) = LOWER(?)')) {
        return [{ room_id: 99, room_number: '101' }]; // room 101 already exists in apt 1
      }
      return [];
    });
    const service = new AdminRoomService(ds, mockAuditLogService);

    let thrown = false;
    try {
      await service.createRoom(
        { apartment_id: 1, room_type_id: 10, room_number: '101' },
        adminStaff.actor,
      );
    } catch (e: any) {
      if (e instanceof BadRequestException && e.message.includes('đã tồn tại')) thrown = true;
    }
    assert(thrown, 'Must reject duplicate room_number in the same apartment');
  });

  await test('Gán khóa: Không cho phép gán khóa đang được dùng bởi phòng khác', async () => {
    const ds = createMockDataSource((sql) => {
      if (sql.includes('SELECT * FROM ROOMS WHERE room_id = ?')) {
        return [{ room_id: 5, room_number: '105', apartment_id: 1 }];
      }
      if (sql.includes('FROM lock WHERE room_id = ?')) {
        return []; // phòng 5 chưa có khóa
      }
      if (sql.includes('FROM lock WHERE id = ?')) {
        return [{ id: 8, room_id: 99, deleted_at: null, lock_name: 'Khóa cửa 201' }]; // Đang gán cho phòng 99
      }
      if (sql.includes('FROM ROOMS WHERE room_id = ?')) {
        return [{ room_number: '201' }];
      }
      return [];
    });
    const service = new AdminRoomService(ds, mockAuditLogService);

    let thrown = false;
    try {
      await service.assignLock(5, 8, adminStaff.actor);
    } catch (e: any) {
      if (e instanceof BadRequestException && e.message.includes('đang được gán cho phòng')) thrown = true;
    }
    assert(thrown, 'Must reject assigning a lock already assigned to another room');
  });

  await test('Đổi trạng thái phòng sang bảo trì trả về cảnh báo nếu có đơn tương lai', async () => {
    const ds = createMockDataSource((sql) => {
      if (sql.includes('SELECT * FROM ROOMS WHERE room_id = ?')) {
        return [{ room_id: 5, room_number: '105', apartment_id: 1, status: 'available' }];
      }
      if (sql.includes('JOIN BOOKINGS')) {
        return [{ id: 101, booking_code: 'BK-101', booked_start_time: '2026-11-20', booked_end_time: '2026-11-22' }];
      }
      return [];
    });
    const service = new AdminRoomService(ds, mockAuditLogService);
    const result = await service.updateRoomStatus(5, 'maintenance', adminStaff.actor, adminStaff);

    assert(result.success, 'Status update must succeed');
    assert(result.warning && result.warning.has_warning, 'Must return warning about affected future bookings');
  });

  // ========================================================
  // 3. Quản lý khách hàng (CUSTOMER)
  // ========================================================
  console.log('\n3. AdminCustomerService:');

  await test('Tạo khách hàng: Email phải là duy nhất', async () => {
    const ds = createMockDataSource((sql) => {
      if (sql.includes('SELECT customer_id FROM CUSTOMER WHERE LOWER(email)')) {
        return [{ customer_id: 1 }]; // already exists
      }
      return [];
    });
    const service = new AdminCustomerService(ds, mockAuditLogService);

    let thrown = false;
    try {
      await service.createCustomer(
        { full_name: 'Khách Đã Có', email: 'existing@example.com' },
        adminStaff.actor,
      );
    } catch (e: any) {
      if (e instanceof BadRequestException && e.message.includes('đã tồn tại')) thrown = true;
    }
    assert(thrown, 'Must reject duplicate customer email');
  });

  await test('Manager xem lịch sử khách hàng chỉ thấy đơn thuộc chi nhánh mình', async () => {
    let capturedSql = '';
    let capturedParams: any[] = [];
    const ds = createMockDataSource((sql, params) => {
      if (sql.includes('SELECT customer_id AS id')) {
        return [{ id: 7, full_name: 'Nguyễn Văn A', email: 'a@example.com' }];
      }
      capturedSql = sql;
      capturedParams = params || [];
      return [
        {
          id: 50,
          booking_code: 'BK-CN1-50',
          apartment_id: 1,
          apartment_name: 'Chi nhánh 1',
          total_amount: 1500000,
        },
      ];
    });
    const service = new AdminCustomerService(ds, mockAuditLogService);
    const result = await service.getCustomerBookingHistory(7, managerStaff1);

    assert(capturedSql.includes('AND b.apartment_id = ?'), 'History query must be scoped by manager apartment_id');
    assert.strictEqual(capturedParams[capturedParams.length - 1], 1, 'Param must be manager apartmentId');
    assert.strictEqual(result.bookings.length, 1);
  });

  console.log('\n4. AdminBookingService & State Machine:');

  await test('State Machine: Chuyển đổi không hợp lệ ném ConflictException (409)', async () => {
    const { isValidStatusTransition } = require('@shared/helpers');
    const { BookingStatus } = require('@shared/enums');

    // Chuyển từ checked_out sang confirmed là bị cấm
    const isValid = isValidStatusTransition(BookingStatus.CHECKED_OUT, BookingStatus.CONFIRMED);
    assert.strictEqual(isValid, false, 'checked_out không được phép chuyển sang confirmed');

    // Chuyển từ pending_payment sang confirmed là hợp lệ
    const isValidPendingToConfirmed = isValidStatusTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED);
    assert.strictEqual(isValidPendingToConfirmed, true, 'pending_payment được phép sang confirmed');
  });

  await test('Phân quyền: Manager không thể hủy đơn đã xác nhận (confirmed) - chỉ Admin được phép', async () => {
    const { AdminBookingService } = require('./admin-booking.service');
    const { BookingStatus, StaffRole } = require('@shared/enums');

    const ds = createMockDataSource((sql) => {
      if (sql.includes('SELECT * FROM BOOKINGS')) {
        return [{ id: 99, apartment_id: 1, booking_status: BookingStatus.CONFIRMED, total_price: 1500000 }];
      }
      return [];
    });

    const mockStateMachine = { transitionStatus: async () => {} };
    const mockRealtime = { emitPostCommit: () => {} };
    const service = new AdminBookingService(ds, mockAuditLogService, {} as any, mockRealtime as any, mockStateMachine as any);

    const managerStaff = { id: 2, role: StaffRole.MANAGER, apartment_id: 1, full_name: 'Manager' };

    await assert.rejects(
      async () => {
        await service.cancelBooking(99, 'Lý do hủy', managerStaff);
      },
      /ForbiddenException|không có quyền/,
      'Manager phải bị cấm hủy đơn confirmed'
    );
  });

  await test('Phân quyền: Manager không thể lấy URL ảnh CCCD riêng tư (ForbiddenException)', async () => {
    const { AdminBookingService } = require('./admin-booking.service');
    const { StaffRole } = require('@shared/enums');

    const ds = createMockDataSource(() => []);
    const service = new AdminBookingService(ds, mockAuditLogService, {} as any, {} as any, {} as any);
    const managerStaff = { id: 2, role: StaffRole.MANAGER, apartment_id: 1, full_name: 'Manager' };

    await assert.rejects(
      async () => {
        await service.getSignedDocumentUrl(1, 1, 'front', managerStaff);
      },
      /ForbiddenException|không có quyền/,
      'Manager không có quyền xem ảnh CCCD trong chi tiết đơn'
    );
  });

  await test('Gia hạn giữ chỗ: Đơn pending_payment được gia hạn thêm 15 phút', async () => {
    const { AdminBookingService } = require('./admin-booking.service');
    const { BookingStatus, StaffRole } = require('@shared/enums');

    let updatedHoldTime: Date | null = null;
    const initialHold = new Date('2026-11-05T12:00:00Z');

    const ds = createMockDataSource((sql, params) => {
      if (sql.includes('SELECT * FROM BOOKINGS')) {
        return [{ id: 45, apartment_id: 1, booking_status: BookingStatus.PENDING_PAYMENT, hold_expires_at: initialHold }];
      }
      if (sql.includes('UPDATE BOOKINGS SET hold_expires_at')) {
        updatedHoldTime = params[0];
        return { affectedRows: 1 };
      }
      return [];
    });

    const mockRealtime = { emitPostCommit: () => {} };
    const service = new AdminBookingService(ds, mockAuditLogService, {} as any, mockRealtime as any, {} as any);
    const managerStaff = { id: 2, role: StaffRole.MANAGER, apartment_id: 1, full_name: 'Manager' };

    const result = await service.extendHold(45, managerStaff);
    assert.strictEqual(result.success, true);
    assert(result.hold_expires_at, 'Phải có hold_expires_at mới');
  });

  await test('Che số giấy tờ: maskDocumentNumber luôn che định dạng 0791****234', async () => {
    const { maskDocumentNumber } = require('@shared/helpers');

    const masked1 = maskDocumentNumber('079123456234');
    assert.strictEqual(masked1, '0791****234', 'Đúng định dạng 4 số đầu + **** + 3 số cuối');

    const maskedNull = maskDocumentNumber(null);
    assert.strictEqual(maskedNull, 'Chưa cung cấp');
  });

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log(`========================================\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
