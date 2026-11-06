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

export interface CreateRoomTypeDto {
  name: string;
  apartment_id: number;
  base_price: number;
  max_occupancy: number;
  description?: string;
  bed_config?: string;
  area?: number;
  is_active?: boolean;
  image_urls?: string[];
  amenity_ids?: number[];
}

export interface UpdateRoomTypeDto {
  name?: string;
  base_price?: number;
  max_occupancy?: number;
  description?: string;
  bed_config?: string;
  area?: number;
  is_active?: boolean;
  image_urls?: string[];
  amenity_ids?: number[];
}

export interface CreateRoomDto {
  apartment_id: number;
  room_type_id: number;
  room_number: string;
  status?: 'available' | 'maintenance';
  lock_id?: number | null;
}

export interface UpdateRoomDto {
  apartment_id?: number;
  room_type_id?: number;
  room_number?: string;
  status?: 'available' | 'maintenance';
  lock_id?: number | null;
}

@Injectable()
export class AdminRoomService {
  private readonly logger = new Logger(AdminRoomService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ==========================================================================
  // A. QUẢN LÝ LOẠI PHÒNG (room_types)
  // ==========================================================================

  /**
   * 1. LẤY DANH SÁCH LOẠI PHÒNG
   * - Admin: Có thể lọc theo apartmentId hoặc xem tất cả.
   * - Manager: Bắt buộc lọc theo chi nhánh của mình.
   */
  async getRoomTypes(apartmentId?: number, staff?: StaffContext) {
    const targetAptId =
      staff?.role === 'manager' ? staff.apartmentId || 1 : apartmentId;

    let sql = `
      SELECT 
        rt.id,
        rt.name,
        rt.apartment_id,
        a.name AS apartment_name,
        rt.base_price,
        rt.max_occupancy,
        rt.description,
        rt.bed_config,
        rt.area,
        rt.is_active,
        rt.created_at,
        COUNT(r.room_id) AS total_rooms,
        SUM(CASE WHEN r.is_hidden = 0 THEN 1 ELSE 0 END) AS active_rooms
      FROM room_types rt
      LEFT JOIN APARTMENT a ON a.id = rt.apartment_id
      LEFT JOIN ROOMS r ON r.room_type_id = rt.id
    `;
    const params: any[] = [];

    if (targetAptId) {
      sql += ` WHERE rt.apartment_id = ?`;
      params.push(targetAptId);
    }

    sql += ` GROUP BY rt.id ORDER BY rt.apartment_id ASC, rt.id ASC`;

    const rows = await this.dataSource.query(sql, params);

    // Lấy kèm ảnh và tiện ích cho từng loại phòng
    for (const row of rows) {
      const images = await this.dataSource.query(
        `SELECT id, image_url FROM ROOM_IMAGES WHERE room_types_id = ?`,
        [row.id],
      );
      const amenities = await this.dataSource.query(
        `SELECT am.id, am.name, am.category
         FROM room_type_amenities ra
         JOIN amenities am ON am.id = ra.amenity_id
         WHERE ra.room_types_id = ?`,
        [row.id],
      );
      row.images = images.map((img: any) => img.image_url);
      row.amenities = amenities;
      row.total_rooms = Number(row.total_rooms || 0);
      row.active_rooms = Number(row.active_rooms || 0);
      row.is_active = Boolean(row.is_active);
    }

    return rows;
  }

  /**
   * 2. CHI TIẾT LOẠI PHÒNG
   */
  async getRoomTypeById(id: number, staff?: StaffContext) {
    const [rt] = await this.dataSource.query(
      `SELECT rt.*, a.name AS apartment_name
       FROM room_types rt
       LEFT JOIN APARTMENT a ON a.id = rt.apartment_id
       WHERE rt.id = ?`,
      [id],
    );
    if (!rt) {
      throw new NotFoundException(`Không tìm thấy loại phòng #${id}`);
    }

    if (staff?.role === 'manager' && staff.apartmentId !== rt.apartment_id) {
      throw new ForbiddenException('Bạn chỉ có quyền xem loại phòng thuộc chi nhánh của mình.');
    }

    const images = await this.dataSource.query(
      `SELECT id, image_url FROM ROOM_IMAGES WHERE room_types_id = ?`,
      [id],
    );
    const amenities = await this.dataSource.query(
      `SELECT am.id, am.name, am.category
       FROM room_type_amenities ra
       JOIN amenities am ON am.id = ra.amenity_id
       WHERE ra.room_types_id = ?`,
      [id],
    );

    return {
      ...rt,
      images: images.map((i: any) => i.image_url),
      amenities,
    };
  }

  /**
   * 3. TẠO LOẠI PHÒNG MỚI (CHỈ ADMIN)
   */
  async createRoomType(dto: CreateRoomTypeDto, actor: string) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Tên loại phòng là bắt buộc.');
    }
    if (!dto.apartment_id) {
      throw new BadRequestException('Chi nhánh (apartment_id) là bắt buộc. Mỗi chi nhánh có loại phòng riêng.');
    }

