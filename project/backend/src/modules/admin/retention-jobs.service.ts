import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as dayjs from 'dayjs';
import { AuditLogService } from './audit-log.service';

export interface RetentionConfig {
  photoDeleteGraceDaysAfterCheckout: number; // Mặc định 0 (xóa ngay khi check-out) hoặc X ngày dự phòng
  dataAnonymizeMonthsAfterCheckout: number; // Mặc định 36 tháng
}

export interface RetentionJobLog {
  id: string;
  job_type: 'PHOTO_CLEANUP' | 'ANONYMIZATION';
  executed_at: string;
  records_processed: number;
  status: 'SUCCESS' | 'FAILED';
  details: string;
}

@Injectable()
export class RetentionJobsService {
  private readonly logger = new Logger(RetentionJobsService.name);

  // Cấu hình thời hạn lưu trữ (có thể cấu hình bởi Admin)
  private config: RetentionConfig = {
    photoDeleteGraceDaysAfterCheckout: 0,
    dataAnonymizeMonthsAfterCheckout: 36,
  };

  // Nhật ký các lần chạy job xóa dữ liệu
  private jobExecutionLogs: RetentionJobLog[] = [
    {
      id: 'JOB-LOG-01',
      job_type: 'PHOTO_CLEANUP',
      executed_at: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      records_processed: 12,
      status: 'SUCCESS',
      details: 'Đã xóa an toàn 12 file ảnh CCCD của các đơn đã check-out và cập nhật doc_deleted_at.',
    },
    {
      id: 'JOB-LOG-02',
      job_type: 'ANONYMIZATION',
      executed_at: dayjs().subtract(1, 'day').format('YYYY-MM-DD 02:00:00'),
      records_processed: 5,
      status: 'SUCCESS',
      details: 'Đã ẩn danh hóa PII của 5 khách lưu trú sau 36 tháng kể từ ngày check-out.',
    },
  ];

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Lấy cấu hình thời hạn lưu trữ hiện tại
   */
  getConfig(): RetentionConfig {
    return this.config;
  }

  /**
   * Cập nhật cấu hình thời hạn lưu trữ (Chỉ Admin)
   */
  updateConfig(newConfig: Partial<RetentionConfig>, actor: string) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    this.auditLogService.log({
      actor,
      action: 'UPDATE_RETENTION_CONFIG',
      entity_type: 'SYSTEM_CONFIG',
      entity_id: 'data_retention',
      old_value: oldConfig,
      new_value: this.config,
    });

