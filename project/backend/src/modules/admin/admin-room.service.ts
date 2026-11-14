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
import {
  normalizeRoomNumber,
  suggestFloor,
  buildBatchPlan,
  computeRoomDisplayStatus,
} from '@shared/rooms';

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
  floor?: number;
  room_group_id?: number | null;
  note?: string;
  status?: 'available' | 'maintenance';
  initial_block_reason?: string;  // bắt buộc nếu status = 'maintenance'
  lock_id?: number | null;
  special_features?: string;
  feature_ids?: number[];
}

export interface UpdateRoomDto {
  apartment_id?: number;
  room_type_id?: number;
  room_number?: string;
  floor?: number;
  room_group_id?: number | null;
  note?: string;
  housekeeping?: 'clean' | 'dirty';
  status?: 'available' | 'maintenance';
  lock_id?: number | null;
  special_features?: string;
  feature_ids?: number[];
}

export interface BatchGroupItem {
  label: string;
  roomGroupId?: number | null;
  roomTypeId: number;
  featureIds?: number[];
  note?: string;
  roomNumbers: string[];
}

export interface BatchCreateRoomItem {
  room_number: string;
  special_features?: string;
  status?: 'available' | 'maintenance';
}

export interface BatchCreateRoomsDto {
  apartment_id: number;
  room_type_id: number;
  rooms: BatchCreateRoomItem[];
  // Legacy fields kept for backward compat
}

export interface NewBatchCreateRoomsDto {
  apartment_id: number;
  default_status?: 'available' | 'maintenance';
  common_feature_ids?: number[];
  groups: BatchGroupItem[];
  dry_run?: boolean;
}

export interface CreateRoomBlockDto {
  from_at: string;
  to_at?: string | null;
  reason: string;
  confirm?: boolean;  // nếu true thì lưu dù có booking trùng
}

export interface BulkFeatureDto {
  room_ids: number[];
  add_feature_ids?: number[];
  remove_feature_ids?: number[];
}

export interface BulkGroupDto {
  room_ids: number[];
  room_group_id: number | null;
}

export interface CreateRoomGroupDto {
  name: string;
}

