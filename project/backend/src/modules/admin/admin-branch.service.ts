import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { StaffContext } from '../../common/config/permissions.config';

export interface CreateBranchDto {
  name: string;
  address: string;
  hotline: string;
  status?: 'active' | 'hidden';
}

export interface UpdateBranchDto {
  name?: string;
  address?: string;
  hotline?: string;
  status?: 'active' | 'hidden';
}

@Injectable()
export class AdminBranchService {
  private readonly logger = new Logger(AdminBranchService.name);

  // Regex kiểm tra số điện thoại Việt Nam hợp lệ (10 số, đầu 03, 05, 07, 08, 09, hoặc +84)
  private readonly vnPhoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * 1. LẤY DANH SÁCH CHI NHÁNH
   * - Admin: Xem toàn bộ chi nhánh.
   * - Manager: Chỉ xem chi nhánh của mình (staff.apartmentId).
   */
  async getBranches(staff: StaffContext) {
    let sql = `
      SELECT 
        a.id,
        a.name,
        a.address,
        a.hotline,
        a.status,
        a.created_at,
        a.updated_at,
        COUNT(r.room_id) AS total_rooms,
        SUM(CASE WHEN r.status = 'available' AND r.is_hidden = 0 THEN 1 ELSE 0 END) AS available_rooms,
        SUM(CASE WHEN r.status = 'maintenance' AND r.is_hidden = 0 THEN 1 ELSE 0 END) AS maintenance_rooms,
        SUM(CASE WHEN r.is_hidden = 1 THEN 1 ELSE 0 END) AS hidden_rooms
      FROM APARTMENT a
      LEFT JOIN ROOMS r ON r.apartment_id = a.id
    `;
    const params: any[] = [];

    if (staff.role === 'manager') {
      sql += ` WHERE a.id = ?`;
      params.push(staff.apartmentId || 1);
    }

    sql += ` GROUP BY a.id ORDER BY a.id ASC`;

    const rows = await this.dataSource.query(sql, params);
    return rows.map((r: any) => ({
      ...r,
      total_rooms: Number(r.total_rooms || 0),
      available_rooms: Number(r.available_rooms || 0),
      maintenance_rooms: Number(r.maintenance_rooms || 0),
      hidden_rooms: Number(r.hidden_rooms || 0),
    }));
  }

  /**
   * 2. CHI TIẾT CHI NHÁNH
   */
  async getBranchById(id: number, staff: StaffContext) {
    if (staff.role === 'manager' && staff.apartmentId !== id) {
      throw new ForbiddenException('Bạn chỉ có quyền xem thông tin chi nhánh thuộc quyền quản lý của mình.');
    }

    const [branch] = await this.dataSource.query(`SELECT * FROM APARTMENT WHERE id = ?`, [id]);
    if (!branch) {
      throw new NotFoundException(`Không tìm thấy chi nhánh #${id}`);
    }

    // Đếm số đơn đặt phòng tương lai đang chạy
    const [activeBookings] = await this.dataSource.query(
      `SELECT COUNT(*) AS active_count
       FROM BOOKINGS
       WHERE apartment_id = ?
         AND booked_end_time > NOW()
         AND (
           booking_status IN ('confirmed', 'checked_in')
           OR (booking_status IN ('draft', 'pending_payment') AND hold_expires_at > NOW())
         )`,
      [id],
    );

    return {
      ...branch,
      active_future_bookings: Number(activeBookings?.active_count || 0),
    };
  }