    const [apartment] = await this.dataSource.query(`SELECT id, name FROM APARTMENT WHERE id = ?`, [
      dto.apartment_id,
    ]);
    if (!apartment) {
      throw new BadRequestException(`Không tìm thấy chi nhánh #${dto.apartment_id}`);
    }

    const res = await this.dataSource.query(
      `INSERT INTO room_types (name, base_price, max_occupancy, apartment_id, description, bed_config, area, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        dto.name.trim(),
        Number(dto.base_price || 0),
        Number(dto.max_occupancy || 2),
        dto.apartment_id,
        dto.description || '',
        dto.bed_config || '1 giường đôi',
        Number(dto.area || 28),
        dto.is_active !== false ? 1 : 0,
      ],
    );

    const newId = res.insertId;

    // Lưu danh sách ảnh nếu có
    if (dto.image_urls && dto.image_urls.length > 0) {
      for (const url of dto.image_urls) {
        if (url && url.trim()) {
          await this.dataSource.query(
            `INSERT INTO ROOM_IMAGES (room_types_id, image_url, created_at) VALUES (?, ?, NOW())`,
            [newId, url.trim()],
          );
        }
      }
    }

    // Lưu tiện ích liên kết nếu có
    if (dto.amenity_ids && dto.amenity_ids.length > 0) {
      for (const amenityId of dto.amenity_ids) {
        await this.dataSource.query(
          `INSERT INTO room_type_amenities (room_types_id, amenity_id) VALUES (?, ?)`,
          [newId, amenityId],
        );
      }
    }

    await this.auditLogService.log({
      actor,
      action: 'CREATE_ROOM_TYPE',
      entity_type: 'room_types',
      entity_id: newId,
      new_value: { id: newId, ...dto },
    });

    return { success: true, id: newId, message: 'Thêm loại phòng mới thành công.' };
  }

  /**
   * 4. CẬP NHẬT LOẠI PHÒNG (CHỈ ADMIN)
   */
  async updateRoomType(id: number, dto: UpdateRoomTypeDto, actor: string) {
    const [rt] = await this.dataSource.query(`SELECT * FROM room_types WHERE id = ?`, [id]);
    if (!rt) {
      throw new NotFoundException(`Không tìm thấy loại phòng #${id}`);
    }

    const updated = {
      name: dto.name !== undefined ? dto.name.trim() : rt.name,
      base_price: dto.base_price !== undefined ? Number(dto.base_price) : rt.base_price,
      max_occupancy: dto.max_occupancy !== undefined ? Number(dto.max_occupancy) : rt.max_occupancy,
      description: dto.description !== undefined ? dto.description : rt.description,
      bed_config: dto.bed_config !== undefined ? dto.bed_config : rt.bed_config,
      area: dto.area !== undefined ? Number(dto.area) : rt.area,
      is_active: dto.is_active !== undefined ? (dto.is_active ? 1 : 0) : rt.is_active,
    };

    await this.dataSource.query(
      `UPDATE room_types 
       SET name = ?, base_price = ?, max_occupancy = ?, description = ?, bed_config = ?, area = ?, is_active = ?
       WHERE id = ?`,
      [
        updated.name,
        updated.base_price,
        updated.max_occupancy,
        updated.description,
        updated.bed_config,
        updated.area,
        updated.is_active,
        id,
      ],
    );

    // Cập nhật lại ảnh nếu truyền
    if (dto.image_urls) {
      await this.dataSource.query(`DELETE FROM ROOM_IMAGES WHERE room_types_id = ?`, [id]);
      for (const url of dto.image_urls) {
        if (url && url.trim()) {
          await this.dataSource.query(
            `INSERT INTO ROOM_IMAGES (room_types_id, image_url, created_at) VALUES (?, ?, NOW())`,
            [id, url.trim()],
          );
        }
      }
    }