export interface CreateRoomFeatureDto {
  name: string;
  category: 'view' | 'sunlight' | 'comfort' | 'amenity';
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
         FROM ROOM_AMENITIES ra
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
       FROM ROOM_AMENITIES ra
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
          `INSERT INTO ROOM_AMENITIES (room_types_id, amenity_id) VALUES (?, ?)`,
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
      await this.dataSource.query(`DELETE FROM ROOM_AMENITIES WHERE room_types_id = ?`, [id]);
      for (const amenityId of dto.amenity_ids) {
        await this.dataSource.query(
          `INSERT INTO ROOM_AMENITIES (room_types_id, amenity_id) VALUES (?, ?)`,
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
        r.floor,
        r.room_group_id,
        rg.name AS room_group_name,
        r.note,
        r.housekeeping,
        r.apartment_id,
        a.name AS apartment_name,
        r.room_type_id,
        rt.name AS room_type_name,
        r.status,
        r.special_features,
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
        (SELECT GROUP_CONCAT(rfm.feature_id) FROM room_feature_map rfm WHERE rfm.room_id = r.room_id) AS feature_ids_str,
        (SELECT COUNT(*) FROM room_blocks rb WHERE rb.room_id = r.room_id AND rb.from_at <= NOW() AND (rb.to_at IS NULL OR rb.to_at >= NOW())) AS active_blocks_count,
        (SELECT COUNT(*) FROM Booking_rooms br JOIN BOOKINGS b ON b.id = br.bookings_id WHERE br.room_id = r.room_id AND b.booking_status = 'checked_in') AS has_checked_in_booking,
        CASE 
          WHEN r.status = 'available' AND r.is_hidden = 0 AND l.id IS NOT NULL THEN 1 
          ELSE 0 
        END AS is_ready_for_booking
      FROM ROOMS r
      LEFT JOIN APARTMENT a ON a.id = r.apartment_id
      LEFT JOIN room_types rt ON rt.id = r.room_type_id
      LEFT JOIN room_groups rg ON rg.id = r.room_group_id
      LEFT JOIN lock l ON l.room_id = r.room_id AND l.deleted_at IS NULL
      WHERE r.deleted_at IS NULL
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

    sql += ` ORDER BY r.apartment_id ASC, r.floor ASC, r.room_number ASC`;

    const rows = await this.dataSource.query(sql, params);

    return rows.map((r: any) => {
      const activeBlocks = Number(r.active_blocks_count) > 0 ? [{ id: 1, room_id: r.room_id, from_at: new Date(), to_at: null, reason: 'active' }] : [];
      const hasCheckedIn = Number(r.has_checked_in_booking) > 0;
      const displayStatus = computeRoomDisplayStatus(
        { housekeeping: r.housekeeping },
        activeBlocks,
        hasCheckedIn,
      );

      const featureIds = r.feature_ids_str
        ? r.feature_ids_str.split(',').map((id: string) => Number(id.trim())).filter((n: number) => !isNaN(n))
        : [];

      return {
        room_id: r.room_id,
        room_number: r.room_number,
        floor: r.floor ?? 0,
        room_group_id: r.room_group_id || null,
        room_group_name: r.room_group_name || null,
        note: r.note || '',
        housekeeping: r.housekeeping || 'clean',
        apartment_id: r.apartment_id,
        apartment_name: r.apartment_name,
        room_type_id: r.room_type_id,
        room_type_name: r.room_type_name,
        status: r.status,
        display_status: displayStatus,
        feature_ids: featureIds,
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
      };
    });
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
       LEFT JOIN lock l ON l.room_id = r.room_id AND l.deleted_at IS NULL
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

    const normalizedRoomNumber = normalizeRoomNumber(dto.room_number);
    const floor = dto.floor !== undefined ? Number(dto.floor) : (suggestFloor(normalizedRoomNumber) ?? 0);

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

    // Kiểm tra nhóm phòng nếu có
    if (dto.room_group_id) {
      const [rg] = await this.dataSource.query(
        `SELECT id, name, is_active FROM room_groups WHERE id = ?`,
        [dto.room_group_id],
      );
      if (!rg || !rg.is_active) {
        throw new BadRequestException(`Nhóm phòng #${dto.room_group_id} không tồn tại hoặc đã bị vô hiệu hóa.`);
      }
    }

    // Nếu trạng thái ban đầu là bảo trì, bắt buộc có lý do
    if (dto.status === 'maintenance' && (!dto.initial_block_reason || !dto.initial_block_reason.trim())) {
      throw new BadRequestException('Bắt buộc nhập lý do bảo trì (initial_block_reason) khi chọn trạng thái ban đầu là Bảo trì.');
    }

    // Kiểm tra UNIQUE (apartment_id, room_number)
    const [duplicate] = await this.dataSource.query(
      `SELECT room_id FROM ROOMS WHERE apartment_id = ? AND LOWER(room_number) = LOWER(?) AND deleted_at IS NULL`,
      [dto.apartment_id, normalizedRoomNumber],
    );
    if (duplicate) {
      throw new BadRequestException(
        `Số phòng "${normalizedRoomNumber}" đã tồn tại tại chi nhánh này. Vui lòng chọn số phòng khác.`,
      );
    }

    // Thêm mới phòng
    const res = await this.dataSource.query(
      `INSERT INTO ROOMS (apartment_id, room_type_id, room_number, floor, room_group_id, note, housekeeping, status, special_features, is_hidden, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'clean', ?, ?, 0, NOW(), NOW())`,
      [
        dto.apartment_id,
        dto.room_type_id,
        normalizedRoomNumber,
        floor,
        dto.room_group_id || null,
        dto.note?.trim() || null,
        dto.status || 'available',
        dto.special_features?.trim() || null,
      ],
    );
    const newRoomId = res.insertId;

    // Lưu đặc điểm phòng vào room_feature_map
    if (dto.feature_ids && dto.feature_ids.length > 0) {
      for (const featId of dto.feature_ids) {
        await this.dataSource.query(
          `INSERT IGNORE INTO room_feature_map (room_id, feature_id) VALUES (?, ?)`,
          [newRoomId, featId],
        );
      }
    }

    // Nếu là bảo trì ban đầu, tạo room_blocks mở
    if (dto.status === 'maintenance') {
      await this.dataSource.query(
        `INSERT INTO room_blocks (room_id, from_at, to_at, reason, created_by, created_at)
         VALUES (?, NOW(), NULL, ?, ?, NOW())`,
        [newRoomId, dto.initial_block_reason.trim(), actor],
      );
    }

    // Gán khóa nếu có chọn
    if (dto.lock_id) {
      const [lockItem] = await this.dataSource.query(
        `SELECT id, room_id, deleted_at FROM lock WHERE id = ?`,
        [dto.lock_id],
      );
      if (!lockItem || lockItem.deleted_at !== null) {
        throw new BadRequestException(`Khóa #${dto.lock_id} không tồn tại hoặc đã bị xóa.`);
      }
      if (lockItem.room_id !== null) {
        throw new BadRequestException(`Khóa #${dto.lock_id} đang được gắn cho phòng khác.`);
      }

      await this.dataSource.query(`UPDATE lock SET room_id = ? WHERE id = ?`, [newRoomId, dto.lock_id]);
    }

    await this.auditLogService.log({
      actor,
      action: 'CREATE_ROOM',
      entity_type: 'ROOMS',
      entity_id: newRoomId,
      new_value: { room_id: newRoomId, ...dto, room_number: normalizedRoomNumber, floor },
    });

    return { success: true, room_id: newRoomId, message: 'Tạo phòng mới thành công.' };
  }

  /**
   * 3.1 TẠO NHIỀU PHÒNG CÙNG LÚC (BATCH CREATE)
   */
  async batchCreateRooms(dto: BatchCreateRoomsDto, actor: string) {
    if (!dto.apartment_id || !dto.room_type_id) {
      throw new BadRequestException('Chi nhánh và Loại phòng là bắt buộc.');
    }
    if (!Array.isArray(dto.rooms) || dto.rooms.length === 0) {
      throw new BadRequestException('Danh sách phòng tạo mới không được để trống.');
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
        `Loại phòng "${roomType.name}" không thuộc chi nhánh #${dto.apartment_id}.`,
      );
    }

    // Chuẩn hóa và lọc danh sách phòng
    const cleanedRooms = dto.rooms
      .filter((r) => r.room_number && r.room_number.trim().length > 0)
      .map((r) => ({
        room_number: r.room_number.trim(),
        special_features: r.special_features?.trim() || null,
        status: r.status || 'available',
      }));

    if (cleanedRooms.length === 0) {
      throw new BadRequestException('Không có số phòng hợp lệ để tạo.');
    }

    // Kiểm tra trùng lặp trong chính danh sách gửi lên
    const roomNumbers = cleanedRooms.map((r) => r.room_number.toLowerCase());
    const uniqueNumbers = new Set(roomNumbers);
    if (uniqueNumbers.size < roomNumbers.length) {
      throw new BadRequestException('Có số phòng bị trùng lặp trong danh sách gửi lên.');
    }

    // Kiểm tra trùng lặp với các phòng đã có trong chi nhánh
    const existing = await this.dataSource.query(
      `SELECT room_number FROM ROOMS WHERE apartment_id = ? AND LOWER(room_number) IN (?)`,
      [dto.apartment_id, roomNumbers],
    );

    if (existing && existing.length > 0) {
      const existingList = existing.map((e: any) => e.room_number).join(', ');
      throw new BadRequestException(
        `Các số phòng sau đã tồn tại tại chi nhánh này: ${existingList}. Vui lòng kiểm tra lại.`,
      );
    }

    // Tiến hành bulk insert
    const insertValues: any[] = [];
    const placeholders: string[] = [];

    for (const item of cleanedRooms) {
      placeholders.push('(?, ?, ?, ?, ?, 0, NOW(), NOW())');
      insertValues.push(
        dto.apartment_id,
        dto.room_type_id,
        item.room_number,
        item.status,
        item.special_features,
      );
    }

    await this.dataSource.query(
      `INSERT INTO ROOMS (apartment_id, room_type_id, room_number, status, special_features, is_hidden, created_at, updated_at)
       VALUES ${placeholders.join(', ')}`,
      insertValues,
    );

    await this.auditLogService.log({
      actor,
      action: 'BATCH_CREATE_ROOMS',
      entity_type: 'ROOMS',
      entity_id: dto.apartment_id,
      new_value: {
        apartment_id: dto.apartment_id,
        room_type_id: dto.room_type_id,
        total_created: cleanedRooms.length,
        rooms: cleanedRooms,
      },
    });

    return {
      success: true,
      createdCount: cleanedRooms.length,
      createdRooms: cleanedRooms.map((r) => r.room_number),
      message: `Đã tạo thành công ${cleanedRooms.length} phòng mới!`,
    };
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

    // Chặn đổi loại phòng hoặc chi nhánh nếu còn booking tương lai hoặc đang lưu trú
    const isChangingBranch = dto.apartment_id && Number(dto.apartment_id) !== Number(room.apartment_id);
    const isChangingType = dto.room_type_id && Number(dto.room_type_id) !== Number(room.room_type_id);
    if (isChangingBranch || isChangingType) {
      const activeBookings = await this.dataSource.query(
        `SELECT b.id, b.booking_code
         FROM Booking_rooms br
         JOIN BOOKINGS b ON b.id = br.bookings_id
         WHERE br.room_id = ?
           AND (b.booking_status = 'checked_in' OR (b.booking_status = 'confirmed' AND b.booked_end_time > NOW()))`,
        [roomId],
      );
      if (activeBookings && activeBookings.length > 0) {
        const codes = activeBookings.map((b: any) => b.booking_code).join(', ');
        throw new BadRequestException(
          `Không thể thay đổi chi nhánh hoặc loại phòng vì phòng đang có đơn đặt hiệu lực hoặc đang lưu trú (${codes}).`,
        );
      }
    }

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

    // Kiểm tra nhóm phòng nếu có truyền
    if (dto.room_group_id !== undefined && dto.room_group_id !== null) {
      const [rg] = await this.dataSource.query(
        `SELECT id, is_active FROM room_groups WHERE id = ?`,
        [dto.room_group_id],
      );
      if (!rg || !rg.is_active) {
        throw new BadRequestException(`Nhóm phòng #${dto.room_group_id} không tồn tại hoặc đã bị vô hiệu hóa.`);
      }
    }

    let finalRoomNumber = room.room_number;
    if (dto.room_number) {
      finalRoomNumber = normalizeRoomNumber(dto.room_number);
      const [duplicate] = await this.dataSource.query(
        `SELECT room_id FROM ROOMS WHERE apartment_id = ? AND LOWER(room_number) = LOWER(?) AND room_id != ? AND deleted_at IS NULL`,
        [targetAptId, finalRoomNumber, roomId],
      );
      if (duplicate) {
        throw new BadRequestException(`Số phòng "${finalRoomNumber}" đã được sử dụng tại chi nhánh này.`);
      }
    }

    const finalFloor = dto.floor !== undefined
      ? Number(dto.floor)
      : (dto.room_number ? (suggestFloor(finalRoomNumber) ?? room.floor) : room.floor);

    const updated = {
      apartment_id: targetAptId,
      room_type_id: targetTypeId,
      room_number: finalRoomNumber,
      floor: finalFloor,
      room_group_id: dto.room_group_id !== undefined ? dto.room_group_id : room.room_group_id,
      note: dto.note !== undefined ? (dto.note?.trim() || null) : room.note,
      housekeeping: dto.housekeeping !== undefined ? dto.housekeeping : (room.housekeeping || 'clean'),
      status: dto.status !== undefined ? dto.status : room.status,
      special_features: dto.special_features !== undefined ? (dto.special_features?.trim() || null) : room.special_features,
    };

    await this.dataSource.query(
      `UPDATE ROOMS 
       SET apartment_id = ?, room_type_id = ?, room_number = ?, floor = ?, room_group_id = ?, note = ?, housekeeping = ?, status = ?, special_features = ?, updated_at = NOW() 
       WHERE room_id = ?`,
      [
        updated.apartment_id,
        updated.room_type_id,
        updated.room_number,
        updated.floor,
        updated.room_group_id,
        updated.note,
        updated.housekeeping,
        updated.status,
        updated.special_features,
        roomId,
      ],
    );

    // Cập nhật features nếu có
    if (dto.feature_ids !== undefined) {
      await this.dataSource.query(`DELETE FROM room_feature_map WHERE room_id = ?`, [roomId]);
      if (Array.isArray(dto.feature_ids) && dto.feature_ids.length > 0) {
        for (const featId of dto.feature_ids) {
          await this.dataSource.query(
            `INSERT IGNORE INTO room_feature_map (room_id, feature_id) VALUES (?, ?)`,
            [roomId, featId],
          );
        }
      }
    }

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
   * 4.1 ĐỔI TRẠNG THÁI HOUSEKEEPING (CHỈ ĐỔI SẠCH / CẦN DỌN)
   * - Cả Admin và Manager (của chi nhánh) đều được phép.
   */
  async updateHousekeeping(roomId: number, housekeeping: 'clean' | 'dirty', staff: StaffContext) {
    const [room] = await this.dataSource.query(`SELECT * FROM ROOMS WHERE room_id = ? AND deleted_at IS NULL`, [roomId]);
    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng #${roomId}`);
    }

    if (staff.role === 'manager' && Number(staff.apartmentId) !== Number(room.apartment_id)) {
      throw new ForbiddenException('Bạn chỉ có quyền quản lý buồng phòng thuộc chi nhánh của mình.');
    }

    await this.dataSource.query(
      `UPDATE ROOMS SET housekeeping = ?, updated_at = NOW() WHERE room_id = ?`,
      [housekeeping, roomId],
    );

    await this.auditLogService.log({
      actor: staff.actor,
      action: 'UPDATE_HOUSEKEEPING',
      entity_type: 'ROOMS',
      entity_id: roomId,
      old_value: { housekeeping: room.housekeeping },
      new_value: { housekeeping },
    });

    return {
      success: true,
      message: `Đã cập nhật tình trạng dọn dẹp phòng ${room.room_number} sang "${housekeeping === 'clean' ? 'Sạch' : 'Cần dọn'}".`,
    };
  }

