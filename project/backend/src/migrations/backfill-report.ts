import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export interface BackfillReport {
  totalRoomTypesProcessed: number;
  roomTypesClonedCount: number;
  clonedRoomTypeDetails: Array<{
    originalRoomTypeId: number;
    newRoomTypeId: number;
    roomTypeName: string;
    targetApartmentId: number;
    affectedRoomsCount: number;
    affectedBookingRoomsCount: number;
  }>;
  roomsUpdatedCount: number;
  bookingsApartmentIdUpdatedCount: number;
  executionTimestamp: string;
}

/**
 * Thực hiện logic backfill tách room_types dùng chung nhiều chi nhánh & suy ra BOOKINGS.apartment_id
 * và in ra bản báo cáo chi tiết các dòng bị ảnh hưởng.
 */
export async function runBackfillWithReport(dataSource: DataSource): Promise<BackfillReport> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  const report: BackfillReport = {
    totalRoomTypesProcessed: 0,
    roomTypesClonedCount: 0,
    clonedRoomTypeDetails: [],
    roomsUpdatedCount: 0,
    bookingsApartmentIdUpdatedCount: 0,
    executionTimestamp: new Date().toISOString(),
  };

  try {
    // 1. Tìm các room_types đang được phòng của nhiều chi nhánh dùng chung
    const sharedTypes = await queryRunner.query(`
      SELECT room_type_id, COUNT(DISTINCT apartment_id) AS apt_count
      FROM ROOMS
      GROUP BY room_type_id
      HAVING apt_count > 1
    `);

    // 2. Với các room_types chỉ thuộc 1 chi nhánh: Gán trực tiếp apartment_id
    const singleTypes = await queryRunner.query(`
      SELECT room_type_id, MIN(apartment_id) AS single_apt_id
      FROM ROOMS
      GROUP BY room_type_id
      HAVING COUNT(DISTINCT apartment_id) = 1
    `);

    for (const st of singleTypes) {
      await queryRunner.query(
        `UPDATE room_types SET apartment_id = ? WHERE id = ? AND apartment_id IS NULL`,
        [st.single_apt_id, st.room_type_id],
      );
      report.totalRoomTypesProcessed++;
    }

    // 3. Xử lý các room_types bị dùng chung qua nhiều chi nhánh:
    // Giữ bản gốc cho chi nhánh đầu tiên, nhân bản (clone) cho các chi nhánh tiếp theo
    for (const item of sharedTypes) {
      const origTypeId = Number(item.room_type_id);
      const [origType] = await queryRunner.query(
        `SELECT * FROM room_types WHERE id = ?`,
        [origTypeId],
      );

      if (!origType) continue;

      // Danh sách các chi nhánh đang dùng room_type này
      const aptRows = await queryRunner.query(
        `SELECT DISTINCT apartment_id FROM ROOMS WHERE room_type_id = ? ORDER BY apartment_id ASC`,
        [origTypeId],
      );

      // Chi nhánh đầu tiên giữ lại bản ghi gốc
      const primaryAptId = Number(aptRows[0].apartment_id);
      await queryRunner.query(
        `UPDATE room_types SET apartment_id = ? WHERE id = ?`,
        [primaryAptId, origTypeId],
      );
      report.totalRoomTypesProcessed++;

      // Các chi nhánh thứ 2 trở đi: Tạo bản sao riêng biệt
      for (let i = 1; i < aptRows.length; i++) {
        const secondaryAptId = Number(aptRows[i].apartment_id);

        // Tạo bản ghi room_types mới sao chép cấu hình
        const insertRes = await queryRunner.query(
          `INSERT INTO room_types (name, base_price, max_occupancy, apartment_id, description, bed_config, area, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            origType.name,
            origType.base_price,
            origType.max_occupancy,
            secondaryAptId,
            origType.description || '',
            origType.bed_config || '1 giường đôi',
            origType.area || 28,
            origType.is_active !== undefined ? origType.is_active : 1,
          ],
        );
        const newTypeId = insertRes.insertId;

        // Sao chép ảnh ROOM_IMAGES sang loại phòng mới
        await queryRunner.query(
          `INSERT INTO ROOM_IMAGES (room_types_id, image_url)
           SELECT ?, image_url FROM ROOM_IMAGES WHERE room_types_id = ?`,
          [newTypeId, origTypeId],
        );

        // Sao chép tiện ích ROOM_AMENITIES sang loại phòng mới
        await queryRunner.query(
          `INSERT INTO ROOM_AMENITIES (room_types_id, amenity_id)
           SELECT ?, amenity_id FROM ROOM_AMENITIES WHERE room_types_id = ?`,
          [newTypeId, origTypeId],
        );

        // Cập nhật lại ROOMS ở chi nhánh này trỏ sang loại phòng mới
        const updateRoomsRes = await queryRunner.query(
          `UPDATE ROOMS SET room_type_id = ? WHERE room_type_id = ? AND apartment_id = ?`,
          [newTypeId, origTypeId, secondaryAptId],
        );
        const affectedRooms = updateRoomsRes.affectedRows || 0;
        report.roomsUpdatedCount += affectedRooms;

        // Cập nhật lại Booking_rooms cho các phòng thuộc chi nhánh này
        const updateBrRes = await queryRunner.query(
          `UPDATE Booking_rooms br
           JOIN ROOMS r ON r.room_id = br.room_id
           SET br.room_types_id = ?
           WHERE br.room_types_id = ? AND r.apartment_id = ?`,
          [newTypeId, origTypeId, secondaryAptId],
        );
        const affectedBookingRooms = updateBrRes.affectedRows || 0;

        report.roomTypesClonedCount++;
        report.clonedRoomTypeDetails.push({
          originalRoomTypeId: origTypeId,
          newRoomTypeId: newTypeId,
          roomTypeName: origType.name,
          targetApartmentId: secondaryAptId,
          affectedRoomsCount: affectedRooms,
          affectedBookingRoomsCount: affectedBookingRooms,
        });
      }
    }

    // Gán mặc định chi nhánh 1 cho bất kỳ room_types nào chưa có phòng
    await queryRunner.query(`UPDATE room_types SET apartment_id = 1 WHERE apartment_id IS NULL`);

    // 4. Backfill BOOKINGS.apartment_id từ Booking_rooms -> ROOMS.apartment_id hoặc room_types.apartment_id
    const updateBookingsRes = await queryRunner.query(`
      UPDATE BOOKINGS b
      JOIN (
        SELECT br.bookings_id, 
               COALESCE(r.apartment_id, rt.apartment_id, 1) AS derived_apartment_id
        FROM Booking_rooms br
        LEFT JOIN ROOMS r ON r.room_id = br.room_id
        LEFT JOIN room_types rt ON rt.id = br.room_types_id
        GROUP BY br.bookings_id
      ) derived ON derived.bookings_id = b.id
      SET b.apartment_id = derived.derived_apartment_id
      WHERE b.apartment_id IS NULL;
    `);
    report.bookingsApartmentIdUpdatedCount = updateBookingsRes.affectedRows || 0;

    // Fallback cho bất kỳ booking nào không có Booking_rooms
    await queryRunner.query(`UPDATE BOOKINGS SET apartment_id = 1 WHERE apartment_id IS NULL`);

    await queryRunner.commitTransaction();
    return report;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
