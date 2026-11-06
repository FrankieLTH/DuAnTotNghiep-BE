// ============================================================================
// BOOKING STATE MACHINE SERVICE
// Pessimistic Locking (SELECT ... FOR UPDATE), 409 Conflict Guard, Audit_logs
// ============================================================================

import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { BookingStatus, isValidStatusTransition, REALTIME_EVENTS } from '@shared/index';
import { AuditLogService } from './audit-log.service';
import { RealtimeSyncService } from './realtime-sync.service';

export interface StateTransitionResult {
  bookingId: number;
  oldStatus: BookingStatus;
  newStatus: BookingStatus;
  success: boolean;
}

@Injectable()
export class BookingStateMachineService {
  private readonly logger = new Logger(BookingStateMachineService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
    private readonly realtimeSyncService: RealtimeSyncService,
  ) {}

  /**
   * Chuyển trạng thái đơn với Transaction, Khóa dòng (FOR UPDATE) và bảo vệ State Machine.
   * Chuyển sai quy tắc trả HTTP 409 Conflict.
   */
  async transitionStatus(
    bookingId: number,
    targetStatus: BookingStatus,
    actor: string,
    options?: {
      actorId?: number;
      actionReason?: string;
      customData?: Record<string, any>;
      existingQueryRunner?: QueryRunner;
    }
  ): Promise<StateTransitionResult> {
    const isExternalRunner = !!options?.existingQueryRunner;
    const queryRunner = options?.existingQueryRunner || this.dataSource.createQueryRunner();

    if (!isExternalRunner) {
      await queryRunner.connect();
      await queryRunner.startTransaction();
    }

    try {
      // 1. Khóa dòng đơn hàng (Pessimistic Row Lock)
      const [booking] = await queryRunner.query(
        `SELECT id, booking_code, booking_status, apartment_id, customer_id 
         FROM BOOKINGS 
         WHERE id = ? 
         FOR UPDATE`,
        [bookingId]
      );

      if (!booking) {
        throw new NotFoundException(`Không tìm thấy đơn đặt phòng #${bookingId}`);
      }

      const currentStatus = booking.booking_status as BookingStatus;

      // 2. Kiểm tra tính hợp lệ của State Transition
      if (!isValidStatusTransition(currentStatus, targetStatus)) {
        throw new ConflictException(
          `Trạng thái chuyển đổi không hợp lệ từ '${currentStatus}' sang '${targetStatus}'. Trạng thái này bị từ chối theo quy tắc State Machine.`
        );
      }

      // Nếu trạng thái đã là targetStatus thì trả về idempotent
      if (currentStatus === targetStatus) {
        if (!isExternalRunner) {
          await queryRunner.commitTransaction();
        }
        return {
          bookingId,
          oldStatus: currentStatus,
          newStatus: targetStatus,
          success: true,
        };
      }

      // 3. Cập nhật trạng thái trong Transaction
      await queryRunner.query(
        `UPDATE BOOKINGS 
         SET booking_status = ?, updated_at = NOW() 
         WHERE id = ?`,
        [targetStatus, bookingId]
      );

      // 4. Tự động ghi nhật ký Audit_logs
      await this.auditLogService.log({
        actor,
        action: `TRANSITION_${currentStatus.toUpperCase()}_TO_${targetStatus.toUpperCase()}`,
        entity_type: 'BOOKINGS',
        entity_id: bookingId,
        old_value: { booking_status: currentStatus },
        new_value: {
          booking_status: targetStatus,
          reason: options?.actionReason,
          ...options?.customData,
        },
      });

      if (!isExternalRunner) {
        await queryRunner.commitTransaction();
      }

      // 5. Phát sự kiện Realtime Sync sau khi commit (Zero PII payload)
      this.realtimeSyncService.emitPostCommit(REALTIME_EVENTS.BOOKING_UPDATED, bookingId, {
        apartment_id: booking.apartment_id,
        customer_id: booking.customer_id,
      });

      // Nếu chuyển sang trạng thái thay đổi tính khả dụng của phòng -> thông báo cập nhật lịch
      if (
        targetStatus === BookingStatus.CONFIRMED ||
        targetStatus === BookingStatus.CANCELLED ||
        targetStatus === BookingStatus.EXPIRED ||
        targetStatus === BookingStatus.CHECKED_OUT
      ) {
        this.realtimeSyncService.emitPostCommit(REALTIME_EVENTS.AVAILABILITY_CHANGED, booking.apartment_id, {
          apartment_id: booking.apartment_id,
        });
      }

      return {
        bookingId,
        oldStatus: currentStatus,
        newStatus: targetStatus,
        success: true,
      };
    } catch (err) {
      if (!isExternalRunner) {
        await queryRunner.rollbackTransaction();
      }
      this.logger.error(`Lỗi chuyển trạng thái đơn #${bookingId} sang ${targetStatus}: ${err.message}`);
      throw err;
    } finally {
      if (!isExternalRunner) {
        await queryRunner.release();
      }
    }
  }
}
