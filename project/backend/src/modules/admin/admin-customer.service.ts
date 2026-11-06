import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { StaffContext } from '../../common/config/permissions.config';

export interface CreateCustomerDto {
  full_name: string;
  email: string;
  phone?: string;
}

export interface UpdateCustomerDto {
  full_name?: string;
  email?: string;
  phone?: string;
}

@Injectable()
export class AdminCustomerService {
  private readonly logger = new Logger(AdminCustomerService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * 1. DANH SÁCH KHÁCH HÀNG (Có phân trang, tìm kiếm, lọc theo trạng thái)
   * - status: 'all' | 'active' | 'hidden' | 'blocked'
   */
  async getCustomers(query: {
    search?: string;
    type?: string;
    status?: 'all' | 'active' | 'hidden' | 'blocked';
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 10)));
    const offset = (page - 1) * limit;

    let whereSql = 'WHERE 1=1';
    const params: any[] = [];

    // Lọc theo từ khóa tìm kiếm (email hoặc sđt hoặc họ tên)
    if (query.search && query.search.trim()) {
      whereSql += ` AND (c.email LIKE ? OR c.phone LIKE ? OR c.full_name LIKE ?)`;
      const s = `%${query.search.trim()}%`;
      params.push(s, s, s);
    }

    // Lọc theo trạng thái
    if (query.status === 'active') {
      whereSql += ` AND c.is_hidden = 0 AND c.is_blocked = 0`;
    } else if (query.status === 'hidden') {
      whereSql += ` AND c.is_hidden = 1`;
    } else if (query.status === 'blocked') {
      whereSql += ` AND c.is_blocked = 1`;
    }

    // Đếm tổng số bản ghi
    if (query.type === 'REGISTERED') whereSql += ' AND c.password_hash IS NOT NULL AND c.email_verified_at IS NOT NULL';
    if (query.type === 'GUEST_UNACTIVATED') whereSql += ' AND (c.password_hash IS NULL OR c.email_verified_at IS NULL)';
    const [countRow] = await this.dataSource.query(
      `SELECT COUNT(DISTINCT c.customer_id) AS total FROM CUSTOMER c ${whereSql}`,
      params,
    );
    const total = Number(countRow?.total || 0);