    // Cập nhật lại tiện ích nếu truyền
    if (dto.amenity_ids) {
      await this.dataSource.query(`DELETE FROM room_type_amenities WHERE room_types_id = ?`, [id]);
      for (const amenityId of dto.amenity_ids) {
        await this.dataSource.query(
          `INSERT INTO room_type_amenities (room_types_id, amenity_id) VALUES (?, ?)`,
          [id, amenityId],
        );
      }
    }

    await this.auditLogService.log({
      actor,
      action: 'UPDATE_ROOM_TYPE',
      entity_type: 'room_types',
      entity_id: id,
      old_value: rt,
      new_value: updated,
    });

    return { success: true, message: 'Cập nhật loại phòng thành công.' };
  }

  /**
   * 5. ẨN LOẠI PHÒNG (CHỈ ADMIN)
   * - Quy tắc: Không cho ẩn nếu còn phòng đang hoạt động (is_hidden = 0) thuộc loại đó.
   */
  async hideRoomType(id: number, actor: string) {
    const [rt] = await this.dataSource.query(`SELECT * FROM room_types WHERE id = ?`, [id]);
    if (!rt) {
      throw new NotFoundException(`Không tìm thấy loại phòng #${id}`);
    }

    // Kiểm tra các phòng đang hoạt động thuộc loại phòng này
    const activeRooms = await this.dataSource.query(
      `SELECT room_id, room_number, apartment_id FROM ROOMS WHERE room_type_id = ? AND is_hidden = 0`,
      [id],
    );

    if (activeRooms && activeRooms.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: `Không thể ẩn loại phòng "${rt.name}": Hiện còn ${activeRooms.length} phòng đang hoạt động thuộc loại này (${activeRooms.map((r: any) => r.room_number).join(', ')}). Vui lòng ẩn hoặc chuyển đổi các phòng này trước.`,
        error: 'ACTIVE_ROOMS_EXIST',
        active_rooms_count: activeRooms.length,
        active_rooms: activeRooms,
      });
    }

    await this.dataSource.query(`UPDATE room_types SET is_active = 0 WHERE id = ?`, [id]);

    await this.auditLogService.log({
      actor,
      action: 'HIDE_ROOM_TYPE',
      entity_type: 'room_types',
      entity_id: id,
      old_value: { is_active: rt.is_active },
      new_value: { is_active: 0 },
    });

    return { success: true, message: `Đã tạm ẩn loại phòng "${rt.name}".` };
  }

  // ==========================================================================
  // B. QUẢN LÝ PHÒNG CỤ THỂ (ROOMS)
  // ==========================================================================

  /**
   * 1. LẤY DANH SÁCH PHÒNG CỤ THỂ
   * - Manager: Bắt buộc lọc theo apartmentId của mình.
   * - Trả về trạng thái khóa thông minh đi kèm.
   */
  async getRooms(
    filter: {
      apartment_id?: number;
      room_type_id?: number;
      status?: string;
      is_hidden?: boolean;
    },
    staff: StaffContext,
  ) {
    const targetAptId =
      staff.role === 'manager' ? staff.apartmentId || 1 : filter.apartment_id;

    let sql = `
      SELECT 
        r.room_id,
        r.room_number,
        r.apartment_id,
        a.name AS apartment_name,
        r.room_type_id,
        rt.name AS room_type_name,
        r.status,
        r.is_hidden,
        r.last_maintenance_date,
        r.created_at,
        r.updated_at,
        l.id AS lock_id,
        l.cloud_lock_id,
        l.lock_name,
        l.lock_status,
        l.battery_level,
        l.last_sync_at,
        CASE 
          WHEN r.status = 'available' AND r.is_hidden = 0 AND l.id IS NOT NULL THEN 1 
          ELSE 0 
        END AS is_ready_for_booking
      FROM ROOMS r
      LEFT JOIN APARTMENT a ON a.id = r.apartment_id
      LEFT JOIN room_types rt ON rt.id = r.room_type_id
      LEFT JOIN \`lock\` l ON l.room_id = r.room_id AND l.deleted_at IS NULL
      WHERE 1=1
    `;
    const params: any[] = [];

    if (targetAptId) {
      sql += ` AND r.apartment_id = ?`;
      params.push(targetAptId);
    }

    if (filter.room_type_id) {
      sql += ` AND r.room_type_id = ?`;
      params.push(filter.room_type_id);
    }

    if (filter.status) {
      sql += ` AND r.status = ?`;
      params.push(filter.status);
    }

    if (filter.is_hidden !== undefined) {
      sql += ` AND r.is_hidden = ?`;
      params.push(filter.is_hidden ? 1 : 0);
    }

    sql += ` ORDER BY r.apartment_id ASC, r.room_number ASC`;

    const rows = await this.dataSource.query(sql, params);

    return rows.map((r: any) => ({
      room_id: r.room_id,
      room_number: r.room_number,
      apartment_id: r.apartment_id,
      apartment_name: r.apartment_name,
      room_type_id: r.room_type_id,
      room_type_name: r.room_type_name,
      status: r.status,
      is_hidden: Boolean(r.is_hidden),
      last_maintenance_date: r.last_maintenance_date,
      created_at: r.created_at,
      updated_at: r.updated_at,
      is_ready_for_booking: Boolean(r.is_ready_for_booking),
      lock: r.lock_id
        ? {
            id: r.lock_id,
            cloud_lock_id: r.cloud_lock_id,
            lock_name: r.lock_name,
            lock_status: r.lock_status,
            battery_level: r.battery_level,
            last_sync_at: r.last_sync_at,
          }
        : null,
    }));
  }

  /**
   * 2. LẤY CHI TIẾT 1 PHÒNG
   */
  async getRoomById(roomId: number, staff: StaffContext) {
    const [room] = await this.dataSource.query(
      `SELECT r.*, a.name AS apartment_name, rt.name AS room_type_name,
              l.id AS lock_id, l.lock_name, l.lock_status, l.battery_level, l.last_sync_at
       FROM ROOMS r
       LEFT JOIN APARTMENT a ON a.id = r.apartment_id
       LEFT JOIN room_types rt ON rt.id = r.room_type_id
       LEFT JOIN \`lock\` l ON l.room_id = r.room_id AND l.deleted_at IS NULL
       WHERE r.room_id = ?`,
      [roomId],
    );

    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng #${roomId}`);
    }

    if (staff.role === 'manager' && staff.apartmentId !== room.apartment_id) {
      throw new ForbiddenException('Bạn chỉ có quyền xem phòng thuộc chi nhánh của mình.');
    }

    return room;
  }

  /**
   * 3. THÊM MỚI PHÒNG (CHỈ ADMIN)
   * - Quy tắc: ROOMS.apartment_id phải bằng room_types.apartment_id.
   * - UNIQUE (apartment_id, room_number).
   * - Có bước chọn khóa từ danh sách khóa chưa gắn (lock.room_id IS NULL).
   */
  async createRoom(dto: CreateRoomDto, actor: string) {
    if (!dto.room_number || !dto.room_number.trim()) {
      throw new BadRequestException('Số phòng (room_number) là bắt buộc.');
    }
    if (!dto.apartment_id || !dto.room_type_id) {
      throw new BadRequestException('Chi nhánh và Loại phòng là bắt buộc.');
    }

    // Kiểm tra loại phòng có thuộc đúng chi nhánh hay không
    const [roomType] = await this.dataSource.query(
      `SELECT id, name, apartment_id FROM room_types WHERE id = ?`,
      [dto.room_type_id],
    );
    if (!roomType) {
      throw new BadRequestException(`Không tìm thấy loại phòng #${dto.room_type_id}`);
    }

    if (Number(roomType.apartment_id) !== Number(dto.apartment_id)) {
      throw new BadRequestException(
        `Loại phòng "${roomType.name}" không thuộc chi nhánh #${dto.apartment_id}. Mỗi chi nhánh chỉ được chọn loại phòng riêng của chi nhánh đó.`,
      );
    }

    // Kiểm tra UNIQUE (apartment_id, room_number)
    const [duplicate] = await this.dataSource.query(
      `SELECT room_id FROM ROOMS WHERE apartment_id = ? AND LOWER(room_number) = LOWER(?)`,
      [dto.apartment_id, dto.room_number.trim()],
    );
    if (duplicate) {
      throw new BadRequestException(
        `Số phòng "${dto.room_number}" đã tồn tại tại chi nhánh này. Vui lòng chọn số phòng khác.`,
      );
    }

    // Thêm mới phòng
    const res = await this.dataSource.query(
      `INSERT INTO ROOMS (apartment_id, room_type_id, room_number, status, is_hidden, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, NOW(), NOW())`,
      [dto.apartment_id, dto.room_type_id, dto.room_number.trim(), dto.status || 'available'],
    );
    const newRoomId = res.insertId;

    // Gán khóa nếu có chọn
    if (dto.lock_id) {
      const [lockItem] = await this.dataSource.query(
        `SELECT id, room_id, deleted_at FROM \`lock\` WHERE id = ?`,
        [dto.lock_id],
      );
      if (!lockItem || lockItem.deleted_at !== null) {
        throw new BadRequestException(`Khóa #${dto.lock_id} không tồn tại hoặc đã bị xóa.`);
      }
      if (lockItem.room_id !== null) {
        throw new BadRequestException(`Khóa #${dto.lock_id} đang được gắn cho phòng khác.`);
      }

      await this.dataSource.query(`UPDATE \`lock\` SET room_id = ? WHERE id = ?`, [newRoomId, dto.lock_id]);
    }

    await this.auditLogService.log({
      actor,
      action: 'CREATE_ROOM',
      entity_type: 'ROOMS',
      entity_id: newRoomId,
      new_value: { room_id: newRoomId, ...dto },
    });

    return { success: true, room_id: newRoomId, message: 'Tạo phòng mới thành công.' };
  }

  /**
   * 4. CẬP NHẬT PHÒNG (CHỈ ADMIN)
   */
  async updateRoom(roomId: number, dto: UpdateRoomDto, actor: string) {
    const [room] = await this.dataSource.query(`SELECT * FROM ROOMS WHERE room_id = ?`, [roomId]);
    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng #${roomId}`);
    }

    const targetAptId = dto.apartment_id || room.apartment_id;
    const targetTypeId = dto.room_type_id || room.room_type_id;

    // Kiểm tra loại phòng có khớp chi nhánh
    if (dto.room_type_id || dto.apartment_id) {
      const [roomType] = await this.dataSource.query(
        `SELECT id, name, apartment_id FROM room_types WHERE id = ?`,
        [targetTypeId],
      );
      if (!roomType) {
        throw new BadRequestException(`Không tìm thấy loại phòng #${targetTypeId}`);
      }
      if (Number(roomType.apartment_id) !== Number(targetAptId)) {
        throw new BadRequestException(
          `Loại phòng "${roomType.name}" không thuộc chi nhánh #${targetAptId}.`,
        );
      }
    }

    // Kiểm tra UNIQUE (apartment_id, room_number)
    if (dto.room_number) {
      const [duplicate] = await this.dataSource.query(
        `SELECT room_id FROM ROOMS WHERE apartment_id = ? AND LOWER(room_number) = LOWER(?) AND room_id != ?`,
        [targetAptId, dto.room_number.trim(), roomId],
      );
      if (duplicate) {
        throw new BadRequestException(`Số phòng "${dto.room_number}" đã được sử dụng tại chi nhánh này.`);
      }
    }

    const updated = {
      apartment_id: targetAptId,
      room_type_id: targetTypeId,
      room_number: dto.room_number !== undefined ? dto.room_number.trim() : room.room_number,
      status: dto.status !== undefined ? dto.status : room.status,
    };

    await this.dataSource.query(
      `UPDATE ROOMS SET apartment_id = ?, room_type_id = ?, room_number = ?, status = ?, updated_at = NOW() WHERE room_id = ?`,
      [updated.apartment_id, updated.room_type_id, updated.room_number, updated.status, roomId],
    );

    // Gán/đổi khóa nếu có truyền lock_id
    if (dto.lock_id !== undefined) {
      await this.assignLock(roomId, dto.lock_id, actor);
    }

    await this.auditLogService.log({
      actor,
      action: 'UPDATE_ROOM',
      entity_type: 'ROOMS',
      entity_id: roomId,
      old_value: room,
      new_value: updated,
    });

    return { success: true, message: 'Cập nhật thông tin phòng thành công.' };
  }

  /**
   * 5. ĐỔI TRẠNG THÁI PHÒNG (available / maintenance)
   * - Cả Admin và Manager (thuộc chi nhánh mình) đều được gọi.
   * - Cảnh báo nếu phòng đang gắn với đơn tương lai.
   */
  async updateRoomStatus(
    roomId: number,
    status: 'available' | 'maintenance',
    actor: string,
    staff: StaffContext,
  ) {
    const [room] = await this.dataSource.query(`SELECT * FROM ROOMS WHERE room_id = ?`, [roomId]);
    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng #${roomId}`);
    }

    if (staff.role === 'manager' && staff.apartmentId !== room.apartment_id) {
      throw new ForbiddenException('Bạn chỉ có quyền đổi trạng thái phòng thuộc chi nhánh của mình.');
    }

    // Kiểm tra đơn đặt phòng tương lai đang gắn với phòng này
    let warning = null;
    if (status === 'maintenance') {
      const futureBookings = await this.dataSource.query(
        `SELECT b.id, b.booking_code, b.booked_start_time, b.booked_end_time, b.booking_status
         FROM Booking_rooms br
         JOIN BOOKINGS b ON b.id = br.bookings_id
         WHERE br.room_id = ?
           AND b.booked_end_time > NOW()
           AND b.booking_status IN ('confirmed', 'checked_in')`,
        [roomId],
      );

      if (futureBookings && futureBookings.length > 0) {
        warning = {
          has_warning: true,
          message: `Cảnh báo: Phòng ${room.room_number} hiện đang được gắn cho ${futureBookings.length} đơn đặt phòng tương lai. Chuyển sang bảo trì cần lưu ý sắp xếp phòng thay thế cho khách.`,
          affected_bookings: futureBookings,
        };
      }
    }

    await this.dataSource.query(
      `UPDATE ROOMS SET status = ?, updated_at = NOW(), last_maintenance_date = IF(? = 'maintenance', CURDATE(), last_maintenance_date) WHERE room_id = ?`,
      [status, status, roomId],
    );

    await this.auditLogService.log({
      actor,
      action: 'UPDATE_ROOM_STATUS',
      entity_type: 'ROOMS',
      entity_id: roomId,
      old_value: { status: room.status },
      new_value: { status },
    });

    return {
      success: true,
      message: `Đã đổi trạng thái phòng ${room.room_number} sang "${status === 'available' ? 'Sẵn sàng' : 'Bảo trì'}".`,
      warning,
    };
  }

  /**
   * 6. ẨN PHÒNG THAY CHO XÓA CỨNG (CHỈ ADMIN)
   * - Không xóa cứng phòng đã từng có đơn.
   */
  async hideRoom(roomId: number, actor: string) {
    const [room] = await this.dataSource.query(`SELECT * FROM ROOMS WHERE room_id = ?`, [roomId]);
    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng #${roomId}`);
    }

    // Kiểm tra đơn tương lai
    const futureBookings = await this.dataSource.query(
      `SELECT b.id, b.booking_code, b.booked_start_time, b.booked_end_time
       FROM Booking_rooms br
       JOIN BOOKINGS b ON b.id = br.bookings_id
       WHERE br.room_id = ?
         AND b.booked_end_time > NOW()
         AND b.booking_status IN ('confirmed', 'checked_in')`,
      [roomId],
    );

    let warning = null;
    if (futureBookings && futureBookings.length > 0) {
      warning = {
        has_warning: true,
        message: `Phòng ${room.room_number} đang có ${futureBookings.length} đơn tương lai có hiệu lực.`,
        affected_bookings: futureBookings,
      };
    }

    await this.dataSource.query(`UPDATE ROOMS SET is_hidden = 1, updated_at = NOW() WHERE room_id = ?`, [
      roomId,
    ]);

    await this.auditLogService.log({
      actor,
      action: 'HIDE_ROOM',
      entity_type: 'ROOMS',
      entity_id: roomId,
      old_value: { is_hidden: room.is_hidden },
      new_value: { is_hidden: 1 },
    });

    return { success: true, message: `Đã tạm ẩn phòng ${room.room_number}.`, warning };
  }

  /**
   * 7. HIỆN LẠI PHÒNG (CHỈ ADMIN)
   */
  async unhideRoom(roomId: number, actor: string) {
    const [room] = await this.dataSource.query(`SELECT * FROM ROOMS WHERE room_id = ?`, [roomId]);
    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng #${roomId}`);
    }

    await this.dataSource.query(`UPDATE ROOMS SET is_hidden = 0, updated_at = NOW() WHERE room_id = ?`, [
      roomId,
    ]);

    await this.auditLogService.log({
      actor,
      action: 'UNHIDE_ROOM',
      entity_type: 'ROOMS',
      entity_id: roomId,
      old_value: { is_hidden: room.is_hidden },
      new_value: { is_hidden: 0 },
    });

    return { success: true, message: `Đã mở hiển thị lại phòng ${room.room_number}.` };
  }

  // ==========================================================================
  // C. GÁN / ĐỔI / GỠ KHÓA THÔNG MINH CHO PHÒNG
  // ==========================================================================

  /**
   * Lấy danh sách các khóa chưa được gán cho phòng nào
   */
  async getAvailableLocks() {
    return await this.dataSource.query(`
      SELECT id, cloud_lock_id, lock_name, lock_type, lock_status, battery_level, last_sync_at
      FROM \`lock\`
      WHERE room_id IS NULL AND deleted_at IS NULL
      ORDER BY id ASC
    `);
  }

  /**
   * Gán / đổi / gỡ khóa cho phòng
   * - Nếu lockId === null: Gỡ khóa khỏi phòng.
   * - Nếu lockId hợp lệ: Gán vào phòng (bảo đảm khóa chưa bị chiếm).
   */
  async assignLock(roomId: number, lockId: number | null, actor: string) {
    const [room] = await this.dataSource.query(`SELECT * FROM ROOMS WHERE room_id = ?`, [roomId]);
    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng #${roomId}`);
    }

    // Lấy khóa hiện tại đang gắn với phòng (nếu có)
    const [currentLock] = await this.dataSource.query(
      `SELECT id, lock_name FROM \`lock\` WHERE room_id = ? AND deleted_at IS NULL`,
      [roomId],
    );

    // GỠ KHÓA KHỎI PHÒNG
    if (lockId === null || lockId === undefined || lockId === 0) {
      if (currentLock) {
        await this.dataSource.query(`UPDATE \`lock\` SET room_id = NULL WHERE id = ?`, [currentLock.id]);
        await this.auditLogService.log({
          actor,
          action: 'UNASSIGN_LOCK',
          entity_type: 'ROOMS',
          entity_id: roomId,
          old_value: { lock_id: currentLock.id },
          new_value: { lock_id: null },
        });
      }
      return { success: true, message: `Đã gỡ khóa khỏi phòng ${room.room_number}.` };
    }

    // GÁN KHÓA MỚI
    const [targetLock] = await this.dataSource.query(
      `SELECT id, room_id, deleted_at, lock_name FROM \`lock\` WHERE id = ?`,
      [lockId],
    );
    if (!targetLock || targetLock.deleted_at !== null) {
      throw new BadRequestException(`Khóa #${lockId} không tồn tại hoặc đã bị xóa.`);
    }

    // Nếu khóa này đang gắn cho phòng khác
    if (targetLock.room_id !== null && targetLock.room_id !== roomId) {
      const [otherRoom] = await this.dataSource.query(
        `SELECT room_number FROM ROOMS WHERE room_id = ?`,
        [targetLock.room_id],
      );
      throw new BadRequestException(
        `Khóa "${targetLock.lock_name || targetLock.id}" hiện đang được gán cho phòng ${
          otherRoom?.room_number || targetLock.room_id
        }. Vui lòng gỡ khỏi phòng đó trước.`,
      );
    }

    // Gỡ khóa cũ của phòng này nếu có
    if (currentLock && currentLock.id !== lockId) {
      await this.dataSource.query(`UPDATE \`lock\` SET room_id = NULL WHERE id = ?`, [currentLock.id]);
    }

    // Gán khóa vào phòng
    await this.dataSource.query(`UPDATE \`lock\` SET room_id = ? WHERE id = ?`, [roomId, lockId]);

    await this.auditLogService.log({
      actor,
      action: 'ASSIGN_LOCK',
      entity_type: 'ROOMS',
      entity_id: roomId,
      old_value: { lock_id: currentLock?.id || null },
      new_value: { lock_id: lockId },
    });

    return {
      success: true,
      message: `Đã gán khóa "${targetLock.lock_name || lockId}" cho phòng ${room.room_number}.`,
    };
  }
}
