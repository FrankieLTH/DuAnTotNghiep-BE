import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Room, RoomType, RoomFeature } from '../../entities/room.entity';
import { Booking, BookingRoom, AuditLog } from '../../entities/booking.entity';
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
  parent_id?: number;
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
  room_group_id?: number | string | null;
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
  room_group_id?: number | string | null;
  note?: string;
  housekeeping?: 'clean' | 'dirty';
  status?: 'available' | 'maintenance';
  lock_id?: number | null;
  special_features?: string;
  feature_ids?: number[];
}

export interface BatchGroupItem {
  label: string;
  parentRoomTypeId?: number;
  roomGroupId?: number | string | null;
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
  initial_block_reason?: string;
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
  room_group_id: number | string | null;
}

export interface CreateRoomGroupDto {
  name: string;
}

export interface CreateRoomFeatureDto {
  name: string;
  category: 'view' | 'sunlight' | 'comfort' | 'amenity';
  extra_price_per_night?: number;
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
    const params: any[] = targetAptId ? [targetAptId] : [];
    const aptFilter = targetAptId ? ' AND rt.apartment_id = ?' : '';
    const parents = await this.dataSource.query(
      `SELECT rt.id, rt.name, rt.apartment_id, a.name AS apartment_name, rt.base_price, rt.max_occupancy, rt.description, rt.bed_config, rt.area, rt.is_active, rt.created_at,
        (SELECT COUNT(*) FROM ROOMS r JOIN room_types c ON c.id = r.room_type_id WHERE c.parent_id = rt.id AND r.deleted_at IS NULL) AS total_rooms,
        (SELECT COUNT(*) FROM ROOMS r JOIN room_types c ON c.id = r.room_type_id WHERE c.parent_id = rt.id AND r.deleted_at IS NULL AND r.is_hidden = 0) AS active_rooms
       FROM room_types rt LEFT JOIN APARTMENT a ON a.id = rt.apartment_id
       WHERE rt.parent_id IS NULL${aptFilter} ORDER BY rt.apartment_id ASC, rt.id ASC`,
      params,
    );
    const children = await this.dataSource.query(
      `SELECT c.id, c.parent_id, c.name, c.base_price, c.max_occupancy, c.bed_config, c.is_active,
        (SELECT COUNT(*) FROM ROOMS r WHERE r.room_type_id = c.id AND r.deleted_at IS NULL) AS total_rooms
       FROM room_types c WHERE c.parent_id IS NOT NULL${targetAptId ? ' AND c.apartment_id = ?' : ''} ORDER BY c.base_price ASC, c.id ASC`,
      params,
    );
    for (const row of parents) {
      const images = await this.dataSource.query(`SELECT id, image_url FROM ROOM_IMAGES WHERE room_types_id = ?`, [row.id]);
      const amenities = await this.dataSource.query(
        `SELECT am.id, am.name, am.category FROM ROOM_AMENITIES ra JOIN amenities am ON am.id = ra.amenity_id WHERE ra.room_types_id = ?`,
        [row.id],
      );
      row.images = images.map((img: any) => img.image_url);
      row.amenities = amenities;
      row.total_rooms = Number(row.total_rooms || 0);
      row.active_rooms = Number(row.active_rooms || 0);
      row.is_active = Boolean(row.is_active);
      row.variants = children
        .filter((c: any) => Number(c.parent_id) === Number(row.id))
        .map((c: any) => ({ ...c, base_price: Number(c.base_price), total_rooms: Number(c.total_rooms || 0), is_active: Boolean(c.is_active) }));
    }
    return parents;
  }
  /**
   * 2. CHI TIẾT LOẠI PHÒNG  /**
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

    let inherit: any = null;
    if (dto.parent_id) {
      const [par] = await this.dataSource.query(`SELECT * FROM room_types WHERE id = ?`, [dto.parent_id]);
      if (!par) throw new BadRequestException(`Không tìm thấy loại phòng cha #${dto.parent_id}`);
      if (par.parent_id) throw new BadRequestException('Variants must be attached directly to a room type.');
      if (Number(par.apartment_id) !== Number(dto.apartment_id)) throw new BadRequestException('Variant and parent room type must belong to the same branch.');
      inherit = par;
    }
    if (dto.parent_id && Number(dto.base_price) <= 0) throw new BadRequestException('Variant price must be greater than zero.');
    const [duplicate] = dto.parent_id
      ? await this.dataSource.query('SELECT id FROM room_types WHERE parent_id = ? AND LOWER(name) = LOWER(?) LIMIT 1', [dto.parent_id, dto.name.trim()])
      : await this.dataSource.query('SELECT id FROM room_types WHERE apartment_id = ? AND parent_id IS NULL AND LOWER(name) = LOWER(?) LIMIT 1', [dto.apartment_id, dto.name.trim()]);
    if (duplicate) throw new BadRequestException('Room type or variant name already exists.');
    const res = await this.dataSource.query(
      `INSERT INTO room_types (name, base_price, max_occupancy, apartment_id, description, bed_config, area, is_active, parent_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        dto.name.trim(),
        Number(dto.base_price || 0),
        Number(dto.max_occupancy || inherit?.max_occupancy || 2),
        dto.apartment_id,
        dto.description || inherit?.description || '',
        dto.bed_config || inherit?.bed_config || '1 giường đôi',
        Number(dto.area || inherit?.area || 28),
        dto.is_active !== false ? 1 : 0,
        dto.parent_id || null,
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
    // Variants own only their name and price; descriptive room data is inherited from their parent.
    if (!rt.parent_id) {
      await this.dataSource.query(
        `UPDATE room_types SET max_occupancy = ?, description = ?, bed_config = ?, area = ? WHERE parent_id = ?`,
        [updated.max_occupancy, updated.description, updated.bed_config, updated.area, id],
      );
    }

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
      rt.parent_id
        ? `SELECT room_id, room_number, apartment_id FROM ROOMS WHERE room_type_id = ? AND is_hidden = 0`
        : `SELECT r.room_id, r.room_number, r.apartment_id FROM ROOMS r JOIN room_types v ON v.id = r.room_type_id WHERE v.parent_id = ? AND r.is_hidden = 0`,
      [rt.parent_id || id],
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

  async deleteRoomType(id: number, actor: string) {
    const [rt] = await this.dataSource.query(`SELECT * FROM room_types WHERE id = ?`, [id]);
    if (!rt) throw new NotFoundException(`Không tìm thấy loại phòng #${id}`);
    if (!rt.parent_id) {
      const children = await this.dataSource.query(`SELECT id FROM room_types WHERE parent_id = ?`, [id]);
      const ids = [id, ...children.map((child: any) => Number(child.id))];
      const placeholders = ids.map(() => '?').join(',');
      const rooms = await this.dataSource.query(`SELECT room_number FROM ROOMS WHERE room_type_id IN (${placeholders}) AND deleted_at IS NULL`, ids);
      if (rooms.length) throw new BadRequestException(`Cannot delete this room type while it has ${rooms.length} physical rooms.`);
      const [booked] = await this.dataSource.query(`SELECT COUNT(*) AS c FROM Booking_rooms WHERE room_types_id IN (${placeholders})`, ids);
      const [legacy] = await this.dataSource.query(`SELECT COUNT(*) AS c FROM BOOKINGS WHERE room_type_id IN (${placeholders})`, ids);
      if (Number(booked.c) + Number(legacy.c) > 0) throw new BadRequestException('Cannot delete a room type referenced by bookings; hide it to preserve history.');
      await this.dataSource.query(`DELETE FROM ROOM_IMAGES WHERE room_types_id IN (${placeholders})`, ids);
      await this.dataSource.query(`DELETE FROM ROOM_AMENITIES WHERE room_types_id IN (${placeholders})`, ids);
      if (children.length) await this.dataSource.query(`DELETE FROM room_types WHERE id IN (${children.map(() => '?').join(',')})`, children.map((child: any) => Number(child.id)));
      await this.dataSource.query(`DELETE FROM room_types WHERE id = ?`, [id]);
      await this.auditLogService.log({ actor, action: 'DELETE_ROOM_TYPE', entity_type: 'room_types', entity_id: id, old_value: { name: rt.name }, new_value: null });
      return { success: true, message: 'Room type and its unused variants were deleted.' };
    }
    const rooms = await this.dataSource.query(`SELECT room_id, room_number FROM ROOMS WHERE room_type_id = ? AND deleted_at IS NULL`, [id]);
    if (rooms.length) {
      throw new BadRequestException(`Không thể xóa biến thể "${rt.name}": còn ${rooms.length} phòng (${rooms.map((r: any) => r.room_number).join(', ')}) thuộc biến thể này. Hãy chuyển phòng sang biến thể khác hoặc xóa phòng trước.`);
    }
    const [booked] = await this.dataSource.query(`SELECT COUNT(*) AS c FROM Booking_rooms WHERE room_types_id = ?`, [id]);
    const [legacy] = await this.dataSource.query(`SELECT COUNT(*) AS c FROM BOOKINGS WHERE room_type_id = ?`, [id]);
    if (Number(booked.c) + Number(legacy.c) > 0) {
      throw new BadRequestException(`Không thể xóa biến thể "${rt.name}": đã có đơn đặt phòng tham chiếu. Hãy ẩn (ngừng bán) thay vì xóa để giữ lịch sử.`);
    }
    await this.dataSource.query(`DELETE FROM room_types WHERE id = ?`, [id]);
    await this.auditLogService.log({
      actor,
      action: 'DELETE_ROOM_TYPE',
      entity_type: 'room_types',
      entity_id: id,
      old_value: { name: rt.name, base_price: rt.base_price },
      new_value: null,
    });
    return { success: true, message: `Đã xóa biến thể "${rt.name}".` };
  }  // ==========================================================================
  // B. QUẢN LÝ PHÒNG CỤ THỂ (ROOMS)
  // ==========================================================================

  /**
   * 1. LẤY DANH SÁCH PHÒNG CỤ THỂ
   * - Manager: Bắt buộc lọc theo apartmentId của mình.
   * - Trả về trạng thái khóa thông minh đi kèm.
   */
  async getRooms(filter: { apartment_id?: number; room_type_id?: number; status?: string; is_hidden?: boolean }, staff: StaffContext) {
    const qb = this.dataSource.getRepository(Room).createQueryBuilder('r').leftJoinAndSelect('r.apartment','a').leftJoinAndSelect('r.room_type','rt').leftJoinAndSelect('rt.parent','rtp').where('r.deleted_at IS NULL');
    const apt = staff.role === 'manager' ? staff.apartmentId || 1 : filter.apartment_id;
    if (apt) qb.andWhere('r.apartment_id=:apt',{apt});
    if (filter.room_type_id) qb.andWhere('r.room_type_id=:type',{type:filter.room_type_id});
    if (filter.status) qb.andWhere('r.status=:status',{status:filter.status});
    if (filter.is_hidden !== undefined) qb.andWhere('r.is_hidden=:hidden',{hidden:filter.is_hidden});
    const rooms = await qb.orderBy('r.apartment_id').addOrderBy('r.floor').addOrderBy('r.room_number').getMany();
    const catalog = await this.getRoomFeatures();
    const locks = await this.dataSource.query('SELECT * FROM `lock` WHERE deleted_at IS NULL');
    const occupied = await this.dataSource.query("SELECT DISTINCT br.room_id FROM Booking_rooms br JOIN BOOKINGS b ON b.id=br.bookings_id WHERE b.booking_status='checked_in' UNION SELECT room_id FROM BOOKINGS WHERE booking_status='checked_in' AND room_id IS NOT NULL");
    return rooms.map(r => {
      const features = catalog.filter(f => this.jsonArray(r.feature_ids).includes(f.id));
      const active = this.jsonArray(r.blocked_periods).filter(b => new Date(b.from_at) <= new Date() && (!b.to_at || new Date(b.to_at) > new Date()));
      const display_status = computeRoomDisplayStatus({housekeeping:r.housekeeping},active.length ? active : r.status === 'maintenance' ? [{id:0,room_id:r.id,from_at:new Date(),to_at:null,reason:'maintenance'}] : [], occupied.some(x=>x.room_id===r.id));
      const lock = locks.find(l=>l.room_id===r.id);
      return { ...r, room_id:r.id, apartment_name:r.apartment?.name, room_type_parent_id:r.room_type?.parent?.id||null, room_type_parent_name:r.room_type?.parent?.name||r.room_type?.name, room_type_name:r.room_type?.parent?.name||r.room_type?.name, variant_name:r.room_type?.name, room_group_id:r.room_group_name || null, features, feature_ids:[], feature_surcharge_per_night:0, base_price:Number(r.room_type?.base_price||0), effective_price_per_night:Number(r.room_type?.base_price||0), display_status, is_ready_for_booking:display_status==='Sẵn sàng' && !r.is_hidden, lock:lock?{id:lock.id,lock_name:lock.lock_name,cloud_lock_id:lock.cloud_lock_id,lock_status:lock.lock_status,battery_level:lock.battery_level,last_sync_at:lock.last_sync_at}:null };
    });
  }

  async getRoomById(roomId: number, staff: StaffContext) {
    const rows = await this.getRooms({},staff); const room=rows.find(r=>r.room_id===roomId);
    if(!room) throw new NotFoundException('Không tìm thấy phòng trong chi nhánh được phép.'); return room;
  }

  async createRoom(dto: CreateRoomDto, actor: string) {
    const number=normalizeRoomNumber(String(dto.room_number||''));const floor=dto.floor??suggestFloor(number)??0;
    if(!number||number.length>50||!Number.isInteger(floor)||floor<0||floor>200||!['available','maintenance'].includes(dto.status||'available'))throw new BadRequestException('Số phòng, tầng hoặc trạng thái không hợp lệ.');
    if(dto.status==='maintenance'&&!dto.initial_block_reason?.trim())throw new BadRequestException('Cần nhập lý do bảo trì khi tạo phòng.');
    const group=this.groupName(dto.room_group_id);
    try{return await this.dataSource.transaction(async m=>{
      const type=await m.getRepository(RoomType).findOne({where:{id:dto.room_type_id,is_active:true},lock:{mode:'pessimistic_write'}});
      if(!type||type.apartment_id!==dto.apartment_id)throw new BadRequestException('Loại phòng phải thuộc đúng chi nhánh.');
      const ids=await this.validateFeatureIds(dto.feature_ids||[],m);
      if(dto.lock_id){const [lock]=await m.query('SELECT * FROM `lock` WHERE id=? FOR UPDATE',[dto.lock_id]);if(!lock||lock.deleted_at||lock.room_id)throw new BadRequestException('Khóa không khả dụng.');}
      const blocks=dto.status==='maintenance'?[{id:1,room_id:0,from_at:new Date().toISOString(),to_at:null,reason:dto.initial_block_reason.trim().slice(0,500),created_by:actor,created_at:new Date().toISOString()}]:[];
      const row=await m.getRepository(Room).save(m.getRepository(Room).create({apartment_id:dto.apartment_id,room_type_id:dto.room_type_id,room_number:number,floor,room_group_name:group,note:dto.note?.slice(0,2000)||null,special_features:dto.special_features?.trim().slice(0,500)||null,housekeeping:'clean',status:'available',feature_ids:ids,blocked_periods:blocks,is_hidden:false}));
      if(blocks.length){blocks[0].room_id=row.id;await m.getRepository(Room).update(row.id,{blocked_periods:blocks});}
      if(dto.lock_id)await m.query('UPDATE `lock` SET room_id=? WHERE id=?',[row.id,dto.lock_id]);
      await this.roomAudit(m,actor,'CREATE_ROOM',row.id,null,row);return {success:true,room_id:row.id,message:'Tạo phòng mới thành công.'};
    });}catch(e){if(e?.code==='ER_DUP_ENTRY')throw new BadRequestException('Số phòng đã tồn tại trong chi nhánh.');throw e;}
  }

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
    const initial=await this.dataSource.getRepository(Room).findOneBy({id:roomId});
    if(!initial) throw new NotFoundException('Không tìm thấy phòng.');
    await this.dataSource.transaction(async m=>{
      const typeIds=[...new Set([initial.room_type_id,dto.room_type_id||initial.room_type_id])].sort((a,b)=>a-b);
      for(const id of typeIds) await m.getRepository(RoomType).findOne({where:{id},lock:{mode:'pessimistic_write'}});
      const room=await m.getRepository(Room).findOne({where:{id:roomId},lock:{mode:'pessimistic_write'}});
      if(!room || room.deleted_at) throw new NotFoundException('Không tìm thấy phòng.');
      const type=await m.getRepository(RoomType).findOneBy({id:dto.room_type_id||room.room_type_id});
      if(!type || type.apartment_id!==(dto.apartment_id||room.apartment_id)) throw new BadRequestException('Loại phòng phải thuộc đúng chi nhánh.');
      if(type.id!==room.room_type_id || type.apartment_id!==room.apartment_id){
        const [active]=await m.query("SELECT br.id FROM Booking_rooms br JOIN BOOKINGS b ON b.id=br.bookings_id WHERE br.room_id=? AND (b.booking_status IN ('confirmed','checked_in') OR (b.booking_status IN ('draft','pending_payment') AND b.hold_expires_at>NOW())) AND b.booked_end_time>NOW() LIMIT 1",[roomId]);
        if(active) throw new BadRequestException('Phòng đang có đơn hiệu lực, chưa thể đổi loại phòng/chi nhánh.');
      }
      const featureIds=dto.feature_ids!==undefined?await this.validateFeatureIds(dto.feature_ids,m,this.jsonArray(room.feature_ids)):this.jsonArray(room.feature_ids);
      const next={...room,room_type_id:type.id,apartment_id:type.apartment_id,room_number:dto.room_number!==undefined?normalizeRoomNumber(dto.room_number):room.room_number,floor:dto.floor??room.floor,room_group_name:dto.room_group_id!==undefined?this.groupName(dto.room_group_id):room.room_group_name,note:dto.note!==undefined?String(dto.note).slice(0,2000):room.note,special_features:dto.special_features!==undefined?String(dto.special_features||'').trim().slice(0,500):room.special_features,feature_ids:featureIds,housekeeping:dto.housekeeping||room.housekeeping,status:dto.status||room.status};
      if(!next.room_number || !Number.isInteger(next.floor) || next.floor<0 || next.floor>200 || !['clean','dirty'].includes(next.housekeeping) || !['available','occupied','cleaning','maintenance'].includes(next.status)) throw new BadRequestException('Thông tin phòng không hợp lệ.');
      await m.getRepository(Room).save(next as any);
      if(dto.lock_id!==undefined) {
        if(dto.lock_id!==null){const [lock]=await m.query('SELECT * FROM `lock` WHERE id=? FOR UPDATE',[dto.lock_id]);if(!lock||lock.deleted_at||lock.room_id&&lock.room_id!==roomId)throw new BadRequestException('Khóa không khả dụng.');}
        await m.query('UPDATE `lock` SET room_id=NULL WHERE room_id=?',[roomId]);if(dto.lock_id)await m.query('UPDATE `lock` SET room_id=? WHERE id=?',[roomId,dto.lock_id]);
      }
      await this.roomAudit(m,actor,'UPDATE_ROOM',roomId,room,next);
    });
    return {success:true,message:'Đã lưu thông tin, đặc điểm và phụ thu phòng.'};
  }

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
  private jsonArray(value: any): any[] { if(typeof value==='string'){try{value=JSON.parse(value);}catch{return [];}} return Array.isArray(value)?value:[]; }
  private async floorCapacityErrors(apartmentId: number, plan: any[], manager: any = this.dataSource): Promise<any[]> {
    const existing = await manager.query('SELECT room_number, floor FROM ROOMS WHERE apartment_id = ? AND deleted_at IS NULL', [apartmentId]);
    const counts = new Map<number, number>();
    for (const room of existing) {
      const floor = Number(room.floor) > 0 ? Number(room.floor) : suggestFloor(String(room.room_number || '')) ?? 0;
      counts.set(floor, (counts.get(floor) || 0) + 1);
    }
    const requested = new Map<number, number>();
    for (const item of plan) {
      const floor = Number(item.floor ?? suggestFloor(String(item.roomNumber || '')) ?? 0);
      requested.set(floor, (requested.get(floor) || 0) + 1);
    }
    return [...requested.entries()]
      .filter(([floor, count]) => (counts.get(floor) || 0) + count > 20)
      .map(([floor]) => ({ group: `Floor ${floor}`, roomNumber: '-', code: 'FLOOR_LIMIT', message: 'A floor can contain at most 20 rooms.' }));
  }
  private groupName(value: any): string | null { if(value===null||value===undefined||value==='')return null; if(typeof value!=='string'||value.trim().length>100)throw new BadRequestException('Nhóm phòng là tên tối đa 100 ký tự.'); return value.trim()||null; }
  private async validateFeatureIds(value:any,manager:any=this.dataSource.manager,existing:number[]=[]):Promise<number[]> {
    if(!Array.isArray(value)||value.length>50||value.some(id=>!Number.isInteger(id)||id<1))throw new BadRequestException('Danh sách đặc điểm không hợp lệ.');
    const ids=[...new Set<number>(value)];if(!ids.length)return [];
    throw new BadRequestException('Đặc điểm có giá riêng phải được tạo thành biến thể loại phòng.');
    return [];
  }
  private async roomAudit(m:any,actor:string,action:string,id:number,oldValue:any,newValue:any){await m.getRepository(AuditLog).save({actor,action,entity_type:'ROOMS',entity_id:id,old_value:oldValue?JSON.stringify(oldValue):null,new_value:newValue?JSON.stringify(newValue):null});}

  async getRoomGroups(onlyActive=false){const rows=await this.dataSource.query("SELECT DISTINCT room_group_name AS name FROM ROOMS WHERE deleted_at IS NULL AND room_group_name IS NOT NULL AND room_group_name<>'' ORDER BY room_group_name");return rows.map(r=>({id:r.name,name:r.name,is_active:true}));}
  async createRoomGroup(dto:CreateRoomGroupDto,actor:string){throw new BadRequestException('Nhập tên nhóm trực tiếp khi tạo hoặc sửa phòng.');}
  async updateRoomGroup(id:number,name:string,actor:string){throw new BadRequestException('Sửa tên nhóm trên phòng hoặc dùng gán nhóm hàng loạt.');}
  async toggleRoomGroup(id:number,actor:string){throw new BadRequestException('Nhóm là thuộc tính của phòng; dùng gán nhóm hàng loạt để thay đổi.');}

  async getRoomFeatures(onlyActive=false):Promise<RoomFeature[]>{return [];}
  async createAmenity(nameInput:string,categoryInput:string,actor:string){
    const name=String(nameInput||'').trim();
    const category=String(categoryInput||'Tiện nghi').trim();
    if(!name||name.length>100||!category||category.length>100)throw new BadRequestException('Tên hoặc nhóm tiện ích không hợp lệ.');
    const [existing]=await this.dataSource.query('SELECT id FROM amenities WHERE LOWER(name)=LOWER(?) LIMIT 1',[name]);
    if(existing)throw new BadRequestException('Tiện ích đã có trong danh mục.');
    const result=await this.dataSource.query('INSERT INTO amenities (name,category) VALUES (?,?)',[name,category]);
    await this.auditLogService.log({actor,action:'CREATE_AMENITY',entity_type:'amenities',entity_id:result.insertId,new_value:{name,category}});
    return {id:result.insertId,name,category};
  }
  private featureInput(dto:any,current?:RoomFeature){const name=String(dto.name??current?.name??'').trim();const category=dto.category??current?.category;const price=dto.extra_price_per_night??Number(current?.extra_price_per_night||0);if(!name||name.length>100||!['view','sunlight','comfort','amenity'].includes(category)||typeof price!=='number'||!Number.isSafeInteger(price)||price<0||price>100000000)throw new BadRequestException('Tên, danh mục hoặc phụ thu mỗi đêm không hợp lệ. Phụ thu phải là số nguyên từ 0 đến 100.000.000đ.');return {name,category,extra_price_per_night:price};}
  async createRoomFeature(dto:CreateRoomFeatureDto,actor:string){throw new BadRequestException('Hãy tạo biến thể loại phòng với giá trọn gói.');}
  async updateRoomFeature(id:number,dto:Partial<CreateRoomFeatureDto>,actor:string){throw new BadRequestException('Hãy chỉnh giá của biến thể loại phòng.');}
  async toggleRoomFeature(id:number,actor:string){throw new BadRequestException('Danh mục đặc điểm đã được thay bằng biến thể loại phòng.');}

  async updateHousekeeping(roomId:number,housekeeping:'clean'|'dirty',staff:StaffContext){if(!['clean','dirty'].includes(housekeeping))throw new BadRequestException('Trạng thái dọn dẹp không hợp lệ.');await this.getRoomById(roomId,staff);await this.dataSource.getRepository(Room).update(roomId,{housekeeping});return {success:true,message:'Đã cập nhật dọn dẹp.'};}
  async softDeleteRoom(roomId:number,actor:string){const [active]=await this.dataSource.query("SELECT br.id FROM Booking_rooms br JOIN BOOKINGS b ON b.id=br.bookings_id WHERE br.room_id=? AND (b.booking_status IN ('confirmed','checked_in') OR (b.booking_status IN ('draft','pending_payment') AND b.hold_expires_at>NOW())) AND b.booked_end_time>NOW() LIMIT 1",[roomId]);if(active)throw new BadRequestException('Phòng đang có đơn hiệu lực, chưa thể xóa.');await this.dataSource.getRepository(Room).update(roomId,{deleted_at:new Date(),is_hidden:true});return {success:true,message:'Đã lưu trữ phòng.'};}
  async getRoomBlocks(roomId:number){const room=await this.dataSource.getRepository(Room).findOneBy({id:roomId});if(!room||room.deleted_at)throw new NotFoundException('Không tìm thấy phòng.');return this.jsonArray(room.blocked_periods).sort((a,b)=>new Date(b.from_at).getTime()-new Date(a.from_at).getTime());}
  async createRoomBlock(roomId:number,dto:CreateRoomBlockDto,actor:string){
    const initial=await this.dataSource.getRepository(Room).findOneBy({id:roomId});if(!initial)throw new NotFoundException('Không tìm thấy phòng.');
    const start=new Date(dto.from_at),end=dto.to_at?new Date(dto.to_at):null;
    if(!Number.isFinite(start.getTime())||end&&(!Number.isFinite(end.getTime())||end<=start)||!dto.reason?.trim()||dto.reason.length>500)throw new BadRequestException('Thời gian hoặc lý do chặn phòng không hợp lệ.');
    return this.dataSource.transaction(async m=>{
      await m.getRepository(RoomType).findOne({where:{id:initial.room_type_id},lock:{mode:'pessimistic_write'}});
      const room=await m.getRepository(Room).findOne({where:{id:roomId},lock:{mode:'pessimistic_write'}});if(!room||room.deleted_at)throw new NotFoundException('Không tìm thấy phòng.');
      const conflicts=await m.query("SELECT DISTINCT b.id,b.booking_code,b.booked_start_time,b.booked_end_time FROM BOOKINGS b LEFT JOIN Booking_rooms br ON br.bookings_id=b.id WHERE (br.room_id=? OR b.room_id=? OR (br.room_id IS NULL AND br.room_types_id=?)) AND (b.booking_status IN ('confirmed','checked_in') OR (b.booking_status IN ('draft','pending_payment') AND b.hold_expires_at>NOW())) AND b.booked_end_time>? AND (? IS NULL OR b.booked_start_time<?)",[roomId,roomId,room.room_type_id,start,end,end]);
      if(conflicts.length&&!dto.confirm)return {success:false,conflict:true,affected_bookings:conflicts,message:'Lịch chặn trùng đơn đang có hiệu lực. Hãy kiểm tra trước khi xác nhận.'};
      const blocks=this.jsonArray(room.blocked_periods);if(blocks.length>=500)throw new BadRequestException('Phòng đã có nhiều lịch chặn; cần kiểm tra và dọn lịch cũ.');
      const id=blocks.reduce((max,b)=>Math.max(max,Number(b.id)||0),0)+1;const block={id,room_id:roomId,from_at:start.toISOString(),to_at:end?.toISOString()||null,reason:dto.reason.trim(),created_by:actor,created_at:new Date().toISOString()};
      room.blocked_periods=[...blocks,block];await m.getRepository(Room).save(room);await this.roomAudit(m,actor,'CREATE_ROOM_BLOCK',roomId,null,block);return {success:true,block_id:id,message:'Đã lưu lịch chặn/bảo trì phòng.'};
    });
  }
  async deleteRoomBlock(roomId:number,blockId:number,actor:string){return this.dataSource.transaction(async m=>{const room=await m.getRepository(Room).findOne({where:{id:roomId},lock:{mode:'pessimistic_write'}});if(!room)throw new NotFoundException('Không tìm thấy phòng.');const blocks=this.jsonArray(room.blocked_periods),block=blocks.find(b=>b.id===blockId);if(!block)throw new NotFoundException('Không tìm thấy lịch chặn.');room.blocked_periods=blocks.filter(b=>b.id!==blockId);await m.getRepository(Room).save(room);await this.roomAudit(m,actor,'DELETE_ROOM_BLOCK',roomId,block,null);return {success:true,message:'Đã gỡ lịch chặn phòng.'};});}

  private async bulkRooms(ids:number[],action:(m:any,r:Room)=>Promise<void>){if(!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(id=>!Number.isInteger(id)||id<1))throw new BadRequestException('Chọn từ 1 đến 100 phòng hợp lệ.');const unique=[...new Set(ids)];return this.dataSource.transaction(async m=>{const rows=await m.getRepository(Room).findByIds(unique);if(rows.length!==unique.length||rows.some(r=>r.deleted_at))throw new BadRequestException('Có phòng không còn khả dụng.');for(const id of [...new Set(rows.map(r=>r.room_type_id))].sort((a,b)=>a-b))await m.getRepository(RoomType).findOne({where:{id},lock:{mode:'pessimistic_write'}});for(const id of unique.sort((a,b)=>a-b)){const room=await m.getRepository(Room).findOne({where:{id},lock:{mode:'pessimistic_write'}});await action(m,room);}return {success:true,count:unique.length,message:`Đã cập nhật ${unique.length} phòng.`};});}
  async bulkAssignFeatures(dto:BulkFeatureDto,actor:string){const add=await this.validateFeatureIds(dto.add_feature_ids||[]);const remove=await this.validateFeatureIds(dto.remove_feature_ids||[],this.dataSource.manager,dto.remove_feature_ids||[]);return this.bulkRooms(dto.room_ids,async(m,r)=>{const old=this.jsonArray(r.feature_ids);r.feature_ids=[...new Set([...old,...add])].filter(id=>!remove.includes(id));await m.getRepository(Room).save(r);await this.roomAudit(m,actor,'BULK_ASSIGN_FEATURES',r.id,old,r.feature_ids);});}
  async bulkAssignGroup(dto:BulkGroupDto,actor:string){const name=this.groupName(dto.room_group_id);return this.bulkRooms(dto.room_ids,async(m,r)=>{const old=r.room_group_name;r.room_group_name=name;await m.getRepository(Room).save(r);await this.roomAudit(m,actor,'BULK_ASSIGN_GROUP',r.id,{name:old},{name});});}

  async newBatchCreateRooms(dto:NewBatchCreateRoomsDto,actor:string){
    if(!Array.isArray(dto.groups)||!dto.groups.length||dto.groups.length>100||!Number.isInteger(dto.apartment_id)||dto.apartment_id<1||!['available','maintenance'].includes(dto.default_status||'available'))throw new BadRequestException('Cấu hình tạo phòng không hợp lệ.');
    if(dto.default_status==='maintenance'&&!dto.initial_block_reason?.trim())throw new BadRequestException('Cần nhập lý do bảo trì ban đầu.');
    const result=buildBatchPlan(dto.groups.map(g=>({...g,featureIds:g.featureIds||[],roomGroupId:g.roomGroupId as any})),{defaultStatus:dto.default_status||'available',commonFeatureIds:dto.common_feature_ids||[]});
    const errors=result.errors.map(message=>({group:'Cấu hình',roomNumber:'-',code:'SYNTAX',message}));
    for (const group of dto.groups) {
      if (!group.parentRoomTypeId) continue; // Legacy clients may omit the parent; the child ID remains authoritative.
      const [variant] = await this.dataSource.query('SELECT id, parent_id, apartment_id FROM room_types WHERE id = ?', [group.roomTypeId]);
      if (!variant || Number(variant.parent_id) !== Number(group.parentRoomTypeId) || Number(variant.apartment_id) !== Number(dto.apartment_id)) {
        errors.push({ group: group.label, roomNumber: '-', code: 'ROOM_VARIANT', message: 'Biến thể đã chọn không thuộc loại phòng hoặc chi nhánh đã chọn.' });
      }
    }
    for(const num of result.duplicatesWithinBatch)errors.push({group:'Nhiều nhóm',roomNumber:num,code:'DUPLICATE_IN_BATCH',message:'Số phòng bị trùng giữa các nhóm.'});
    errors.push(...await this.floorCapacityErrors(dto.apartment_id, result.plan));
    if(!result.plan.length||result.plan.length>100)errors.push({group:'Cấu hình',roomNumber:'-',code:'LIMIT',message:'Mỗi lần tạo từ 1 đến 100 phòng.'});
    for(const item of result.plan){this.groupName(item.roomGroupId);try{await this.validateFeatureIds(item.featureIds);}catch(e){errors.push({group:item.label,roomNumber:item.roomNumber,code:'FEATURE',message:e.message});}const type=await this.dataSource.getRepository(RoomType).findOneBy({id:item.roomTypeId});if(!type||!type.is_active||type.apartment_id!==dto.apartment_id)errors.push({group:item.label,roomNumber:item.roomNumber,code:'ROOM_TYPE',message:'Loại phòng không thuộc chi nhánh hoặc đã ngừng hoạt động.'});const [dup]=await this.dataSource.query('SELECT room_id FROM ROOMS WHERE apartment_id=? AND room_number=?',[dto.apartment_id,item.roomNumber]);if(dup)errors.push({group:item.label,roomNumber:item.roomNumber,code:'DUPLICATE',message:'Số phòng đã tồn tại.'});}
    if(dto.dry_run)return {success:!errors.length,plan:result.plan,errors,room_ids:[],createdCount:0};
    if(errors.length)throw new BadRequestException({message:'Danh sách tạo phòng còn lỗi.',errors});
    const ids=await this.dataSource.transaction(async m=>{
      // Serialize room creation within one branch so concurrent requests cannot exceed the floor cap.
      await m.query('SELECT id FROM APARTMENT WHERE id = ? FOR UPDATE', [dto.apartment_id]);
      for(const id of [...new Set(result.plan.map(i=>i.roomTypeId))].sort((a,b)=>a-b))await m.getRepository(RoomType).findOne({where:{id},lock:{mode:'pessimistic_write'}});
      const capacityErrors = await this.floorCapacityErrors(dto.apartment_id, result.plan, m);
      if (capacityErrors.length) throw new BadRequestException({ message: 'A floor can contain at most 20 rooms.', errors: capacityErrors });
      const created:number[]=[];
      for(const item of result.plan){await this.validateFeatureIds(item.featureIds,m);const room=await m.getRepository(Room).save(m.getRepository(Room).create({apartment_id:dto.apartment_id,room_type_id:item.roomTypeId,room_number:item.roomNumber,floor:item.floor??0,room_group_name:this.groupName(item.roomGroupId),note:item.note||null,housekeeping:'clean',feature_ids:item.featureIds,blocked_periods:dto.default_status==='maintenance'?[{id:1,room_id:0,from_at:new Date().toISOString(),to_at:null,reason:dto.initial_block_reason!.trim().slice(0,500),created_by:actor,created_at:new Date().toISOString()}]:[],status:'available',is_hidden:false}));created.push(room.id);await this.roomAudit(m,actor,'CREATE_ROOM',room.id,null,room);}
      return created;
    });
    return {success:true,plan:result.plan,errors:[],room_ids:ids,createdCount:ids.length,message:`Đã tạo ${ids.length} phòng.`};
  }

}