  /**
   * 3. THÊM MỚI CHI NHÁNH (CHỈ ADMIN)
   */
  async createBranch(dto: CreateBranchDto, actor: string) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Tên chi nhánh là bắt buộc.');
    }
    if (!dto.address || !dto.address.trim()) {
      throw new BadRequestException('Địa chỉ chi nhánh là bắt buộc.');
    }
    if (!dto.hotline || !this.vnPhoneRegex.test(dto.hotline.trim())) {
      throw new BadRequestException('Hotline không đúng định dạng số điện thoại Việt Nam hợp lệ (10 chữ số).');
    }

    // Kiểm tra tên chi nhánh trùng lặp
    const [existing] = await this.dataSource.query(
      `SELECT id FROM APARTMENT WHERE LOWER(name) = LOWER(?)`,
      [dto.name.trim()],
    );
    if (existing) {
      throw new BadRequestException(`Chi nhánh với tên "${dto.name}" đã tồn tại trên hệ thống.`);
    }

    const res = await this.dataSource.query(
      `INSERT INTO APARTMENT (name, address, hotline, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [dto.name.trim(), dto.address.trim(), dto.hotline.trim(), dto.status || 'active'],
    );

    const newId = res.insertId;

    await this.auditLogService.log({
      actor,
      action: 'CREATE_BRANCH',
      entity_type: 'APARTMENT',
      entity_id: newId,
      new_value: { id: newId, ...dto },
    });

    return { success: true, id: newId, message: 'Thêm chi nhánh mới thành công.' };
  }

  /**
   * 4. CẬP NHẬT CHI NHÁNH (CHỈ ADMIN)
   */
  async updateBranch(id: number, dto: UpdateBranchDto, actor: string) {
    const [branch] = await this.dataSource.query(`SELECT * FROM APARTMENT WHERE id = ?`, [id]);
    if (!branch) {
      throw new NotFoundException(`Không tìm thấy chi nhánh #${id}`);
    }

    if (dto.name) {
      const [duplicate] = await this.dataSource.query(
        `SELECT id FROM APARTMENT WHERE LOWER(name) = LOWER(?) AND id != ?`,
        [dto.name.trim(), id],
      );
      if (duplicate) {
        throw new BadRequestException(`Tên chi nhánh "${dto.name}" đã được sử dụng bởi cơ sở khác.`);
      }
    }

    if (dto.hotline && !this.vnPhoneRegex.test(dto.hotline.trim())) {
      throw new BadRequestException('Hotline không đúng định dạng số điện thoại Việt Nam hợp lệ.');
    }

    const updatedData = {
      name: dto.name !== undefined ? dto.name.trim() : branch.name,
      address: dto.address !== undefined ? dto.address.trim() : branch.address,
      hotline: dto.hotline !== undefined ? dto.hotline.trim() : branch.hotline,
      status: dto.status !== undefined ? dto.status : branch.status,
    };

    await this.dataSource.query(
      `UPDATE APARTMENT SET name = ?, address = ?, hotline = ?, status = ?, updated_at = NOW() WHERE id = ?`,
      [updatedData.name, updatedData.address, updatedData.hotline, updatedData.status, id],
    );

    await this.auditLogService.log({
      actor,
      action: 'UPDATE_BRANCH',
      entity_type: 'APARTMENT',
      entity_id: id,
      old_value: branch,
      new_value: updatedData,
    });

    return { success: true, message: 'Cập nhật thông tin chi nhánh thành công.' };
  }

  /**
   * 5. ẨN CHI NHÁNH (CHỈ ADMIN)
   * - Quy tắc: Không cho ẩn nếu còn đơn tương lai (booked_end_time > NOW() và trạng thái đã thanh toán hoặc giữ chỗ còn hạn).
   */
  async hideBranch(id: number, actor: string) {
    const [branch] = await this.dataSource.query(`SELECT * FROM APARTMENT WHERE id = ?`, [id]);
    if (!branch) {
      throw new NotFoundException(`Không tìm thấy chi nhánh #${id}`);
    }

    // Kiểm tra các đơn đặt phòng tương lai thuộc chi nhánh này
    const futureBookings = await this.dataSource.query(
      `SELECT id, booking_code, booked_start_time, booked_end_time, booking_status
       FROM BOOKINGS
       WHERE apartment_id = ?
         AND booked_end_time > NOW()
         AND (
           booking_status IN ('confirmed', 'checked_in')
           OR (booking_status IN ('draft', 'pending_payment') AND hold_expires_at > NOW())
         )`,
      [id],
    );

    if (futureBookings && futureBookings.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: `Không thể ẩn chi nhánh "${branch.name}": Hiện còn ${futureBookings.length} đơn đặt phòng tương lai đang có hiệu lực. Vui lòng hoàn tất hoặc giải quyết dứt điểm các đơn này trước khi ẩn cơ sở.`,
        error: 'FUTURE_BOOKINGS_EXIST',
        conflicting_bookings_count: futureBookings.length,
        conflicting_bookings: futureBookings.map((b: any) => ({
          booking_code: b.booking_code,
          booked_start_time: b.booked_start_time,
          booked_end_time: b.booked_end_time,
          booking_status: b.booking_status,
        })),
      });
    }

    await this.dataSource.query(`UPDATE APARTMENT SET status = 'hidden', updated_at = NOW() WHERE id = ?`, [id]);

    await this.auditLogService.log({
      actor,
      action: 'HIDE_BRANCH',
      entity_type: 'APARTMENT',
      entity_id: id,
      old_value: { status: branch.status },
      new_value: { status: 'hidden' },
    });

    return { success: true, message: `Đã tạm ẩn chi nhánh "${branch.name}" khỏi cổng đặt phòng khách hàng.` };
  }

  /**
   * 6. KÍCH HOẠT LẠI CHI NHÁNH
   */
  async activateBranch(id: number, actor: string) {
    const [branch] = await this.dataSource.query(`SELECT * FROM APARTMENT WHERE id = ?`, [id]);
    if (!branch) {
      throw new NotFoundException(`Không tìm thấy chi nhánh #${id}`);
    }

    await this.dataSource.query(`UPDATE APARTMENT SET status = 'active', updated_at = NOW() WHERE id = ?`, [id]);

    await this.auditLogService.log({
      actor,
      action: 'ACTIVATE_BRANCH',
      entity_type: 'APARTMENT',
      entity_id: id,
      old_value: { status: branch.status },
      new_value: { status: 'active' },
    });

    return { success: true, message: `Đã kích hoạt hoạt động lại chi nhánh "${branch.name}".` };
  }
}
