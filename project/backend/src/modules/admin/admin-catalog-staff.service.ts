import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { StaffRole } from '../../common/config/permissions.config';

@Injectable()
export class AdminCatalogStaffService {
  private readonly logger = new Logger(AdminCatalogStaffService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ============================================================
  // 1. DANH MỤC: LOẠI PHÒNG (room_types)
  // ============================================================
  async getRoomTypes() {
    return await this.dataSource.query(`SELECT * FROM room_types ORDER BY id ASC`);
  }

  async saveRoomType(data: any, actor: string) {
    if (data.id) {
      await this.dataSource.query(
        `UPDATE room_types SET name = ?, max_occupancy = ?, base_price = ?, bed_config = ? WHERE id = ?`,
        [data.name, data.max_occupancy, data.base_price, data.bed_config, data.id],
      );
      await this.auditLogService.log({
        actor,
        action: 'UPDATE_ROOM_TYPE',
        entity_type: 'room_types',
        entity_id: data.id,
        new_value: data,
      });
      return { success: true, id: data.id };
    } else {
      const res = await this.dataSource.query(
        `INSERT INTO room_types (name, max_occupancy, base_price, bed_config) VALUES (?, ?, ?, ?)`,
        [data.name, data.max_occupancy, data.base_price, data.bed_config],
      );
      await this.auditLogService.log({
        actor,
        action: 'CREATE_ROOM_TYPE',
        entity_type: 'room_types',
        entity_id: res.insertId,
        new_value: data,
      });
      return { success: true, id: res.insertId };
    }
  }

  // ============================================================
  // 2. DANH MỤC: GIÁ (price)
  // ============================================================
  async getPrices() {
    return await this.dataSource.query(`SELECT * FROM price ORDER BY id DESC LIMIT 100`);
  }

  async savePrice(data: any, actor: string) {
    if (data.id) {
      await this.dataSource.query(
        `UPDATE price SET price_type = ?, amount = ?, price_modifier_type = ?, valid_from = ?, valid_to = ?, is_active = ? WHERE id = ?`,
        [data.price_type, data.amount, data.price_modifier_type, data.valid_from, data.valid_to, data.is_active ? 1 : 0, data.id],
      );
      await this.auditLogService.log({
        actor,
        action: 'UPDATE_PRICE_RULE',
        entity_type: 'price',
        entity_id: data.id,
        new_value: data,
      });
      return { success: true, id: data.id };
    } else {
      const res = await this.dataSource.query(
        `INSERT INTO price (price_type, amount, price_modifier_type, valid_from, valid_to, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
        [data.price_type, data.amount, data.price_modifier_type, data.valid_from, data.valid_to, data.is_active !== false ? 1 : 0],
      );
      await this.auditLogService.log({
        actor,
        action: 'CREATE_PRICE_RULE',
        entity_type: 'price',
        entity_id: res.insertId,
        new_value: data,
      });
      return { success: true, id: res.insertId };
    }
  }

  // ============================================================
  // 3. DANH MỤC: PHỤ PHÍ (extra_fee)
  // ============================================================
  async getExtraFees() {
    return await this.dataSource.query(`SELECT * FROM extra_fee ORDER BY extra_fee_id DESC LIMIT 100`);
  }

  async saveExtraFee(data: any, actor: string) {
    if (data.extra_fee_id) {
      await this.dataSource.query(
        `UPDATE extra_fee SET name = ?, type = ?, percent = ?, status = ?, days_of_week = ? WHERE extra_fee_id = ?`,
        [data.name, data.type, data.percent, data.status, data.days_of_week, data.extra_fee_id],
      );
      await this.auditLogService.log({
        actor,
        action: 'UPDATE_EXTRA_FEE',
        entity_type: 'extra_fee',
        entity_id: data.extra_fee_id,
        new_value: data,
      });
      return { success: true, extra_fee_id: data.extra_fee_id };
    } else {
      const res = await this.dataSource.query(
        `INSERT INTO extra_fee (name, type, percent, status, days_of_week) VALUES (?, ?, ?, ?, ?)`,
        [data.name, data.type, data.percent, data.status || 'active', data.days_of_week],
      );
      await this.auditLogService.log({
        actor,
        action: 'CREATE_EXTRA_FEE',
        entity_type: 'extra_fee',
        entity_id: res.insertId,
        new_value: data,
      });
      return { success: true, extra_fee_id: res.insertId };
    }
  }

  // ============================================================
  // 4. DANH MỤC: VOUCHER (vouchers)
  // ============================================================
  async getVouchers() {
    return await this.dataSource.query(`SELECT * FROM vouchers ORDER BY id DESC LIMIT 100`);
  }

  async saveVoucher(data: any, actor: string) {
    if (data.id) {
      await this.dataSource.query(
        `UPDATE vouchers SET title = ?, discount_type = ?, discount_value = ?, min_order_value = ?, is_active = ? WHERE id = ?`,
        [data.title, data.discount_type, data.discount_value, data.min_order_value, data.is_active ? 1 : 0, data.id],
      );
      await this.auditLogService.log({
        actor,
        action: 'UPDATE_VOUCHER',
        entity_type: 'vouchers',
        entity_id: data.id,
        new_value: data,
      });
      return { success: true, id: data.id };
    } else {
      const res = await this.dataSource.query(
        `INSERT INTO vouchers (code, title, discount_type, discount_value, min_order_value, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
        [data.code, data.title, data.discount_type, data.discount_value, data.min_order_value, data.is_active !== false ? 1 : 0],
      );
      await this.auditLogService.log({
        actor,
        action: 'CREATE_VOUCHER',
        entity_type: 'vouchers',
        entity_id: res.insertId,
        new_value: data,
      });
      return { success: true, id: res.insertId };
    }
  }

  // ============================================================
  // 5. DANH MỤC: DỊCH VỤ (services)
  // ============================================================
  async getServices() {
    return await this.dataSource.query(`SELECT * FROM services ORDER BY services_id DESC LIMIT 100`);
  }

  async saveService(data: any, actor: string) {
    if (data.services_id) {
      await this.dataSource.query(
        `UPDATE services SET name = ?, price = ?, description = ?, is_active = ? WHERE services_id = ?`,
        [data.name, data.price, data.description, data.is_active ? 1 : 0, data.services_id],
      );
      await this.auditLogService.log({
        actor,
        action: 'UPDATE_SERVICE',
        entity_type: 'services',
        entity_id: data.services_id,
        new_value: data,
      });
      return { success: true, services_id: data.services_id };
    } else {
      const res = await this.dataSource.query(
        `INSERT INTO services (name, price, description, is_active) VALUES (?, ?, ?, ?)`,
        [data.name, data.price, data.description, data.is_active !== false ? 1 : 0],
      );
      await this.auditLogService.log({
        actor,
        action: 'CREATE_SERVICE',
        entity_type: 'services',
        entity_id: res.insertId,
        new_value: data,
      });
      return { success: true, services_id: res.insertId };
    }
  }

  // ============================================================
  // 6. QUẢN LÝ NHÂN VIÊN & PHÂN QUYỀN (STAFF & ROLES)
  // ============================================================
  async getStaffList() {
    return await this.dataSource.query(`
      SELECT s.staff_id, s.full_name, s.email, s.phone, s.role_id, s.is_blocked, r.role_name
      FROM STAFF s
      LEFT JOIN ROLES r ON s.role_id = r.role_id
      ORDER BY s.staff_id ASC
    `);
  }

  /**
   * Cập nhật trạng thái hoặc quyền nhân viên (Chỉ Admin)
   * Quy tắc bắt buộc:
   * 1. Manager không được sửa quyền của mình hoặc của Admin
   * 2. Luôn giữ ít nhất 1 admin hoạt động (không được chặn hoặc hạ quyền admin cuối cùng)
   */
  async updateStaffRoleOrBlock(
    staffId: number,
    data: { role_id?: number; is_blocked?: boolean },
    callerRole: StaffRole,
    actor: string,
  ) {
    if (callerRole !== 'admin') {
      throw new ForbiddenException('Chỉ tài khoản Quản trị viên (Admin) mới có quyền quản lý nhân viên và phân quyền.');
    }

    const [targetStaff] = await this.dataSource.query(
      `SELECT s.*, r.role_name FROM STAFF s LEFT JOIN ROLES r ON s.role_id = r.role_id WHERE s.staff_id = ?`,
      [staffId],
    );

    if (!targetStaff) {
      throw new NotFoundException(`Không tìm thấy nhân viên #${staffId}`);
    }

    // Kiểm tra quy tắc bảo toàn ít nhất 1 Admin hoạt động
    const isTargetAdmin = targetStaff.role_name === 'admin' || targetStaff.role_id === 1;
    const willBeDemotedOrBlocked = (data.role_id && data.role_id !== 1) || data.is_blocked === true;

    if (isTargetAdmin && willBeDemotedOrBlocked) {
      const [activeAdminsCount] = await this.dataSource.query(`
        SELECT COUNT(*) AS count 
        FROM STAFF s
        LEFT JOIN ROLES r ON s.role_id = r.role_id
        WHERE (s.role_id = 1 OR r.role_name = 'admin')
          AND (s.is_blocked = 0 OR s.is_blocked IS NULL)
          AND s.staff_id != ?
      `, [staffId]);

      if (Number(activeAdminsCount?.count || 0) < 1) {
        throw new BadRequestException(
          'Không thể hạ quyền hoặc chặn nhân viên này. Hệ thống bắt buộc phải duy trì ít nhất 1 Quản trị viên (Admin) hoạt động.',
        );
      }
    }

    // Cập nhật
    const updates: string[] = [];
    const params: any[] = [];
    if (data.role_id !== undefined) {
      updates.push('role_id = ?');
      params.push(data.role_id);
    }
    if (data.is_blocked !== undefined) {
      updates.push('is_blocked = ?');
      params.push(data.is_blocked ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(staffId);
      await this.dataSource.query(`UPDATE STAFF SET ${updates.join(', ')} WHERE staff_id = ?`, params);
    }

    await this.auditLogService.log({
      actor,
      action: 'UPDATE_STAFF_PERMISSIONS',
      entity_type: 'STAFF',
      entity_id: staffId,
      old_value: { role_id: targetStaff.role_id, is_blocked: targetStaff.is_blocked },
      new_value: data,
    });

    return { success: true, message: `Đã cập nhật nhân viên #${staffId} thành công.` };
  }
}