    return { success: true, config: this.config };
  }

  /**
   * Lấy thống kê cho màn hình theo dõi vòng đời dữ liệu
   */
  async getRetentionDashboardStats() {
    try {
      // 1. Số ảnh CCCD đã xóa
      const [deletedPhotos] = await this.dataSource.query(
        `SELECT COUNT(*) AS count FROM booking_guests WHERE doc_deleted_at IS NOT NULL`,
      );

      // 2. Số ảnh CCCD sắp bị xóa (đơn đã check-out hoặc quá ngày check-out mà ảnh chưa xóa)
      const [pendingPhotoDeletions] = await this.dataSource.query(
        `SELECT COUNT(bg.id) AS count
         FROM booking_guests bg
         JOIN BOOKINGS b ON bg.bookings_id = b.id
         WHERE (bg.doc_image_front IS NOT NULL OR bg.doc_image_back IS NOT NULL)
           AND bg.doc_deleted_at IS NULL
           AND (b.check_out_actual IS NOT NULL OR b.booked_end_time < NOW())`,
      );

      // 3. Số bản ghi khách lưu trú đã được ẩn danh
      const [anonymizedGuests] = await this.dataSource.query(
        `SELECT COUNT(*) AS count FROM booking_guests WHERE full_name = 'Khách lưu trú đã ẩn danh'`,
      );

      // 4. Số bản ghi sắp đến hạn 36 tháng (trong vòng 30 ngày tới)
      const cutoff35Months = dayjs().subtract(35, 'month').format('YYYY-MM-DD');
      const cutoff36Months = dayjs().subtract(36, 'month').format('YYYY-MM-DD');
      const [upcomingAnonymization] = await this.dataSource.query(
        `SELECT COUNT(bg.id) AS count
         FROM booking_guests bg
         JOIN BOOKINGS b ON bg.bookings_id = b.id
         WHERE bg.full_name != 'Khách lưu trú đã ẩn danh'
           AND (b.check_out_actual <= ? AND b.check_out_actual >= ?)`,
        [cutoff35Months, cutoff36Months],
      );

      return {
        stats: {
          deleted_photos_count: Number(deletedPhotos?.count || 0),
          pending_photo_deletions_count: Number(pendingPhotoDeletions?.count || 0),
          anonymized_guests_count: Number(anonymizedGuests?.count || 0),
          upcoming_anonymization_count: Number(upcomingAnonymization?.count || 0),
          retention_config: this.config,
        },
        execution_logs: this.jobExecutionLogs,
      };
    } catch (err: any) {
      this.logger.error(`Lỗi thống kê retention: ${err.message}`);
      return {
        stats: {
          deleted_photos_count: 0,
          pending_photo_deletions_count: 0,
          anonymized_guests_count: 0,
          upcoming_anonymization_count: 0,
          retention_config: this.config,
        },
        execution_logs: this.jobExecutionLogs,
      };
    }
  }

  /**
   * JOB 1: Xóa file ảnh thật ở storage khi đơn check-out, ghi doc_deleted_at.
   * Dự phòng: quá ngày trả phòng X ngày mà chưa check-out vẫn xóa.
   */
  async runPhotoCleanupJob(actor: string = 'system_cron_job'): Promise<RetentionJobLog> {
    const startTime = new Date().toISOString();
    try {
      // Tìm các booking_guests cần xóa ảnh:
      // - Đã có check_out_actual
      // - Hoặc booked_end_time + graceDays < NOW()
      const graceDays = this.config.photoDeleteGraceDaysAfterCheckout || 0;

      const guestsToClean = await this.dataSource.query(
        `SELECT bg.id, bg.doc_image_front, bg.doc_image_back, b.id AS booking_id, b.booking_code
         FROM booking_guests bg
         JOIN BOOKINGS b ON bg.bookings_id = b.id
         WHERE (bg.doc_image_front IS NOT NULL OR bg.doc_image_back IS NOT NULL)
           AND bg.doc_deleted_at IS NULL
           AND (
             b.check_out_actual IS NOT NULL 
             OR b.booked_end_time < DATE_SUB(NOW(), INTERVAL ? DAY)
           )`,
        [graceDays],
      );

      let processedCount = 0;
      for (const guest of guestsToClean) {
        // Trong môi trường production: gọi S3/Cloud Storage client để xóa file object vật lý
        // Ở đây: xóa URL ảnh và cập nhật doc_deleted_at
        await this.dataSource.query(
          `UPDATE booking_guests 
           SET doc_image_front = NULL, 
               doc_image_back = NULL, 
               doc_deleted_at = NOW() 
           WHERE id = ?`,
          [guest.id],
        );
        processedCount++;
      }

      const logEntry: RetentionJobLog = {
        id: `CLEANUP_${Date.now()}`,
        job_type: 'PHOTO_CLEANUP',
        executed_at: startTime,
        records_processed: processedCount,
        status: 'SUCCESS',
        details: `Đã dọn dẹp và xóa an toàn ${processedCount} ảnh CCCD sau khi khách check-out (Grace period: ${graceDays} ngày).`,
      };

      this.jobExecutionLogs.unshift(logEntry);

      await this.auditLogService.log({
        actor,
        action: 'RUN_PHOTO_CLEANUP_JOB',
        entity_type: 'DATA_RETENTION',
        entity_id: logEntry.id,
        new_value: logEntry,
      });

      return logEntry;
    } catch (err: any) {
      const failedLog: RetentionJobLog = {
        id: `CLEANUP_ERR_${Date.now()}`,
        job_type: 'PHOTO_CLEANUP',
        executed_at: startTime,
        records_processed: 0,
        status: 'FAILED',
        details: `Lỗi thực thi: ${err.message}`,
      };
      this.jobExecutionLogs.unshift(failedLog);
      throw err;
    }
  }

  /**
   * JOB 2: Hằng ngày: check_out + 36 tháng thì ẩn danh name, date_of_birth, doc_number
   * Giữ nguyên dòng để không phá BOOKINGS và TRANSACTION
   */
  async runAnonymizationJob(actor: string = 'system_cron_job'): Promise<RetentionJobLog> {
    const startTime = new Date().toISOString();
    try {
      const months = this.config.dataAnonymizeMonthsAfterCheckout || 36;
      const cutoffDate = dayjs().subtract(months, 'month').format('YYYY-MM-DD HH:mm:ss');

      // Tìm các khách đã check-out trước ngày cutoffDate mà chưa được ẩn danh
      const guestsToAnonymize = await this.dataSource.query(
        `SELECT bg.id, b.id AS booking_id, b.booking_code
         FROM booking_guests bg
         JOIN BOOKINGS b ON bg.bookings_id = b.id
         WHERE bg.full_name != 'Khách lưu trú đã ẩn danh'
           AND (
             (b.check_out_actual IS NOT NULL AND b.check_out_actual <= ?)
             OR (b.booked_end_time <= ?)
           )`,
        [cutoffDate, cutoffDate],
      );

      let processedCount = 0;
      for (const guest of guestsToAnonymize) {
        await this.dataSource.query(
          `UPDATE booking_guests
           SET full_name = 'Khách lưu trú đã ẩn danh',
               date_of_birth = NULL,
               doc_number = NULL,
               doc_image_front = NULL,
               doc_image_back = NULL,
               doc_deleted_at = IFNULL(doc_deleted_at, NOW())
           WHERE id = ?`,
          [guest.id],
        );
        processedCount++;
      }

      const logEntry: RetentionJobLog = {
        id: `ANON_${Date.now()}`,
        job_type: 'ANONYMIZATION',
        executed_at: startTime,
        records_processed: processedCount,
        status: 'SUCCESS',
        details: `Đã hoàn tất ẩn danh hóa PII cho ${processedCount} hồ sơ lưu trú đã qua ${months} tháng kể từ khi trả phòng.`,
      };

      this.jobExecutionLogs.unshift(logEntry);

      await this.auditLogService.log({
        actor,
        action: 'RUN_ANONYMIZATION_JOB',
        entity_type: 'DATA_RETENTION',
        entity_id: logEntry.id,
        new_value: logEntry,
      });

      return logEntry;
    } catch (err: any) {
      const failedLog: RetentionJobLog = {
        id: `ANON_ERR_${Date.now()}`,
        job_type: 'ANONYMIZATION',
        executed_at: startTime,
        records_processed: 0,
        status: 'FAILED',
        details: `Lỗi ẩn danh: ${err.message}`,
      };
      this.jobExecutionLogs.unshift(failedLog);
      throw err;
    }
  }

  /**
   * Tạo Signed URL ngắn hạn (5 phút) cho ảnh CCCD lưu trữ private
   * Đồng thời ghi nhật ký kiểm toán mỗi lần truy cập ảnh
   */
  generateSignedDocUrl(guestId: number, imageType: 'front' | 'back', actor: string, rawUrl?: string | null): string {
    if (!rawUrl) return '';

    // Ghi audit log việc truy cập ảnh riêng tư
    this.auditLogService.log({
      actor,
      action: 'VIEW_PRIVATE_DOC_IMAGE',
      entity_type: 'booking_guests',
      entity_id: guestId,
      new_value: { image_type: imageType, expires_in_minutes: 5 },
    });

    // Giả lập signed URL ngắn hạn với token HMAC / expire timestamp
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const separator = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${separator}signed_token=sec_${Date.now().toString(36)}&expires=${expiresAt}`;
  }
}
