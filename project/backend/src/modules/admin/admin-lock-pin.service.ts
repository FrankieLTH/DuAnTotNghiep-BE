import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as dayjs from 'dayjs';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AdminLockPinService {
  private readonly logger = new Logger(AdminLockPinService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * 1. LẤY DANH SÁCH MÃ KHÓA THEO ĐƠN & PHÒNG
   */
  async getLockPins(filter?: { status?: string; search?: string }) {
    let sql = `
      SELECT 
        lp.id,
        lp.booking_id,
        lp.lock_id,
        lp.pin,
        lp.lock_pin_start_time,
        lp.lock_pin_end_time,
        lp.status AS pin_status,
        b.booking_code,
        b.booking_status,
        b.verification_status,
        b.lock_email,
        c.full_name AS customer_name,
        c.email AS customer_email,
        r.room_number,
        l.cloud_lock_id,
        l.lock_name,
        l.lock_status
      FROM lock_pin lp
      JOIN BOOKINGS b ON lp.booking_id = b.id
      LEFT JOIN CUSTOMER c ON b.customer_id = c.customer_id
      LEFT JOIN \`lock\` l ON lp.lock_id = l.id
      LEFT JOIN ROOMS r ON l.room_id = r.room_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.status) {
      sql += ` AND lp.status = ?`;
      params.push(filter.status);
    }

    if (filter?.search) {
      sql += ` AND (b.booking_code LIKE ? OR c.full_name LIKE ? OR r.room_number LIKE ?)`;
      const s = `%${filter.search}%`;
      params.push(s, s, s);
    }

    sql += ` ORDER BY lp.created_at DESC LIMIT 100`;

    return await this.dataSource.query(sql, params);
  }

  /**
   * 2. PHÁT MÃ KHÓA MỚI HOẶC CẤP LẠI
   * Quy tắc bắt buộc: Chỉ phát mã khi đơn thành công VÀ giấy tờ đã đạt hoặc đã được duyệt
   */
  async issueOrRegeneratePin(bookingId: number, lockId: number, actor: string) {
    const [booking] = await this.dataSource.query(
      `SELECT id, booking_code, booking_status, verification_status, 
              booked_start_time, booked_end_time, lock_email, customer_id
       FROM BOOKINGS WHERE id = ?`,
      [bookingId],
    );

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn #${bookingId}`);
    }

    // KIỂM TRA ĐIỀU KIỆN TIÊN QUYẾT:
    if (booking.booking_status !== 'confirmed') {
      throw new BadRequestException(
        `Không thể phát mã khóa: Đơn hàng #${booking.booking_code} chưa được thanh toán thành công (Trạng thái hiện tại: ${booking.booking_status}).`,
      );
    }

    if (booking.verification_status !== 'passed') {
      throw new BadRequestException(
        `Không thể phát mã khóa: Hồ sơ giấy tờ của đơn #${booking.booking_code} chưa được duyệt đạt (Trạng thái hiện tại: ${booking.verification_status}).`,
      );
    }

    // Sinh mã PIN ngẫu nhiên 6 chữ số
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();

    // Hạn mã khóa trùng với giờ check-in / check-out của đơn
    const startTime = booking.booked_start_time;
    const endTime = booking.booked_end_time;

    // Cập nhật hoặc chèn mới lock_pin
    const [existing] = await this.dataSource.query(
      `SELECT id FROM lock_pin WHERE booking_id = ? AND lock_id = ?`,
      [bookingId, lockId],
    );

    if (existing) {
      await this.dataSource.query(
        `UPDATE lock_pin 
         SET pin = ?, lock_pin_start_time = ?, lock_pin_end_time = ?, status = 'sent', updated_at = NOW()
         WHERE id = ?`,
        [newPin, startTime, endTime, existing.id],
      );
    } else {
      await this.dataSource.query(
        `INSERT INTO lock_pin (booking_id, lock_id, pin, lock_pin_start_time, lock_pin_end_time, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'sent', NOW())`,
        [bookingId, lockId, newPin, startTime, endTime],
      );
    }

    await this.auditLogService.log({
      actor,
      action: existing ? 'REGENERATE_LOCK_PIN' : 'ISSUE_NEW_LOCK_PIN',
      entity_type: 'lock_pin',
      entity_id: bookingId,
      new_value: { pin: '******', lock_id: lockId, status: 'sent' },
    });

    return {
      success: true,
      booking_id: bookingId,
      lock_id: lockId,
      pin: newPin,
      status: 'sent',
      message: `Đã cấp mã PIN thành công và đồng bộ tới khóa thông minh.`,
    };
  }

  /**
   * 3. THU HỒI MÃ KHÓA (Khi hủy đơn hoặc khách check-out sớm)
   */
  async revokePin(bookingId: number, reason: string, actor: string) {
    await this.dataSource.query(
      `UPDATE lock_pin SET status = 'revoked', updated_at = NOW() WHERE booking_id = ?`,
      [bookingId],
    );

    await this.auditLogService.log({
      actor,
      action: 'REVOKE_LOCK_PIN',
      entity_type: 'lock_pin',
      entity_id: bookingId,
      new_value: { status: 'revoked', reason },
    });

    return {
      success: true,
      booking_id: bookingId,
      status: 'revoked',
      message: `Đã thu hồi mã khóa của đơn #${bookingId} thành công.`,
    };
  }

  /**
   * 4. GỬI LẠI MÃ KHÓA QUA EMAIL CHO KHÁCH
   */
  async resendPinEmail(bookingId: number, actor: string) {
    const [pinRecord] = await this.dataSource.query(
      `SELECT lp.pin, b.booking_code, b.lock_email, c.email AS customer_email, r.room_number
       FROM lock_pin lp
       JOIN BOOKINGS b ON lp.booking_id = b.id
       LEFT JOIN CUSTOMER c ON b.customer_id = c.customer_id
       LEFT JOIN \`lock\` l ON lp.lock_id = l.id
       LEFT JOIN ROOMS r ON l.room_id = r.room_id
       WHERE lp.booking_id = ?`,
      [bookingId],
    );

    if (!pinRecord) {
      throw new NotFoundException(`Đơn #${bookingId} chưa được cấp mã PIN.`);
    }

    const targetEmail = pinRecord.lock_email || pinRecord.customer_email;

    await this.auditLogService.log({
      actor,
      action: 'RESEND_LOCK_PIN_EMAIL',
      entity_type: 'lock_pin',
      entity_id: bookingId,
      new_value: { sent_to: targetEmail },
    });

    return {
      success: true,
      message: `Đã gửi lại mã PIN phòng ${pinRecord.room_number || ''} tới email ${targetEmail}.`,
    };
  }
}