  /**
   * 4.2 XÓA MỀM PHÒNG (CHỈ ADMIN)
   * - Không cho phép xóa nếu phòng từng có booking.
   */
  async softDeleteRoom(roomId: number, actor: string) {
    const [room] = await this.dataSource.query(`SELECT * FROM ROOMS WHERE room_id = ? AND deleted_at IS NULL`, [roomId]);
    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng #${roomId}`);
    }

    // Kiểm tra xem phòng từng có booking nào chưa
    const [bookingCount] = await this.dataSource.query(
      `SELECT COUNT(*) AS cnt FROM Booking_rooms WHERE room_id = ?`,
      [roomId],
    );

    if (bookingCount && Number(bookingCount.cnt) > 0) {
      throw new BadRequestException(
        `Không thể xóa phòng ${room.room_number} vì phòng này đã từng có lịch sử đặt phòng (${bookingCount.cnt} lượt). Vui lòng sử dụng tính năng ẩn phòng thay thế.`,
      );
    }

    await this.dataSource.query(
      `UPDATE ROOMS SET deleted_at = NOW(), updated_at = NOW() WHERE room_id = ?`,
      [roomId],
    );

    await this.auditLogService.log({
      actor,
      action: 'SOFT_DELETE_ROOM',
      entity_type: 'ROOMS',
      entity_id: roomId,
      old_value: { deleted_at: null },
      new_value: { deleted_at: new Date() },
    });

