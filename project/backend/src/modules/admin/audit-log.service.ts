import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface AuditLogDto {
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string | number;
  old_value?: any;
  new_value?: any;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Ghi nhận lịch sử kiểm toán vào bảng Audit_logs (hoặc audit_logs)
   */
  async log(dto: AuditLogDto): Promise<void> {
    try {
      const oldValueStr = dto.old_value !== undefined ? (typeof dto.old_value === 'string' ? dto.old_value : JSON.stringify(dto.old_value)) : null;
      const newValueStr = dto.new_value !== undefined ? (typeof dto.new_value === 'string' ? dto.new_value : JSON.stringify(dto.new_value)) : null;

      await this.dataSource.query(
        `INSERT INTO audit_logs (actor, action, entity_type, entity_id, old_value, new_value, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          dto.actor || 'system',
          dto.action,
          dto.entity_type,
          String(dto.entity_id),
          oldValueStr,
          newValueStr,
        ],
      );
    } catch (err: any) {
      // Dự phòng nếu tên bảng là viết hoa Audit_logs
      try {
        const oldValueStr = dto.old_value !== undefined ? (typeof dto.old_value === 'string' ? dto.old_value : JSON.stringify(dto.old_value)) : null;
        const newValueStr = dto.new_value !== undefined ? (typeof dto.new_value === 'string' ? dto.new_value : JSON.stringify(dto.new_value)) : null;

        await this.dataSource.query(
          `INSERT INTO Audit_logs (actor, action, entity_type, entity_id, old_value, new_value, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            dto.actor || 'system',
            dto.action,
            dto.entity_type,
            String(dto.entity_id),
            oldValueStr,
            newValueStr,
          ],
        );
      } catch (innerErr: any) {
        this.logger.error(`Failed to write audit log: ${err.message}`, err.stack);
      }
    }
  }

  /**
   * Tra cứu danh sách nhật ký kiểm toán kèm bộ lọc
   */
  async queryLogs(filters: {
    actor?: string;
    entity_type?: string;
    action?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }) {
    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params: any[] = [];

    if (filters.actor) {
      sql += ` AND actor LIKE ?`;
      params.push(`%${filters.actor}%`);
    }
    if (filters.entity_type) {
      sql += ` AND entity_type = ?`;
      params.push(filters.entity_type);
    }
    if (filters.action) {
      sql += ` AND action LIKE ?`;
      params.push(`%${filters.action}%`);
    }
    if (filters.from_date) {
      sql += ` AND created_at >= ?`;
      params.push(filters.from_date);
    }
    if (filters.to_date) {
      sql += ` AND created_at <= ?`;
      params.push(filters.to_date);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(filters.limit || 50), Number(filters.offset || 0));

    try {
      return await this.dataSource.query(sql, params);
    } catch (err) {
      // Thử lại với bảng hoa Audit_logs nếu bảng thường chưa có
      const fallbackSql = sql.replace('audit_logs', 'Audit_logs');
      return await this.dataSource.query(fallbackSql, params);
    }
  }
}
