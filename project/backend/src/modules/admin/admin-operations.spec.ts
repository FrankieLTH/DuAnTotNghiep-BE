/**
 * UNIT / INTEGRATION TESTS – Admin Operations
 * Stack: NestJS + TypeORM (DataSource mock)
 *
 * Phạm vi kiểm tra:
 *  1. Phân quyền branch-scoped (Manager bị ForbiddenException khi truy cập chi nhánh khác)
 *  2. Ẩn chi nhánh bị chặn khi còn đơn tương lai (BadRequestException)
 *  3. Tạo phòng kiểm tra apartment_id khớp room_types.apartment_id
 *  4. Unique (apartment_id, room_number) validation
 *  5. Khách hàng: email duy nhất
 *  6. Lock assignment: không gán khóa đã được gán cho phòng khác
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { AdminBranchService } from './admin-branch.service';
import { AdminRoomService } from './admin-room.service';
import { AdminCustomerService } from './admin-customer.service';
import { AuditLogService } from './audit-log.service';
import { StaffContext } from '../../common/config/permissions.config';

// ----------------------------------------------------------------
// Mock helpers
// ----------------------------------------------------------------
const makeMockDataSource = (queryFn: (...args: any[]) => any) => ({
  query: jest.fn(queryFn),
  createQueryRunner: jest.fn(() => ({
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: { query: jest.fn(queryFn) },
  })),
});

const mockAuditLogService = { log: jest.fn().mockResolvedValue(undefined) };

const makeAdminStaff = (): StaffContext => ({
  role: 'admin',
  apartmentId: undefined,
  actor: 'admin@test.com',
});

const makeManagerStaff = (apartmentId = 1): StaffContext => ({
  role: 'manager',
  apartmentId,
  actor: 'manager@test.com',
});

// ----------------------------------------------------------------
// 1. AdminBranchService tests
// ----------------------------------------------------------------
describe('AdminBranchService', () => {
  let service: AdminBranchService;
  let mockQuery: jest.Mock;

  const buildService = (queryFn: (...args: any[]) => any) => {
    const ds = makeMockDataSource(queryFn);
    mockQuery = ds.query as jest.Mock;
    service = new AdminBranchService(ds as unknown as DataSource, mockAuditLogService as unknown as AuditLogService);
  };

  describe('getBranches', () => {
    it('Manager chỉ thấy chi nhánh của mình (WHERE a.id = ?)', async () => {
      buildService(() => []);
      await service.getBranches(makeManagerStaff(2));
      const call = mockQuery.mock.calls[0];
      expect(call[0]).toContain('WHERE a.id = ?');
      expect(call[1]).toContain(2);
    });

    it('Admin thấy tất cả chi nhánh (không có WHERE id)', async () => {
      buildService(() => []);
      await service.getBranches(makeAdminStaff());
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql).not.toMatch(/WHERE a\.id = \?/);
    });
  });

  describe('getBranchById', () => {
    it('Manager bị ForbiddenException khi truy cập chi nhánh khác', async () => {
      buildService(() => [{ id: 1, name: 'Branch 1' }]);
      await expect(service.getBranchById(2, makeManagerStaff(1))).rejects.toThrow(ForbiddenException);
    });

    it('Manager xem được chi nhánh của mình', async () => {
      buildService((sql: string) => {
        if (sql.includes('SELECT *')) return [{ id: 1, name: 'Branch 1' }];
        return [{ active_count: 0 }];
      });
      const result = await service.getBranchById(1, makeManagerStaff(1));
      expect(result.id).toBe(1);
    });

    it('NotFoundException khi chi nhánh không tồn tại', async () => {
      buildService(() => []);
      await expect(service.getBranchById(999, makeAdminStaff())).rejects.toThrow(NotFoundException);
    });
  });

  describe('hideBranch', () => {
    it('BadRequestException khi còn đơn tương lai (FUTURE_BOOKINGS_EXIST)', async () => {
      buildService((sql: string) => {
        if (sql.includes('SELECT * FROM APARTMENT')) return [{ id: 1, name: 'Triền Núi Nhỏ', status: 'active' }];
        // Giả lập 2 đơn tương lai
        return [
          { id: 101, booking_code: 'BK-101', booked_start_time: '2026-12-01', booked_end_time: '2026-12-02', booking_status: 'confirmed' },
          { id: 102, booking_code: 'BK-102', booked_start_time: '2026-12-05', booked_end_time: '2026-12-06', booking_status: 'confirmed' },
        ];
      });
      await expect(service.hideBranch(1, 'admin@test.com')).rejects.toThrow(BadRequestException);
    });

    it('Ẩn thành công khi không còn đơn tương lai', async () => {
      buildService((sql: string) => {
        if (sql.includes('SELECT * FROM APARTMENT')) return [{ id: 1, name: 'Triền Núi Nhỏ', status: 'active' }];
        if (sql.includes('UPDATE')) return { affectedRows: 1 };
        return []; // Không có đơn tương lai
      });
      const result = await service.hideBranch(1, 'admin@test.com');
      expect(result.success).toBe(true);
    });
  });

  describe('createBranch', () => {
    it('BadRequestException khi hotline sai định dạng', async () => {
      buildService(() => []);
      await expect(service.createBranch(
        { name: 'Test', address: 'Địa chỉ', hotline: '12345' },
        'admin@test.com',
      )).rejects.toThrow(BadRequestException);
    });

    it('BadRequestException khi tên trùng lặp', async () => {
      buildService((sql: string) => {
        if (sql.includes('LOWER(name)')) return [{ id: 99 }]; // tên đã tồn tại
        return [];
      });
      await expect(service.createBranch(
        { name: 'Trùng tên', address: 'Địa chỉ', hotline: '0901234567' },
        'admin@test.com',
      )).rejects.toThrow(BadRequestException);
    });

    it('Tạo thành công với dữ liệu hợp lệ', async () => {
      buildService((sql: string) => {
        if (sql.includes('LOWER(name)')) return []; // không trùng tên
        if (sql.includes('INSERT')) return { insertId: 10 };
        return [];
      });
      const result = await service.createBranch(
        { name: 'Chi nhánh Mới', address: '123 Đường ABC', hotline: '0901234567' },
        'admin@test.com',
      );
      expect(result.success).toBe(true);
      expect(result.id).toBe(10);
    });
  });
});

// ----------------------------------------------------------------
// 2. AdminRoomService tests
// ----------------------------------------------------------------
describe('AdminRoomService', () => {
  let service: AdminRoomService;
  let mockQuery: jest.Mock;

  const buildService = (queryFn: (...args: any[]) => any) => {
    const ds = makeMockDataSource(queryFn);
    mockQuery = ds.query as jest.Mock;
    service = new AdminRoomService(ds as unknown as DataSource, mockAuditLogService as unknown as AuditLogService);
  };

  describe('createRoom', () => {
    it('BadRequestException khi room_types.apartment_id != ROOMS.apartment_id', async () => {
      buildService((sql: string) => {
        if (sql.includes('room_types')) return [{ id: 1, name: 'Suite', apartment_id: 2 }]; // loại phòng thuộc CN2
        return [];
      });
      await expect(service.createRoom(
        { apartment_id: 1, room_type_id: 1, room_number: 'P101' }, // CN1 ≠ CN2
        'admin@test.com',
      )).rejects.toThrow(BadRequestException);
    });

    it('BadRequestException khi số phòng bị trùng (apartment_id, room_number)', async () => {
      buildService((sql: string) => {
        if (sql.includes('room_types')) return [{ id: 1, name: 'Suite', apartment_id: 1 }];
        if (sql.includes('room_number')) return [{ room_id: 99 }]; // đã tồn tại
        return [];
      });
      await expect(service.createRoom(
        { apartment_id: 1, room_type_id: 1, room_number: 'P101' },
        'admin@test.com',
      )).rejects.toThrow(BadRequestException);
    });

    it('Tạo phòng thành công khi dữ liệu hợp lệ', async () => {
      let callCount = 0;
      buildService((sql: string) => {
        callCount++;
        if (sql.includes('room_types')) return [{ id: 1, name: 'Suite', apartment_id: 1 }];
        if (sql.includes('room_number')) return []; // không trùng
        if (sql.includes('INSERT')) return { insertId: 55 };
        return [];
      });
      const result = await service.createRoom(
        { apartment_id: 1, room_type_id: 1, room_number: 'P201' },
        'admin@test.com',
      );
      expect(result.success).toBe(true);
      expect(result.room_id).toBe(55);
    });
  });

  describe('assignLock', () => {
    it('BadRequestException khi khóa đã được gán cho phòng khác', async () => {
      buildService((sql: string) => {
        if (sql.includes('room_id =') && sql.includes('lock')) return [{ id: 1, room_id: 99, room_number: 'P099' }]; // khóa đang gắn phòng 99
        return [{ room_id: 10, room_number: 'P101', apartment_id: 1 }];
      });
      await expect(service.assignLock(10, 1, 'admin@test.com')).rejects.toThrow(BadRequestException);
    });

    it('Gán khóa thành công khi khóa chưa được dùng', async () => {
      buildService((sql: string) => {
        if (sql.includes('SELECT * FROM ROOMS')) return [{ room_id: 10, room_number: 'P101', apartment_id: 1 }];
        if (sql.includes('SELECT') && sql.includes('lock')) return [{ id: 1, room_id: null }]; // khóa chưa gán
        if (sql.includes('UPDATE')) return { affectedRows: 1 };
        return [];
      });
      const result = await service.assignLock(10, 1, 'admin@test.com');
      expect(result.success).toBe(true);
    });
  });

  describe('getRooms (manager scoping)', () => {
    it('Manager bị giới hạn theo apartmentId trong câu truy vấn', async () => {
      buildService(() => []);
      await service.getRooms({}, makeManagerStaff(2));
      const sql: string = mockQuery.mock.calls[0][0];
      const params: any[] = mockQuery.mock.calls[0][1];
      expect(sql).toMatch(/WHERE|AND/i);
      expect(params).toContain(2);
    });
  });
});

// ----------------------------------------------------------------
// 3. AdminCustomerService tests
// ----------------------------------------------------------------
describe('AdminCustomerService', () => {
  let service: AdminCustomerService;
  let mockQuery: jest.Mock;

  const buildService = (queryFn: (...args: any[]) => any) => {
    const ds = makeMockDataSource(queryFn);
    mockQuery = ds.query as jest.Mock;
    service = new AdminCustomerService(ds as unknown as DataSource, mockAuditLogService as unknown as AuditLogService);
  };

  describe('createCustomer', () => {
    it('BadRequestException khi email đã tồn tại', async () => {
      buildService((sql: string) => {
        if (sql.includes('email =')) return [{ customer_id: 5 }]; // email đã tồn tại
        return [];
      });
      await expect(service.createCustomer(
        { full_name: 'Nguyễn Văn A', email: 'trung@example.com' },
        'admin@test.com',
      )).rejects.toThrow(BadRequestException);
    });

    it('Tạo khách hàng thành công với email chưa tồn tại', async () => {
      buildService((sql: string) => {
        if (sql.includes('email =')) return []; // email chưa tồn tại
        if (sql.includes('INSERT')) return { insertId: 20 };
        return [];
      });
      const result = await service.createCustomer(
        { full_name: 'Nguyễn Văn Mới', email: 'moi@example.com' },
        'admin@test.com',
      );
      expect(result.success).toBe(true);
      expect(result.id).toBe(20);
    });

    it('BadRequestException khi email không hợp lệ', async () => {
      buildService(() => []);
      await expect(service.createCustomer(
        { full_name: 'Test', email: 'not-an-email' },
        'admin@test.com',
      )).rejects.toThrow(BadRequestException);
    });
  });

  describe('toggleBlockCustomer', () => {
    it('NotFoundException khi không tìm thấy khách hàng', async () => {
      buildService(() => []);
      await expect(service.toggleBlockCustomer(999, true, 'vi phạm quy định', 'admin@test.com')).rejects.toThrow(NotFoundException);
    });

    it('Chặn khách hàng thành công', async () => {
      buildService((sql: string) => {
        if (sql.includes('SELECT')) return [{ customer_id: 1, full_name: 'Test User', is_blocked: 0 }];
        if (sql.includes('UPDATE')) return { affectedRows: 1 };
        return [];
      });
      const result = await service.toggleBlockCustomer(1, true, 'Vi phạm', 'admin@test.com');
      expect(result.success).toBe(true);
    });
  });

  describe('getCustomerBookingHistory (manager scoping)', () => {
    it('Manager chỉ thấy booking của chi nhánh mình', async () => {
      buildService((sql: string) => {
        if (sql.includes('SELECT customer_id')) return [{ id: 1, full_name: 'Test', email: 'test@test.com', phone: '090' }];
        return [];
      });
      await service.getCustomerBookingHistory(1, makeManagerStaff(3));
      const bookingQuery = mockQuery.mock.calls.find(
        (call: any[]) => call[0].includes('apartment_id = ?'),
      );
      expect(bookingQuery).toBeDefined();
      expect(bookingQuery[1]).toContain(3);
    });
  });
});