    return { success: true, message: `Đã xóa phòng ${room.room_number} thành công.` };
  }

  /**
   * 5. ĐỔI TRẠNG THÁI PHÒNG (available / maintenance)
   * - Cả Admin và Manager (thuộc chi nhánh mình) đều được gọi.
   * - Cảnh báo nếu phòng đang gắn với đơn tương lai.
   */
  async updateRoomStatus(
    roomId: number,
    status: 'available' | 'occupied' | 'cleaning' | 'maintenance',
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

    // Nếu chuyển sang cleaning (hoặc rời khỏi occupied) -> tự động hoàn tất Check-out cho đơn booking đang lưu trú tại phòng
    let autoCheckoutCode: string | null = null;
    if (status === 'cleaning' || (room.status === 'occupied' && status !== 'occupied')) {
      const activeBookings = await this.dataSource.query(
        `SELECT b.id, b.booking_code
         FROM Booking_rooms br
         JOIN BOOKINGS b ON b.id = br.bookings_id
         WHERE br.room_id = ? AND b.booking_status = 'checked_in'`,
        [roomId],
      );
      for (const ab of activeBookings) {
        await this.dataSource.query(
          `UPDATE BOOKINGS SET booking_status = 'checked_out', actual_end_time = NOW() WHERE id = ?`,
          [ab.id],
        );
        autoCheckoutCode = ab.booking_code;
        await this.auditLogService.log({
          actor,
          action: 'AUTO_CHECK_OUT',
          entity_type: 'BOOKINGS',
          entity_id: ab.id,
          old_value: { booking_status: 'checked_in' },
          new_value: { booking_status: 'checked_out', reason: `Tự động check-out khi phòng ${room.room_number} chuyển sang ${status}` },
        });
      }
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
      message: autoCheckoutCode
        ? `Đã đổi trạng thái phòng ${room.room_number} sang "${status}" và hoàn tất Check-out đơn ${autoCheckoutCode}.`
        : `Đã đổi trạng thái phòng ${room.room_number} sang "${status}".`,
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

    // Kiểm tra đơn tương lai hoặc đang lưu trú
    const futureBookings = await this.dataSource.query(
      `SELECT b.id, b.booking_code, b.booked_start_time, b.booked_end_time
       FROM Booking_rooms br
       JOIN BOOKINGS b ON b.id = br.bookings_id
       WHERE br.room_id = ?
         AND (b.booking_status = 'checked_in' OR (b.booking_status = 'confirmed' AND b.booked_end_time > NOW()))`,
      [roomId],
    );

    if (futureBookings && futureBookings.length > 0) {
      const codes = futureBookings.map((b: any) => b.booking_code).join(', ');
      throw new BadRequestException(
        `Không thể ẩn phòng ${room.room_number} vì còn ${futureBookings.length} đơn đặt phòng đang có hiệu lực hoặc đang lưu trú (${codes}).`,
      );
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

    return { success: true, message: `Đã tạm ẩn phòng ${room.room_number}.` };
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
      FROM lock
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
      `SELECT id, lock_name FROM lock WHERE room_id = ? AND deleted_at IS NULL`,
      [roomId],
    );

    // GỠ KHÓA KHỎI PHÒNG
    if (lockId === null || lockId === undefined || lockId === 0) {
      if (currentLock) {
        await this.dataSource.query(`UPDATE lock SET room_id = NULL WHERE id = ?`, [currentLock.id]);
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
      `SELECT id, room_id, deleted_at, lock_name FROM lock WHERE id = ?`,
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
      await this.dataSource.query(`UPDATE lock SET room_id = NULL WHERE id = ?`, [currentLock.id]);
    }

    // Gán khóa vào phòng
    await this.dataSource.query(`UPDATE lock SET room_id = ? WHERE id = ?`, [roomId, lockId]);

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

  // ==========================================================================
  // D. QUẢN LÝ NHÓM PHÒNG (ROOM GROUPS - CHỈ ADMIN)
  // ==========================================================================

  async getRoomGroups(onlyActive = false) {
    let sql = `SELECT id, name, is_active, created_at FROM room_groups`;
    if (onlyActive) {
      sql += ` WHERE is_active = 1`;
    }
    sql += ` ORDER BY id ASC`;
    const rows = await this.dataSource.query(sql);
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
    }));
  }

  async createRoomGroup(dto: CreateRoomGroupDto, actor: string) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Tên nhóm phòng không được để trống.');
    }
    const trimmedName = dto.name.trim();

    const [existing] = await this.dataSource.query(
      `SELECT id FROM room_groups WHERE LOWER(name) = LOWER(?)`,
      [trimmedName],
    );
    if (existing) {
      throw new BadRequestException(`Nhóm phòng "${trimmedName}" đã tồn tại.`);
    }

    const res = await this.dataSource.query(
      `INSERT INTO room_groups (name, is_active, created_at) VALUES (?, 1, NOW())`,
      [trimmedName],
    );
    const newId = res.insertId;

    await this.auditLogService.log({
      actor,
      action: 'CREATE_ROOM_GROUP',
      entity_type: 'room_groups',
      entity_id: newId,
      new_value: { id: newId, name: trimmedName, is_active: 1 },
    });

    return { success: true, id: newId, message: `Đã tạo nhóm phòng "${trimmedName}".` };
  }

  async updateRoomGroup(id: number, name: string, actor: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('Tên nhóm phòng không được để trống.');
    }
    const trimmedName = name.trim();

    const [current] = await this.dataSource.query(`SELECT * FROM room_groups WHERE id = ?`, [id]);
    if (!current) {
      throw new NotFoundException(`Không tìm thấy nhóm phòng #${id}`);
    }

    const [duplicate] = await this.dataSource.query(
      `SELECT id FROM room_groups WHERE LOWER(name) = LOWER(?) AND id != ?`,
      [trimmedName, id],
    );
    if (duplicate) {
      throw new BadRequestException(`Nhóm phòng "${trimmedName}" đã tồn tại.`);
    }

    await this.dataSource.query(`UPDATE room_groups SET name = ? WHERE id = ?`, [trimmedName, id]);

    await this.auditLogService.log({
      actor,
      action: 'UPDATE_ROOM_GROUP',
      entity_type: 'room_groups',
      entity_id: id,
      old_value: current,
      new_value: { ...current, name: trimmedName },
    });

    return { success: true, message: `Đã cập nhật tên nhóm phòng thành "${trimmedName}".` };
  }

  async toggleRoomGroup(id: number, actor: string) {
    const [current] = await this.dataSource.query(`SELECT * FROM room_groups WHERE id = ?`, [id]);
    if (!current) {
      throw new NotFoundException(`Không tìm thấy nhóm phòng #${id}`);
    }

    const nextState = current.is_active ? 0 : 1;
    await this.dataSource.query(`UPDATE room_groups SET is_active = ? WHERE id = ?`, [nextState, id]);

    await this.auditLogService.log({
      actor,
      action: 'TOGGLE_ROOM_GROUP',
      entity_type: 'room_groups',
      entity_id: id,
      old_value: { is_active: current.is_active },
      new_value: { is_active: nextState },
    });

    return {
      success: true,
      is_active: Boolean(nextState),
      message: `Đã ${nextState ? 'kích hoạt' : 'vô hiệu hóa'} nhóm phòng "${current.name}".`,
    };
  }

  // ==========================================================================
  // E. QUẢN LÝ ĐẶC ĐIỂM PHÒNG (ROOM FEATURES - CHỈ ADMIN)
  // ==========================================================================

  async getRoomFeatures(onlyActive = false) {
    let sql = `SELECT id, name, category, is_active, created_at FROM room_features`;
    if (onlyActive) {
      sql += ` WHERE is_active = 1`;
    }
    sql += ` ORDER BY category ASC, id ASC`;
    const rows = await this.dataSource.query(sql);
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
    }));
  }

  async createRoomFeature(dto: CreateRoomFeatureDto, actor: string) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Tên đặc điểm không được để trống.');
    }
    const trimmedName = dto.name.trim();

    const validCategories = ['view', 'sunlight', 'comfort', 'amenity'];
    if (!validCategories.includes(dto.category)) {
      throw new BadRequestException(`Danh mục đặc điểm không hợp lệ. Phải thuộc: ${validCategories.join(', ')}`);
    }

    const [existing] = await this.dataSource.query(
      `SELECT id FROM room_features WHERE LOWER(name) = LOWER(?)`,
      [trimmedName],
    );
    if (existing) {
      throw new BadRequestException(`Đặc điểm "${trimmedName}" đã tồn tại.`);
    }

    const res = await this.dataSource.query(
      `INSERT INTO room_features (name, category, is_active, created_at) VALUES (?, ?, 1, NOW())`,
      [trimmedName, dto.category],
    );
    const newId = res.insertId;

    await this.auditLogService.log({
      actor,
      action: 'CREATE_ROOM_FEATURE',
      entity_type: 'room_features',
      entity_id: newId,
      new_value: { id: newId, name: trimmedName, category: dto.category, is_active: 1 },
    });

    return { success: true, id: newId, message: `Đã tạo đặc điểm "${trimmedName}".` };
  }

  async updateRoomFeature(id: number, dto: Partial<CreateRoomFeatureDto>, actor: string) {
    const [current] = await this.dataSource.query(`SELECT * FROM room_features WHERE id = ?`, [id]);
    if (!current) {
      throw new NotFoundException(`Không tìm thấy đặc điểm #${id}`);
    }

    let finalName = current.name;
    if (dto.name && dto.name.trim()) {
      finalName = dto.name.trim();
      const [duplicate] = await this.dataSource.query(
        `SELECT id FROM room_features WHERE LOWER(name) = LOWER(?) AND id != ?`,
        [finalName, id],
      );
      if (duplicate) {
        throw new BadRequestException(`Đặc điểm "${finalName}" đã tồn tại.`);
      }
    }

    let finalCategory = current.category;
    if (dto.category) {
      const validCategories = ['view', 'sunlight', 'comfort', 'amenity'];
      if (!validCategories.includes(dto.category)) {
        throw new BadRequestException(`Danh mục đặc điểm không hợp lệ.`);
      }
      finalCategory = dto.category;
    }

    await this.dataSource.query(
      `UPDATE room_features SET name = ?, category = ? WHERE id = ?`,
      [finalName, finalCategory, id],
    );

    await this.auditLogService.log({
      actor,
      action: 'UPDATE_ROOM_FEATURE',
      entity_type: 'room_features',
      entity_id: id,
      old_value: current,
      new_value: { ...current, name: finalName, category: finalCategory },
    });

    return { success: true, message: `Đã cập nhật đặc điểm thành "${finalName}".` };
  }

  async toggleRoomFeature(id: number, actor: string) {
    const [current] = await this.dataSource.query(`SELECT * FROM room_features WHERE id = ?`, [id]);
    if (!current) {
      throw new NotFoundException(`Không tìm thấy đặc điểm #${id}`);
    }

    const nextState = current.is_active ? 0 : 1;
    await this.dataSource.query(`UPDATE room_features SET is_active = ? WHERE id = ?`, [nextState, id]);

    await this.auditLogService.log({
      actor,
      action: 'TOGGLE_ROOM_FEATURE',
      entity_type: 'room_features',
      entity_id: id,
      old_value: { is_active: current.is_active },
      new_value: { is_active: nextState },
    });

    return {
      success: true,
      is_active: Boolean(nextState),
      message: `Đã ${nextState ? 'kích hoạt' : 'vô hiệu hóa'} đặc điểm "${current.name}".`,
    };
  }

  // ==========================================================================
  // F. QUẢN LÝ LỊCH BẢO TRÌ PHÒNG (ROOM BLOCKS)
  // ==========================================================================

  async getRoomBlocks(roomId: number) {
    const rows = await this.dataSource.query(
      `SELECT id, room_id, from_at, to_at, reason, created_by, created_at 
       FROM room_blocks 
       WHERE room_id = ? 
       ORDER BY from_at DESC`,
      [roomId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      room_id: r.room_id,
      from_at: r.from_at,
      to_at: r.to_at,
      reason: r.reason,
      created_by: r.created_by,
      created_at: r.created_at,
    }));
  }

  async createRoomBlock(roomId: number, dto: CreateRoomBlockDto, actor: string) {
    const [room] = await this.dataSource.query(`SELECT * FROM ROOMS WHERE room_id = ? AND deleted_at IS NULL`, [roomId]);
    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng #${roomId}`);
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Lý do bảo trì là bắt buộc.');
    }

    const fromAt = new Date(dto.from_at);
    if (isNaN(fromAt.getTime())) {
      throw new BadRequestException('Thời gian bắt đầu bảo trì không hợp lệ.');
    }
    const toAt = dto.to_at ? new Date(dto.to_at) : null;
    if (toAt && isNaN(toAt.getTime())) {
      throw new BadRequestException('Thời gian kết thúc bảo trì không hợp lệ.');
    }
    if (toAt && toAt <= fromAt) {
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu.');
    }

    // Kiểm tra đơn đặt phòng trùng khoảng bảo trì
    const conflictSql = `
      SELECT b.id, b.booking_code, b.booked_start_time, b.booked_end_time, b.booking_status
      FROM Booking_rooms br
      JOIN BOOKINGS b ON b.id = br.bookings_id
      WHERE br.room_id = ?
        AND b.booking_status IN ('confirmed', 'checked_in')
        AND (
          (? < b.booked_end_time) AND (? IS NULL OR ? > b.booked_start_time)
        )
    `;
    const conflictBookings = await this.dataSource.query(conflictSql, [roomId, fromAt, toAt, toAt]);

    if (conflictBookings && conflictBookings.length > 0 && !dto.confirm) {
      return {
        success: false,
        conflict: true,
        affected_bookings: conflictBookings,
        message: `Khoảng thời gian bảo trì trùng với ${conflictBookings.length} đơn đặt phòng hiệu lực. Vui lòng xác nhận để tiếp tục đặt bảo trì.`,
      };
    }

    const res = await this.dataSource.query(
      `INSERT INTO room_blocks (room_id, from_at, to_at, reason, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [roomId, fromAt, toAt, dto.reason.trim(), actor],
    );
    const newBlockId = res.insertId;

    // Cập nhật trạng thái phòng thành maintenance nếu block có hiệu lực ngay bây giờ
    const now = new Date();
    if (fromAt <= now && (!toAt || toAt >= now)) {
      await this.dataSource.query(
        `UPDATE ROOMS SET status = 'maintenance', updated_at = NOW() WHERE room_id = ?`,
        [roomId],
      );
    }

    await this.auditLogService.log({
      actor,
      action: 'CREATE_ROOM_BLOCK',
      entity_type: 'room_blocks',
      entity_id: newBlockId,
      new_value: { id: newBlockId, room_id: roomId, from_at: fromAt, to_at: toAt, reason: dto.reason.trim() },
    });

    return {
      success: true,
      block_id: newBlockId,
      message: `Đã tạo lịch bảo trì cho phòng ${room.room_number}.`,
    };
  }

  async deleteRoomBlock(roomId: number, blockId: number, actor: string) {
    const [block] = await this.dataSource.query(
      `SELECT * FROM room_blocks WHERE id = ? AND room_id = ?`,
      [blockId, roomId],
    );
    if (!block) {
      throw new NotFoundException(`Không tìm thấy lịch bảo trì #${blockId} của phòng #${roomId}`);
    }

    await this.dataSource.query(`DELETE FROM room_blocks WHERE id = ?`, [blockId]);

    // Kiểm tra xem phòng còn lịch bảo trì đang active nào khác không
    const [activeBlock] = await this.dataSource.query(
      `SELECT id FROM room_blocks WHERE room_id = ? AND from_at <= NOW() AND (to_at IS NULL OR to_at >= NOW()) LIMIT 1`,
      [roomId],
    );

    if (!activeBlock) {
      // Nếu không còn block active nào, cập nhật status về available nếu đang là maintenance
      await this.dataSource.query(
        `UPDATE ROOMS SET status = 'available', updated_at = NOW() WHERE room_id = ? AND status = 'maintenance'`,
        [roomId],
      );
    }

    await this.auditLogService.log({
      actor,
      action: 'DELETE_ROOM_BLOCK',
      entity_type: 'room_blocks',
      entity_id: blockId,
      old_value: block,
      new_value: null,
    });

    return { success: true, message: 'Đã gỡ lịch bảo trì phòng thành công.' };
  }

  // ==========================================================================
  // G. GÁN HÀNG LOẠT (BULK OPERATIONS - CHỈ ADMIN)
  // ==========================================================================

  async bulkAssignFeatures(dto: BulkFeatureDto, actor: string) {
    if (!dto.room_ids || !Array.isArray(dto.room_ids) || dto.room_ids.length === 0) {
      throw new BadRequestException('Danh sách phòng (room_ids) không được để trống.');
    }

    const rooms = await this.dataSource.query(
      `SELECT room_id FROM ROOMS WHERE room_id IN (?) AND deleted_at IS NULL`,
      [dto.room_ids],
    );
    const validRoomIds = rooms.map((r: any) => r.room_id);

    // Gán thêm đặc điểm
    if (dto.add_feature_ids && dto.add_feature_ids.length > 0) {
      for (const roomId of validRoomIds) {
        for (const featId of dto.add_feature_ids) {
          await this.dataSource.query(
            `INSERT IGNORE INTO room_feature_map (room_id, feature_id) VALUES (?, ?)`,
            [roomId, featId],
          );
        }
      }
    }

    // Gỡ bớt đặc điểm
    if (dto.remove_feature_ids && dto.remove_feature_ids.length > 0) {
      for (const roomId of validRoomIds) {
        await this.dataSource.query(
          `DELETE FROM room_feature_map WHERE room_id = ? AND feature_id IN (?)`,
          [roomId, dto.remove_feature_ids],
        );
      }
    }

    await this.auditLogService.log({
      actor,
      action: 'BULK_ASSIGN_FEATURES',
      entity_type: 'ROOMS',
      entity_id: 0,
      new_value: dto,
    });

    return {
      success: true,
      count: validRoomIds.length,
      message: `Đã cập nhật đặc điểm cho ${validRoomIds.length} phòng.`,
    };
  }

  async bulkAssignGroup(dto: BulkGroupDto, actor: string) {
    if (!dto.room_ids || !Array.isArray(dto.room_ids) || dto.room_ids.length === 0) {
      throw new BadRequestException('Danh sách phòng (room_ids) không được để trống.');
    }

    if (dto.room_group_id !== null && dto.room_group_id !== undefined) {
      const [rg] = await this.dataSource.query(
        `SELECT id FROM room_groups WHERE id = ? AND is_active = 1`,
        [dto.room_group_id],
      );
      if (!rg) {
        throw new BadRequestException(`Nhóm phòng #${dto.room_group_id} không tồn tại hoặc đã bị vô hiệu hóa.`);
      }
    }

    await this.dataSource.query(
      `UPDATE ROOMS SET room_group_id = ?, updated_at = NOW() WHERE room_id IN (?) AND deleted_at IS NULL`,
      [dto.room_group_id || null, dto.room_ids],
    );

    await this.auditLogService.log({
      actor,
      action: 'BULK_ASSIGN_GROUP',
      entity_type: 'ROOMS',
      entity_id: 0,
      new_value: dto,
    });

    return {
      success: true,
      count: dto.room_ids.length,
      message: `Đã gán nhóm phòng cho ${dto.room_ids.length} phòng.`,
    };
  }

  // ==========================================================================
  // H. TẠO NHIỀU PHÒNG NÂNG CẤP (BATCH CREATE V2 - MULTI-GROUP & FEATURES)
  // ==========================================================================

  async newBatchCreateRooms(dto: NewBatchCreateRoomsDto, actor: string) {
    if (!dto.apartment_id) {
      throw new BadRequestException('Chi nhánh (apartment_id) là bắt buộc.');
    }
    if (!dto.groups || !Array.isArray(dto.groups) || dto.groups.length === 0) {
      throw new BadRequestException('Cần ít nhất một nhóm phòng trong danh sách tạo.');
    }

    // 1. Kiểm tra chi nhánh
    const [apartment] = await this.dataSource.query(`SELECT id, name FROM APARTMENT WHERE id = ?`, [
      dto.apartment_id,
    ]);
    if (!apartment) {
      throw new BadRequestException(`Chi nhánh #${dto.apartment_id} không tồn tại.`);
    }

    // 2. Chuyển đổi dữ liệu sang format của buildBatchPlan
    const batchGroups = dto.groups.map((g) => ({
      label: g.label || 'Nhóm',
      roomGroupId: g.roomGroupId || null,
      roomTypeId: g.roomTypeId,
      featureIds: g.featureIds || [],
      note: g.note || '',
      roomNumbers: g.roomNumbers || [],
    }));

    const commonConfig = {
      defaultStatus: dto.default_status || 'available',
      commonFeatureIds: dto.common_feature_ids || [],
    };

    const planResult = buildBatchPlan(batchGroups, commonConfig);

    const errors: Array<{ group: string; roomNumber: string; code: string; message: string }> = [];

    // Thêm các lỗi từ parser/planner
    for (const pe of planResult.errors) {
      errors.push({
        group: 'Cấu hình',
        roomNumber: '-',
        code: 'SYNTAX',
        message: pe,
      });
    }

    // Báo lỗi trùng giữa các nhóm
    for (const dup of planResult.duplicatesWithinBatch) {
      errors.push({
        group: 'Nhiều nhóm',
        roomNumber: dup,
        code: 'DUPLICATE_IN_BATCH',
        message: `Số phòng ${dup} bị xuất hiện trùng lặp giữa các nhóm trong đợt tạo này.`,
      });
    }

    // Kiểm tra giới hạn tối đa 100 phòng
    if (planResult.plan.length > 100) {
      errors.push({
        group: 'Toàn đợt',
        roomNumber: '-',
        code: 'LIMIT_EXCEEDED',
        message: `Tổng số phòng tạo một lần (${planResult.plan.length}) vượt quá giới hạn tối đa cho phép (100 phòng).`,
      });
    }

    // 3. Kiểm tra các loại phòng và nhóm phòng trong DB
    const roomTypeIds = Array.from(new Set(batchGroups.map((g) => g.roomTypeId)));
    for (const rtId of roomTypeIds) {
      const [rt] = await this.dataSource.query(
        `SELECT id, name, apartment_id, is_active FROM room_types WHERE id = ?`,
        [rtId],
      );
      if (!rt) {
        errors.push({
          group: 'Loại phòng',
          roomNumber: '-',
          code: 'INVALID_ROOM_TYPE',
          message: `Không tìm thấy loại phòng #${rtId}.`,
        });
      } else if (Number(rt.apartment_id) !== Number(dto.apartment_id)) {
        errors.push({
          group: 'Loại phòng',
          roomNumber: '-',
          code: 'INVALID_ROOM_TYPE',
          message: `Loại phòng "${rt.name}" không thuộc chi nhánh #${dto.apartment_id}.`,
        });
      }
    }

    // Kiểm tra các nhóm phòng
    const roomGroupIds = Array.from(
      new Set(batchGroups.map((g) => g.roomGroupId).filter((id): id is number => id !== null && id !== undefined)),
    );
    for (const rgId of roomGroupIds) {
      const [rg] = await this.dataSource.query(
        `SELECT id, name, is_active FROM room_groups WHERE id = ?`,
        [rgId],
      );
      if (!rg || !rg.is_active) {
        errors.push({
          group: 'Nhóm phòng',
          roomNumber: '-',
          code: 'INVALID_FEATURE',
          message: `Nhóm phòng #${rgId} không tồn tại hoặc đã bị vô hiệu hóa.`,
        });
      }
    }

    // 4. Kiểm tra trùng với các phòng đã có trong DB
    const existingRooms = await this.dataSource.query(
      `SELECT room_number FROM ROOMS WHERE apartment_id = ? AND deleted_at IS NULL`,
      [dto.apartment_id],
    );
    const existingNumbers = new Set(existingRooms.map((r: any) => normalizeRoomNumber(r.room_number)));

    for (const r of planResult.plan) {
      if (existingNumbers.has(r.roomNumber)) {
        errors.push({
          group: r.label,
          roomNumber: r.roomNumber,
          code: 'DUPLICATE_EXISTING',
          message: `Số phòng ${r.roomNumber} đã tồn tại tại chi nhánh này.`,
        });
      }
    }

    // NẾU LÀ DRY RUN
    if (dto.dry_run) {
      return {
        success: errors.length === 0,
        totalPlanned: planResult.plan.length,
        errors,
        plan: planResult.plan,
      };
    }

    // Nếu không phải dry-run và có lỗi -> ném ngoại lệ
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Dữ liệu tạo nhiều phòng không hợp lệ. Vui lòng kiểm tra lại danh sách lỗi.',
        errors,
      });
    }

    // 5. THỰC HIỆN LƯU VÀO DATABASE BẰNG 1 TRANSACTION
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const createdRooms: string[] = [];
      const itemStatus = dto.default_status || 'available';

      for (const item of planResult.plan) {
        // Double-check race condition
        const [dupCheck] = await queryRunner.query(
          `SELECT room_id FROM ROOMS WHERE apartment_id = ? AND room_number = ? AND deleted_at IS NULL FOR UPDATE`,
          [dto.apartment_id, item.roomNumber],
        );
        if (dupCheck) {
          throw new BadRequestException(
            `Xung đột đồng thời: Số phòng ${item.roomNumber} vừa được tạo bởi người khác. Vui lòng thử lại.`,
          );
        }

        const insertRes = await queryRunner.query(
          `INSERT INTO ROOMS (apartment_id, room_type_id, room_number, floor, room_group_id, note, housekeeping, status, is_hidden, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'clean', ?, 0, NOW(), NOW())`,
          [
            dto.apartment_id,
            item.roomTypeId,
            item.roomNumber,
            item.floor ?? 0,
            item.roomGroupId || null,
            item.note?.trim() || null,
            itemStatus,
          ],
        );
        const newRoomId = insertRes.insertId;

        // Lưu features
        if (item.featureIds && item.featureIds.length > 0) {
          for (const featId of item.featureIds) {
            await queryRunner.query(
              `INSERT IGNORE INTO room_feature_map (room_id, feature_id) VALUES (?, ?)`,
              [newRoomId, featId],
            );
          }
        }

        // Tạo room_block nếu trạng thái là maintenance
        if (itemStatus === 'maintenance') {
          await queryRunner.query(
            `INSERT INTO room_blocks (room_id, from_at, to_at, reason, created_by, created_at)
             VALUES (?, NOW(), NULL, 'Khởi tạo bảo trì khi tạo hàng loạt', ?, NOW())`,
            [newRoomId, actor],
          );
        }

        createdRooms.push(item.roomNumber);
      }

      await queryRunner.commitTransaction();

      // Ghi 1 dòng audit log cho cả đợt
      await this.auditLogService.log({
        actor,
        action: 'BATCH_CREATE_ROOMS_V2',
        entity_type: 'ROOMS',
        entity_id: dto.apartment_id,
        new_value: {
          apartment_id: dto.apartment_id,
          total_created: createdRooms.length,
          groups_count: dto.groups.length,
          created_rooms: createdRooms,
        },
      });

      return {
        success: true,
        createdCount: createdRooms.length,
        createdRooms,
        message: `Đã tạo thành công ${createdRooms.length} phòng mới cho chi nhánh "${apartment.name}".`,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
