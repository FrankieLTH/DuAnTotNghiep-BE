import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SearchCriteria, AvailableRoomType, computeStayWindow } from '@shared/recommendation';

@Injectable()
export class AvailabilityService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Tính toán danh sách loại phòng trống cho khung giờ & tiêu chí tìm kiếm
   * 1 query tổng hợp: COUNT(rooms status ≠ 'maintenance') − COUNT(booking chiếm trùng)
   * HAVING availableCount > 0
   */
  async getAvailableRoomTypes(criteria: SearchCriteria): Promise<AvailableRoomType[]> {
    const { startAt, endAt } = computeStayWindow(
      criteria.checkIn,
      criteria.checkOut,
      criteria.stayType
    );

    const queryParams: any[] = [endAt, startAt, endAt, startAt, endAt, startAt];
    let aptFilter = '';
    if (criteria.apartmentId && Number(criteria.apartmentId) > 0) {
      aptFilter = 'AND (r.apartment_id = ? OR rt.apartment_id = ?)';
      queryParams.push(Number(criteria.apartmentId), Number(criteria.apartmentId));
    }

    const sql = `
      SELECT
        rt.id AS roomTypeId,
        rt.parent_id AS parentId,
        COALESCE(r.apartment_id, rt.apartment_id) AS apartmentId,
        apt.name AS apartmentName,
        rt.name AS name,
        rt.max_occupancy AS maxOccupancy,
        CAST(rt.base_price AS DECIMAL(12, 2)) AS basePrice,
        COALESCE(rt.area, 28) AS area,
        COALESCE(rt.bed_config, '1 giường đôi') AS bedConfig,
        (
          SELECT COALESCE(
            (SELECT ri.image_url FROM ROOM_IMAGES ri WHERE ri.room_types_id = rt.id LIMIT 1),
            (SELECT ri2.image_url FROM ROOM_IMAGES ri2 JOIN ROOMS r2 ON ri2.room_id = r2.room_id WHERE r2.room_type_id = rt.id LIMIT 1),
            'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'
          )
        ) AS image,
        GROUP_CONCAT(DISTINCT CASE WHEN occ_room.room_id IS NULL THEN r.room_id ELSE NULL END) AS roomIdsStr,
        COUNT(DISTINCT CASE WHEN occ_room.room_id IS NULL THEN r.room_id ELSE NULL END) AS availableCount
      FROM room_types rt
      JOIN ROOMS r ON r.room_type_id = rt.id 
        AND r.is_hidden = 0 
        AND r.deleted_at IS NULL
        AND r.status = 'available'
        AND NOT EXISTS (
          SELECT 1 FROM room_blocks rb 
          WHERE rb.room_id = r.room_id 
            AND rb.from_at < ? 
            AND (rb.to_at IS NULL OR rb.to_at > ?)
        )
      JOIN APARTMENT apt ON COALESCE(r.apartment_id, rt.apartment_id) = apt.id
      LEFT JOIN (
        SELECT DISTINCT COALESCE(br.room_id, b.room_id) AS room_id
        FROM BOOKINGS b
        LEFT JOIN Booking_rooms br ON br.bookings_id = b.id
        WHERE b.booking_status IN ('confirmed', 'checked_in', 'pending_payment', 'draft')
          AND (b.booking_status NOT IN ('pending_payment', 'draft') OR b.hold_expires_at > NOW() OR b.hold_expires_at IS NULL)
          AND (
            (b.start_at IS NOT NULL AND b.start_at < ? AND b.end_at > ?)
            OR (b.booked_start_time < ? AND b.booked_end_time > ?)
          )
          AND COALESCE(br.room_id, b.room_id) IS NOT NULL
      ) occ_room ON occ_room.room_id = r.room_id
      WHERE rt.is_active = 1
        ${aptFilter}
      GROUP BY rt.id, COALESCE(r.apartment_id, rt.apartment_id), apt.name
      HAVING availableCount > 0
      ORDER BY basePrice ASC
    `;

    const rows = await this.dataSource.query(sql, queryParams);

    return rows.map((r: any) => ({
      roomTypeId: Number(r.roomTypeId),
      parentId: r.parentId !== null && r.parentId !== undefined ? Number(r.parentId) : null,
      variantKey: `rt-${r.roomTypeId}-${r.apartmentId}`,
      variantLabel: String(r.name),
      roomIds: r.roomIdsStr ? String(r.roomIdsStr).split(',').map(Number) : [],
      apartmentId: Number(r.apartmentId),
      apartmentName: String(r.apartmentName),
      name: String(r.name),
      maxOccupancy: Number(r.maxOccupancy),
      basePrice: Number(r.basePrice),
      availableCount: Math.max(0, Number(r.availableCount)),
      area: Number(r.area),
      bedConfig: String(r.bedConfig),
      image: String(r.image),
      features: [],
      featurePricePerNight: 0,
    }));
  }
}
