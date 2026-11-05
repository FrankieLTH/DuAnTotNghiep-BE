import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as dayjs from 'dayjs';
import { AuditLogService } from './audit-log.service';

export interface EmergencyAlert {
  id: string;
  booking_id: number;
  booking_code?: string;
  room_types_id: number;
  room_type_name?: string;
  previous_room_id: number;
  reason: string;
  created_at: string;
  severity: 'URGENT' | 'HIGH';
}

@Injectable()
export class AutoRoomAssignmentService {
  private readonly logger = new Logger(AutoRoomAssignmentService.name);
  // Lưu danh sách cảnh báo khẩn cấp trong bộ nhớ & DB
  private emergencyAlerts: EmergencyAlert[] = [];

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * 1. TỰ ĐỘNG GÁN PHÒNG KHI THANH TOÁN THÀNH CÔNG (Transaction + FOR UPDATE)
   * Tuyệt đối không cho phép gán/đổi phòng thủ công từ giao diện
   */
  async assignRoomsOnPaymentSuccess(bookingId: number, actor: string = 'system_payment_webhook') {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Lấy thông tin đơn đặt phòng và khóa dòng
      const [booking] = await queryRunner.query(
        `SELECT id, booking_code, booking_type, booked_start_time, booked_end_time, 
                booking_status, verification_status, customer_id
         FROM BOOKINGS WHERE id = ? FOR UPDATE`,
        [bookingId],
      );

      if (!booking) {
        throw new BadRequestException(`Không tìm thấy đơn đặt phòng #${bookingId}`);
      }

      if (booking.booking_status === 'confirmed') {
        await queryRunner.commitTransaction();
        return { message: 'Đơn hàng đã được gán phòng và xác nhận trước đó', booking_id: bookingId };
      }

      // 2. Lấy danh sách Booking_rooms cần gán phòng
      const bookingRooms = await queryRunner.query(
        `SELECT id, room_types_id, room_id FROM Booking_rooms WHERE bookings_id = ?`,
        [bookingId],
      );

      if (!bookingRooms || bookingRooms.length === 0) {
        throw new BadRequestException(`Đơn #${bookingId} chưa có danh sách phòng yêu cầu (Booking_rooms trống)`);
      }

      const assignedRooms: Array<{ booking_room_id: number; room_types_id: number; room_id: number; room_number: string }> = [];

      // 3. Với mỗi slot phòng cần đặt, tìm 1 phòng cụ thể còn trống và khóa dòng
      for (const br of bookingRooms) {
        // Tìm phòng trống của loại phòng này, không bị trùng khung giờ bởi đơn khác
        const vacantRooms = await queryRunner.query(
          `SELECT r.id, r.room_number, r.status
           FROM rooms r
           WHERE r.room_types_id = ?
             AND r.status = 'available'
             AND r.id NOT IN (
               SELECT DISTINCT br2.room_id
               FROM Booking_rooms br2
               JOIN BOOKINGS b2 ON br2.bookings_id = b2.id
               WHERE br2.room_id IS NOT NULL
                 AND b2.id != ?
                 AND b2.booking_status NOT IN ('cancelled', 'expired', 'rejected')
                 AND (b2.booked_start_time < ? AND b2.booked_end_time > ?)
             )
           ORDER BY r.id ASC
           LIMIT 1
           FOR UPDATE`,
          [br.room_types_id, bookingId, booking.booked_end_time, booking.booked_start_time],
        );

        if (!vacantRooms || vacantRooms.length === 0) {
          throw new ConflictException(
            `Hết phòng trống thuộc loại phòng #${br.room_types_id} trong khung giờ ${booking.booked_start_time} - ${booking.booked_end_time}`,
          );
        }

        const chosenRoom = vacantRooms[0];

        // Gán room_id vào Booking_rooms
        await queryRunner.query(
          `UPDATE Booking_rooms SET room_id = ? WHERE id = ?`,
          [chosenRoom.id, br.id],
        );

        assignedRooms.push({
          booking_room_id: br.id,
          room_types_id: br.room_types_id,
          room_id: chosenRoom.id,
          room_number: chosenRoom.room_number,
        });
      }

      // 4. Cập nhật trạng thái đơn thành confirmed (thành công)
      await queryRunner.query(
        `UPDATE BOOKINGS SET booking_status = 'confirmed', updated_at = NOW() WHERE id = ?`,
        [bookingId],
      );

      // 5. Ghi nhật ký kiểm toán
      await this.auditLogService.log({
        actor,
        action: 'AUTO_ASSIGN_ROOMS_SUCCESS',
        entity_type: 'BOOKINGS',
        entity_id: bookingId,
        old_value: { booking_status: booking.booking_status },
        new_value: { booking_status: 'confirmed', assigned_rooms: assignedRooms },
      });

      await queryRunner.commitTransaction();

      this.logger.log(`Tự động gán phòng thành công cho đơn #${bookingId}: ${JSON.stringify(assignedRooms)}`);

      return {
        success: true,
        booking_id: bookingId,
        status: 'confirmed',
        assigned_rooms: assignedRooms,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Lỗi tự động gán phòng cho đơn #${bookingId}: ${err.message}`, err.stack);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 2. TỰ ĐỘNG GÁN LẠI PHÒNG KHI PHÒNG CHUYỂN SANG BẢO TRÌ
   * Quy tắc: Nếu phòng đã gán chuyển sang bảo trì, hệ thống tự gán lại phòng khác cùng loại còn trống,
   * cập nhật lock_pin. Không còn phòng để gán -> gửi cảnh báo khẩn cho admin và manager.
   */
  async handleRoomMaintenance(roomId: number, actor: string = 'manager_user') {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Cập nhật phòng sang trạng thái maintenance
      await queryRunner.query(`UPDATE rooms SET status = 'maintenance' WHERE id = ?`, [roomId]);

      // 2. Tìm các đơn đặt phòng ĐÃ THANH TOÁN (confirmed, checked_in) hoặc giữ chỗ còn hạn đang chiếm phòng này trong tương lai
      const affectedBookings = await queryRunner.query(
        `SELECT b.id AS booking_id, b.booking_code, b.booking_status, b.booked_start_time, 
                b.booked_end_time, br.id AS booking_room_id, br.room_types_id, r.room_number
         FROM Booking_rooms br
         JOIN BOOKINGS b ON br.bookings_id = b.id
         JOIN rooms r ON br.room_id = r.id
         WHERE br.room_id = ?
           AND b.booking_status IN ('confirmed', 'checked_in')
           AND b.booked_end_time > NOW()
         FOR UPDATE`,
        [roomId],
      );

      const reassignedResults: any[] = [];

      for (const item of affectedBookings) {
        // Tìm phòng khác cùng loại còn trống
        const alternateRooms = await queryRunner.query(
          `SELECT r.id, r.room_number
           FROM rooms r
           WHERE r.room_types_id = ?
             AND r.id != ?
             AND r.status = 'available'
             AND r.id NOT IN (
               SELECT DISTINCT br2.room_id
               FROM Booking_rooms br2
               JOIN BOOKINGS b2 ON br2.bookings_id = b2.id
               WHERE br2.room_id IS NOT NULL
                 AND b2.id != ?
                 AND b2.booking_status NOT IN ('cancelled', 'expired', 'rejected')
                 AND (b2.booked_start_time < ? AND b2.booked_end_time > ?)
             )
           ORDER BY r.id ASC
           LIMIT 1
           FOR UPDATE`,
          [item.room_types_id, roomId, item.booking_id, item.booked_end_time, item.booked_start_time],
        );

        if (alternateRooms && alternateRooms.length > 0) {
          const newRoom = alternateRooms[0];
          // Gán lại phòng
          await queryRunner.query(
            `UPDATE Booking_rooms SET room_id = ? WHERE id = ?`,
            [newRoom.id, item.booking_room_id],
          );

          // Cập nhật lại lock_pin nếu có
          await queryRunner.query(
            `UPDATE lock_pin SET status = 'reassigned', updated_at = NOW() WHERE booking_id = ?`,
            [item.booking_id],
          );

          reassignedResults.push({
            booking_id: item.booking_id,
            booking_code: item.booking_code,
            old_room: item.room_number,
            new_room: newRoom.room_number,
            status: 'REASSIGNED_SUCCESS',
          });

          await this.auditLogService.log({
            actor,
            action: 'AUTO_REASSIGN_MAINTENANCE_ROOM',
            entity_type: 'Booking_rooms',
            entity_id: item.booking_room_id,
            old_value: { room_id: roomId, room_number: item.room_number },
            new_value: { room_id: newRoom.id, room_number: newRoom.room_number },
          });
        } else {
          // KHÔNG CÒN PHÒNG ĐỂ GÁN LẠI -> CẢNH BÁO KHẨN CẤP
          const alertObj: EmergencyAlert = {
            id: `ALERT_${Date.now()}_${item.booking_id}`,
            booking_id: item.booking_id,
            booking_code: item.booking_code,
            room_types_id: item.room_types_id,
            previous_room_id: roomId,
            reason: `Phòng ${item.room_number} bảo trì nhưng KHÔNG CÒN phòng trống cùng loại trong khung giờ ${dayjs(item.booked_start_time).format('DD/MM/YYYY HH:mm')} - ${dayjs(item.booked_end_time).format('DD/MM/YYYY HH:mm')}`,
            created_at: new Date().toISOString(),
            severity: 'URGENT',
          };

          this.emergencyAlerts.unshift(alertObj);

          await this.auditLogService.log({
            actor,
            action: 'EMERGENCY_OVERBOOKING_ALERT',
            entity_type: 'BOOKINGS',
            entity_id: item.booking_id,
            new_value: alertObj,
          });

          reassignedResults.push({
            booking_id: item.booking_id,
            booking_code: item.booking_code,
            status: 'URGENT_NO_ROOM_AVAILABLE',
            alert: alertObj,
          });
        }
      }

      await queryRunner.commitTransaction();

      return {
        room_id: roomId,
        status: 'maintenance',
        affected_count: affectedBookings.length,
        results: reassignedResults,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Lấy danh sách cảnh báo khẩn cấp (cho Admin & Manager)
   */
  getEmergencyAlerts(): EmergencyAlert[] {
    return this.emergencyAlerts;
  }

  /**
   * Xóa / giải quyết cảnh báo
   */
  dismissAlert(alertId: string) {
    this.emergencyAlerts = this.emergencyAlerts.filter((a) => a.id !== alertId);
    return { success: true, alertId };
  }
}