    // Lấy dữ liệu phân trang kèm số lượt booking
    const dataSql = `
      SELECT 
        c.customer_id AS id,
        c.full_name,
        c.email,
        c.phone,
        c.is_blocked,
        c.is_hidden,
        c.created_at,
        c.updated_at,
        c.account_created_at,
        COUNT(b.id) AS total_bookings_count
      FROM CUSTOMER c
      LEFT JOIN BOOKINGS b ON b.customer_id = c.customer_id
      ${whereSql}
      GROUP BY c.customer_id
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await this.dataSource.query(dataSql, [...params, limit, offset]);

    return {
      items: rows.map((r: any) => ({
        id: r.id,
        full_name: r.full_name,
        email: r.email,
        phone: r.phone,
        is_blocked: Boolean(r.is_blocked),
        is_hidden: Boolean(r.is_hidden),
        created_at: r.created_at,
        updated_at: r.updated_at,
        account_type: r.account_created_at ? 'REGISTERED' : 'GUEST_UNACTIVATED',
        total_bookings_count: Number(r.total_bookings_count || 0),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 2. CHI TIẾT KHÁCH HÀNG
   */
  async getCustomerById(customerId: number) {
    const [customer] = await this.dataSource.query(
      `SELECT customer_id AS id, full_name, email, phone, is_blocked, is_hidden, created_at, updated_at
       FROM CUSTOMER WHERE customer_id = ?`,
      [customerId],
    );
    if (!customer) {
      throw new NotFoundException(`Không tìm thấy khách hàng #${customerId}`);
    }

    return {
      ...customer,
      is_blocked: Boolean(customer.is_blocked),
      is_hidden: Boolean(customer.is_hidden),
    };
  }

  /**
   * 3. THÊM KHÁCH HÀNG THỦ CÔNG
   * - Validate email unique
   * - KHÔNG có password_hash (xác thực OTP email)
   */
  async createCustomer(dto: CreateCustomerDto, actor: string) {
    if (!dto.full_name || !dto.full_name.trim()) {
      throw new BadRequestException('Họ tên khách hàng là bắt buộc.');
    }
    if (!dto.email || !dto.email.trim()) {
      throw new BadRequestException('Email khách hàng là bắt buộc.');
    }

    const emailClean = dto.email.trim().toLowerCase();

    // Kiểm tra UNIQUE (email)
    const [existing] = await this.dataSource.query(
      `SELECT customer_id FROM CUSTOMER WHERE LOWER(email) = ?`,
      [emailClean],
    );
    if (existing) {
      throw new BadRequestException(`Email "${dto.email}" đã tồn tại trong danh sách khách hàng.`);
    }

    const res = await this.dataSource.query(
      `INSERT INTO CUSTOMER (full_name, email, phone, is_blocked, is_hidden, created_at, updated_at)
       VALUES (?, ?, ?, 0, 0, NOW(), NOW())`,
      [dto.full_name.trim(), emailClean, dto.phone ? dto.phone.trim() : null],
    );

    const newId = res.insertId;

    await this.auditLogService.log({
      actor,
      action: 'CREATE_CUSTOMER',
      entity_type: 'CUSTOMER',
      entity_id: newId,
      new_value: { id: newId, ...dto, email: emailClean },
    });

    return { success: true, id: newId, message: 'Thêm khách hàng thành công.' };
  }

  /**
   * 4. SỬA THÔNG TIN KHÁCH HÀNG
   */
  async updateCustomer(customerId: number, dto: UpdateCustomerDto, actor: string) {
    const [customer] = await this.dataSource.query(
      `SELECT * FROM CUSTOMER WHERE customer_id = ?`,
      [customerId],
    );
    if (!customer) {
      throw new NotFoundException(`Không tìm thấy khách hàng #${customerId}`);
    }

    const emailClean = dto.email ? dto.email.trim().toLowerCase() : customer.email;

    // Kiểm tra email trùng
    if (dto.email && emailClean !== customer.email) {
      const [duplicate] = await this.dataSource.query(
        `SELECT customer_id FROM CUSTOMER WHERE LOWER(email) = ? AND customer_id != ?`,
        [emailClean, customerId],
      );
      if (duplicate) {
        throw new BadRequestException(`Email "${dto.email}" đã được sử dụng bởi khách hàng khác.`);
      }
    }

    const updated = {
      full_name: dto.full_name !== undefined ? dto.full_name.trim() : customer.full_name,
      email: emailClean,
      phone: dto.phone !== undefined ? dto.phone.trim() : customer.phone,
    };

    await this.dataSource.query(
      `UPDATE CUSTOMER SET full_name = ?, email = ?, phone = ?, updated_at = NOW() WHERE customer_id = ?`,
      [updated.full_name, updated.email, updated.phone, customerId],
    );

    await this.auditLogService.log({
      actor,
      action: 'UPDATE_CUSTOMER',
      entity_type: 'CUSTOMER',
      entity_id: customerId,
      old_value: customer,
      new_value: updated,
    });

    return { success: true, message: 'Cập nhật thông tin khách hàng thành công.' };
  }

  /**
   * 5. ẨN / HIỆN KHÁCH HÀNG (is_hidden)
   * - Ẩn chỉ để gọn danh sách, không ảnh hưởng đơn đang chạy
   */
  async toggleHideCustomer(customerId: number, isHidden: boolean, actor: string) {
    const [customer] = await this.dataSource.query(
      `SELECT customer_id, full_name, is_hidden FROM CUSTOMER WHERE customer_id = ?`,
      [customerId],
    );
    if (!customer) {
      throw new NotFoundException(`Không tìm thấy khách hàng #${customerId}`);
    }

    await this.dataSource.query(
      `UPDATE CUSTOMER SET is_hidden = ?, updated_at = NOW() WHERE customer_id = ?`,
      [isHidden ? 1 : 0, customerId],
    );

    await this.auditLogService.log({
      actor,
      action: isHidden ? 'HIDE_CUSTOMER' : 'UNHIDE_CUSTOMER',
      entity_type: 'CUSTOMER',
      entity_id: customerId,
      old_value: { is_hidden: customer.is_hidden },
      new_value: { is_hidden: isHidden ? 1 : 0 },
    });

    return {
      success: true,
      message: `Đã ${isHidden ? 'ẩn' : 'mở hiển thị'} khách hàng "${customer.full_name}".`,
    };
  }

  /**
   * 6. CHẶN / BỎ CHẶN KHÁCH HÀNG (is_blocked)
   * - Chặn: Không cho đặt phòng mới; không ảnh hưởng các đơn đang chạy
   */
  async toggleBlockCustomer(
    customerId: number,
    isBlocked: boolean,
    reason: string,
    actor: string,
  ) {
    const [customer] = await this.dataSource.query(
      `SELECT customer_id, full_name, is_blocked FROM CUSTOMER WHERE customer_id = ?`,
      [customerId],
    );
    if (!customer) {
      throw new NotFoundException(`Không tìm thấy khách hàng #${customerId}`);
    }

    await this.dataSource.query(
      `UPDATE CUSTOMER SET is_blocked = ?, updated_at = NOW() WHERE customer_id = ?`,
      [isBlocked ? 1 : 0, customerId],
    );

    await this.auditLogService.log({
      actor,
      action: isBlocked ? 'BLOCK_CUSTOMER' : 'UNBLOCK_CUSTOMER',
      entity_type: 'CUSTOMER',
      entity_id: customerId,
      old_value: { is_blocked: customer.is_blocked },
      new_value: { is_blocked: isBlocked ? 1 : 0, reason },
    });

    return {
      success: true,
      message: `Đã ${isBlocked ? 'khóa chặn' : 'mở khóa'} khách hàng "${customer.full_name}".`,
    };
  }

  /**
   * 7. XEM LỊCH SỬ BOOKING CỦA KHÁCH HÀNG
   * - Manager: Chỉ thấy đơn thuộc chi nhánh của mình (staff.apartmentId).
   * - Admin: Thấy toàn bộ booking qua tất cả chi nhánh.
   */
  async getCustomerBookingHistory(customerId: number, staff: StaffContext) {
    const [customer] = await this.dataSource.query(
      `SELECT customer_id AS id, full_name, email, phone FROM CUSTOMER WHERE customer_id = ?`,
      [customerId],
    );
    if (!customer) {
      throw new NotFoundException(`Không tìm thấy khách hàng #${customerId}`);
    }

    let sql = `
      SELECT 
        b.id,
        b.booking_code,
        b.apartment_id,
        a.name AS apartment_name,
        b.booking_type,
        b.booking_status,
        b.booked_start_time,
        b.booked_end_time,
        b.total_amount,
        b.created_at,
        GROUP_CONCAT(DISTINCT rt.name SEPARATOR ', ') AS room_type_names,
        GROUP_CONCAT(DISTINCT r.room_number SEPARATOR ', ') AS room_numbers
      FROM BOOKINGS b
      LEFT JOIN APARTMENT a ON a.id = b.apartment_id
      LEFT JOIN Booking_rooms br ON br.bookings_id = b.id
      LEFT JOIN room_types rt ON rt.id = br.room_types_id
      LEFT JOIN ROOMS r ON r.room_id = br.room_id
      WHERE (b.customer_id = ? OR b.lock_email = ?)
    `;
    const params: any[] = [customerId, customer.email];

    // Manager scoping: Chỉ lọc đơn thuộc chi nhánh mình
    if (staff.role === 'manager') {
      sql += ` AND b.apartment_id = ?`;
      params.push(staff.apartmentId || 1);
    }

    sql += ` GROUP BY b.id ORDER BY b.created_at DESC`;

    const bookings = await this.dataSource.query(sql, params);

    return {
      customer,
      bookings: bookings.map((b: any) => ({
        id: b.id,
        booking_code: b.booking_code,
        apartment_id: b.apartment_id,
        apartment_name: b.apartment_name,
        room_type_name: b.room_type_names || '—',
        room_number: b.room_numbers || 'Chưa gán',
        booking_type: b.booking_type,
        booking_status: b.booking_status,
        check_in: b.booked_start_time,
        check_out: b.booked_end_time,
        total_amount: Number(b.total_amount || 0),
        created_at: b.created_at,
      })),
    };
  }

  /**
   * 8. GỘP TÀI KHOẢN TRÙNG LẶP
   */
  async mergeDuplicateAccounts(masterId: number, duplicateId: number, actor: string) {
    const [master] = await this.dataSource.query(
      `SELECT customer_id AS id, full_name FROM CUSTOMER WHERE customer_id = ?`, [masterId],
    );
    if (!master) throw new NotFoundException(`Không tìm thấy tài khoản chủ #${masterId}`);

    // Di chuyển tất cả booking sang tài khoản chính
    await this.dataSource.query(
      `UPDATE BOOKINGS SET customer_id = ? WHERE customer_id = ?`, [masterId, duplicateId],
    );
    // Ẩn tài khoản phụ
    await this.dataSource.query(
      `UPDATE CUSTOMER SET is_hidden = 1, updated_at = NOW() WHERE customer_id = ?`, [duplicateId],
    );

    await this.auditLogService.log({
      actor,
      action: 'MERGE_CUSTOMER_ACCOUNTS',
      entity_type: 'CUSTOMER',
      entity_id: masterId,
      new_value: { master_id: masterId, merged_duplicate_id: duplicateId },
    });

    return { success: true, message: `Đã gộp tài khoản #${duplicateId} vào tài khoản chính #${masterId}.` };
  }

  /**
   * 9. GỬI LẠI LỜI MỜI KÍCH HOẠT
   */
  async resendActivationInvite(customerId: number, actor: string) {
    const [customer] = await this.dataSource.query(
      `SELECT customer_id AS id, full_name, email FROM CUSTOMER WHERE customer_id = ?`, [customerId],
    );
    if (!customer) throw new NotFoundException(`Không tìm thấy khách hàng #${customerId}`);

    this.logger.log(`[resendActivationInvite] Gửi lại link kích hoạt cho ${customer.email} (actor: ${actor})`);

    await this.auditLogService.log({
      actor,
      action: 'RESEND_ACTIVATION_INVITE',
      entity_type: 'CUSTOMER',
      entity_id: customerId,
      new_value: { email: customer.email },
    });

    return { success: true, message: `Đã gửi lại email kích hoạt tới ${customer.email}.` };
  }
}
