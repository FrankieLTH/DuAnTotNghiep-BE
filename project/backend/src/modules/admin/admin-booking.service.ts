// ============================================================================
// ADMIN BOOKING SERVICE (Hoàn chỉnh chức năng Quản lý Booking)
// ============================================================================

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as dayjs from 'dayjs';
import {
  BookingStatus,
  BookingType,
  VerificationStatus,
  BookingSource,
  GuestType,
  DocType,
  GuestSlotStatus,
  TransactionType,
  StaffRole,
  Permission,
  ROLE_PERMISSIONS,
  maskDocumentNumber,
  calculateBookingPrice,
  isChildUnder10,
  HOLD_EXPIRATION_MINUTES,
  EXTENDED_HOLD_MINUTES,
  SIGNED_DOC_URL_TTL_SECONDS,
  REALTIME_EVENTS,
} from '@shared/index';
import { AuditLogService } from './audit-log.service';
import { AutoRoomAssignmentService } from './auto-room-assignment.service';
import { RealtimeSyncService } from './realtime-sync.service';
import { BookingStateMachineService } from './booking-state-machine.service';

export interface BookingFilterDto {
  tab?: 'pending_payment' | 'confirmed' | 'expired' | 'cancelled';
  sub_status?: BookingStatus;
  apartment_id?: number;
  booking_type?: BookingType;
  check_in_from?: string;
  check_in_to?: string;
  room_type_id?: number;
  source?: BookingSource;
  is_waiting_info?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface CurrentStaff {
  id: number;
  role: StaffRole;
  apartment_id: number | null;
  full_name: string;
}

@Injectable()
export class AdminBookingService {
  private readonly logger = new Logger(AdminBookingService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
    private readonly autoRoomAssignmentService: AutoRoomAssignmentService,
    private readonly realtimeSyncService: RealtimeSyncService,
    private readonly stateMachineService: BookingStateMachineService,
  ) {}

  /**
   * Kiểm tra quyền hạn theo permission
   */
  private checkPermission(staff: CurrentStaff, permission: Permission): void {
    const permissions = ROLE_PERMISSIONS[staff.role] || [];
    if (!permissions.includes(permission)) {
      throw new ForbiddenException(`Tài khoản vai trò '${staff.role}' không có quyền thực hiện hành động này.`);
    }
  }

  /**
   * Giới hạn chi nhánh: Manager chỉ được thao tác chi nhánh của mình
   */
  private enforceBranchAccess(staff: CurrentStaff, targetApartmentId?: number | null): number | undefined {
    if (staff.role === StaffRole.MANAGER) {
      if (!staff.apartment_id) {
        throw new ForbiddenException('Tài khoản Quản lý chưa được liên kết với chi nhánh nào.');
      }
      if (targetApartmentId && targetApartmentId !== staff.apartment_id) {
        throw new ForbiddenException('Bạn chỉ có quyền xem và thao tác dữ liệu thuộc chi nhánh được phân công.');
      }
      return staff.apartment_id;
    }
    return targetApartmentId || undefined;
  }

  /**
   * 1. DANH SÁCH BOOKINGS KÈM 4 TABS, BỘ LỌC NÂNG CAO, PHÂN TRANG & SẮP XẾP
   */
  async getBookings(filters: BookingFilterDto, staff: CurrentStaff) {
    this.checkPermission(staff, Permission.VIEW_BOOKINGS);
    const scopedApartmentId = this.enforceBranchAccess(staff, filters.apartment_id);

    const page = Math.max(1, Number(filters.page || 1));
    const limit = Math.min(100, Math.max(1, Number(filters.limit || 15)));
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params: any[] = [];

    // Tab filter
    const tab = filters.tab || 'pending_payment';
    if (tab === 'pending_payment') {
      whereClause += ` AND b.booking_status = 'pending_payment'`;
    } else if (tab === 'confirmed') {
      if (filters.sub_status) {
        whereClause += ` AND b.booking_status = ?`;
        params.push(filters.sub_status);
      } else {
        whereClause += ` AND b.booking_status IN ('confirmed', 'checked_in', 'checked_out')`;
      }
    } else if (tab === 'expired') {
      whereClause += ` AND b.booking_status = 'expired'`;
    } else if (tab === 'cancelled') {
      whereClause += ` AND b.booking_status = 'cancelled'`;
    }

    // Branch filter
    if (scopedApartmentId) {
      whereClause += ` AND b.apartment_id = ?`;
      params.push(scopedApartmentId);
    }

    // Booking Type filter
    if (filters.booking_type) {
      whereClause += ` AND b.booking_type = ?`;
      params.push(filters.booking_type);
    }

    // Date range filter
    if (filters.check_in_from) {
      whereClause += ` AND b.booked_start_time >= ?`;
      params.push(filters.check_in_from);
    }
    if (filters.check_in_to) {
      whereClause += ` AND b.booked_start_time <= ?`;
      params.push(filters.check_in_to);
    }

    // Room type filter
    if (filters.room_type_id) {
      whereClause += ` AND EXISTS (SELECT 1 FROM Booking_rooms br WHERE br.bookings_id = b.id AND br.room_types_id = ?)`;
      params.push(filters.room_type_id);
    }

    // Source filter
    if (filters.source) {
      whereClause += ` AND b.source = ?`;
      params.push(filters.source);
    }

    // "Chờ điền thông tin"
    if (filters.is_waiting_info) {
      whereClause += ` AND (b.verification_status = 'pending' OR EXISTS (SELECT 1 FROM booking_guests bg WHERE bg.bookings_id = b.id AND bg.status IN ('empty', 'uploading', 'ocr_low_confidence')))`;
    }

    // Search query (Mã booking, tên khách, email, số điện thoại)
    if (filters.search && filters.search.trim()) {
      const searchPattern = `%${filters.search.trim()}%`;
      whereClause += ` AND (b.booking_code LIKE ? OR c.full_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR b.lock_email LIKE ?)`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Sắp xếp
    const sortBy = filters.sort_by === 'booked_start_time' ? 'b.booked_start_time' : 'b.created_at';
    const sortOrder = filters.sort_order === 'ASC' ? 'ASC' : 'DESC';

    // Đếm tổng số bản ghi
    const countQuery = `
      SELECT COUNT(DISTINCT b.id) AS total
      FROM BOOKINGS b
      LEFT JOIN CUSTOMER c ON b.customer_id = c.customer_id
      WHERE ${whereClause}
    `;
    const countResult = await this.dataSource.query(countQuery, params);
    const total = Number(countResult[0]?.total || 0);

    // Lấy danh sách phân trang
    const selectQuery = `
      SELECT 
        b.id,
        b.booking_code,
        b.apartment_id,
        apt.name AS apartment_name,
        b.customer_id,
        c.full_name AS customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        b.booking_type,
        b.booked_start_time,
        b.booked_end_time,
        b.check_in_actual,
        b.check_out_actual,
        b.booking_status,
        b.verification_status,
        b.source,
        b.adults,
        b.children,
        b.is_booked_for_other,
        b.lock_email,
        b.total_price,
        b.discount_amount,
        b.hold_expires_at,
        b.created_at
      FROM BOOKINGS b
      LEFT JOIN APARTMENT apt ON b.apartment_id = apt.id
      LEFT JOIN CUSTOMER c ON b.customer_id = c.customer_id
      WHERE ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const rawBookings = await this.dataSource.query(selectQuery, [...params, limit, offset]);

    // Bổ sung thông tin phòng và khách cho từng booking trong trang
    const now = dayjs();
    for (const b of rawBookings) {
      // Đếm ngược hold_expires_at
      if (b.hold_expires_at) {
        const remainingSeconds = Math.max(0, dayjs(b.hold_expires_at).diff(now, 'second'));
        b.hold_remaining_seconds = remainingSeconds;
        b.is_hold_expired = remainingSeconds === 0;
      } else {
        b.hold_remaining_seconds = null;
        b.is_hold_expired = false;
      }

      // Lấy Booking_rooms kèm số phòng hoặc "chưa gán"
      const rooms = await this.dataSource.query(
        `SELECT br.id, br.room_types_id, rt.name AS room_type_name, br.room_id, r.room_number
         FROM Booking_rooms br
         LEFT JOIN room_types rt ON br.room_types_id = rt.id
         LEFT JOIN ROOMS r ON br.room_id = r.room_id
         WHERE br.bookings_id = ?`,
        [b.id]
      );

      b.booking_rooms = rooms.map((r: any) => ({
        ...r,
        room_display: r.room_number ? `Phòng ${r.room_number}` : 'Chưa gán',
      }));

      // Lấy tóm tắt khách và che số giấy tờ tùy thân
      const guests = await this.dataSource.query(
        `SELECT id, guest_type, full_name, doc_type, doc_number, status, doc_deleted_at
         FROM booking_guests
         WHERE bookings_id = ?`,
        [b.id]
      );

      b.guests = guests.map((g: any) => ({
        ...g,
        doc_number_masked: maskDocumentNumber(g.doc_number),
      }));
    }

    return {
      tab,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      items: rawBookings,
    };
  }

  /**
   * 2. CHI TIẾT ĐƠN BOOKING
   */
  async getBookingDetail(bookingId: number, staff: CurrentStaff) {
    this.checkPermission(staff, Permission.VIEW_BOOKINGS);

    const [booking] = await this.dataSource.query(
      `SELECT 
        b.*,
        apt.name AS apartment_name,
        apt.address AS apartment_address,
        apt.hotline AS apartment_hotline,
        c.full_name AS customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        st_cr.full_name AS creator_name,
        st_rv.full_name AS reviewer_name,
        st_cn.full_name AS canceller_name
       FROM BOOKINGS b
       LEFT JOIN APARTMENT apt ON b.apartment_id = apt.id
       LEFT JOIN CUSTOMER c ON b.customer_id = c.customer_id
       LEFT JOIN STAFF st_cr ON b.created_by = st_cr.staff_id
       LEFT JOIN STAFF st_rv ON b.reviewed_by = st_rv.staff_id
       LEFT JOIN STAFF st_cn ON b.cancelled_by = st_cn.staff_id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt phòng #${bookingId}`);
    }

    this.enforceBranchAccess(staff, booking.apartment_id);

    // Danh sách phòng
    const rooms = await this.dataSource.query(
      `SELECT br.id, br.room_types_id, rt.name AS room_type_name, rt.base_price, br.room_id, r.room_number, r.status AS room_status
       FROM Booking_rooms br
       LEFT JOIN room_types rt ON br.room_types_id = rt.id
       LEFT JOIN ROOMS r ON br.room_id = r.room_id
       WHERE br.bookings_id = ?`,
      [bookingId]
    );

    booking.booking_rooms = rooms.map((r: any) => ({
      ...r,
      room_display: r.room_number ? `Phòng ${r.room_number}` : 'Chưa gán',
    }));

    // Danh sách khách lưu trú (Che số giấy tờ tùy thân dạng 0791****234)
    const guests = await this.dataSource.query(
      `SELECT * FROM booking_guests WHERE bookings_id = ?`,
      [bookingId]
    );

    booking.guests = guests.map((g: any) => ({
      ...g,
      doc_number_masked: maskDocumentNumber(g.doc_number),
      // Giữ doc_number gốc ẩn nếu không phải admin
      doc_number: staff.role === StaffRole.ADMIN ? g.doc_number : maskDocumentNumber(g.doc_number),
    }));

    // Mã PIN
    const lockPins = await this.dataSource.query(
      `SELECT lp.*, l.cloud_lock_id, l.lock_name
       FROM lock_pin lp
       LEFT JOIN \`lock\` l ON lp.lock_id = l.id
       WHERE lp.booking_id = ?`,
      [bookingId]
    );
    booking.lock_pin = lockPins[0] || null;

    // Giao dịch thanh toán / hoàn tiền
    booking.transactions = await this.dataSource.query(
      `SELECT tx.*, st.full_name AS creator_name
       FROM TRANSACTION tx
       LEFT JOIN STAFF st ON tx.created_by = st.staff_id
       WHERE tx.booking_id = ?
       ORDER BY tx.created_at DESC`,
      [bookingId]
    );

    // Lịch sử trạng thái từ Audit_logs
    booking.audit_history = await this.dataSource.query(
      `SELECT id, actor, action, old_value, new_value, created_at
       FROM Audit_logs
       WHERE entity_type = 'BOOKINGS' AND entity_id = ?
       ORDER BY created_at DESC`,
      [bookingId]
    );

    return booking;
  }

  /**
   * 3. XEM ẢNH GIẤY TỜ TÙY THÂN (Admin only, Signed URL 2 phút, Audit_logs)
   */
  async getSignedDocumentUrl(
    bookingId: number,
    guestId: number,
    side: 'front' | 'back',
    staff: CurrentStaff
  ) {
    this.checkPermission(staff, Permission.VIEW_DOCUMENT_IMAGE);

    const [guest] = await this.dataSource.query(
      `SELECT bg.*, b.apartment_id 
       FROM booking_guests bg
       JOIN BOOKINGS b ON bg.bookings_id = b.id
       WHERE bg.id = ? AND bg.bookings_id = ?`,
      [guestId, bookingId]
    );

    if (!guest) {
      throw new NotFoundException(`Không tìm thấy thông tin người ở #${guestId} trong đơn #${bookingId}`);
    }

    // Nếu ảnh đã bị xóa sau check-out
    if (guest.doc_deleted_at) {
      return {
        is_deleted: true,
        message: 'Ảnh đã xóa theo chính sách lưu trữ bảo vệ dữ liệu cá nhân',
        signed_url: null,
      };
    }

    const docPath = side === 'front' ? guest.doc_image_front : guest.doc_image_back;
    if (!docPath) {
      return {
        is_deleted: false,
        message: 'Người ở chưa tải lên mặt giấy tờ này',
        signed_url: null,
      };
    }

    // Sinh token signed URL hết hạn sau 120 giây (2 phút)
    const expiresAt = Date.now() + SIGNED_DOC_URL_TTL_SECONDS * 1000;
    const token = Buffer.from(JSON.stringify({ guestId, side, expiresAt })).toString('base64');
    const signedUrl = `/api/admin/bookings/${bookingId}/guests/${guestId}/doc-image?side=${side}&token=${token}`;

    // Ghi Audit_logs mỗi lần bấm xem ảnh
    await this.auditLogService.log({
      actor: staff.full_name,
      action: 'VIEW_DOCUMENT_IMAGE',
      entity_type: 'booking_guests',
      entity_id: guestId,
      old_value: null,
      new_value: {
        booking_id: bookingId,
        guest_name: guest.full_name,
        side,
        expires_in_seconds: SIGNED_DOC_URL_TTL_SECONDS,
      },
    });

    return {
      is_deleted: false,
      signed_url: signedUrl,
      expires_in_seconds: SIGNED_DOC_URL_TTL_SECONDS,
    };
  }

  /**
   * 4. TẠO BOOKING THỦ CÔNG (MODAL 4 BƯỚC)
   */
  // Bước 1: Báo giá
  async calculateQuote(dto: {
    apartment_id: number;
    room_type_id: number;
    check_in: string;
    check_out: string;
    adults: number;
    children: number;
    booking_type?: BookingType;
  }) {
    const [roomType] = await this.dataSource.query(
      `SELECT * FROM room_types WHERE id = ? AND apartment_id = ?`,
      [dto.room_type_id, dto.apartment_id]
    );

    if (!roomType) {
      throw new NotFoundException('Không tìm thấy loại phòng tại chi nhánh này.');
    }

    const totalGuests = dto.adults + dto.children;
    if (totalGuests > roomType.max_occupancy) {
      throw new BadRequestException(
        `Số lượng khách (${totalGuests}) vượt quá sức chứa tối đa của loại phòng (${roomType.max_occupancy} khách).`
      );
    }

    // Tính giá
    const priceCalculation = calculateBookingPrice(
      Number(roomType.base_price),
      dto.check_in,
      dto.check_out,
      dto.booking_type || BookingType.OVERNIGHT
    );

    // Kiểm tra số phòng trống khả dụng
    const availableRoomsCount = await this.countAvailableRooms(
      dto.room_type_id,
      dto.check_in,
      dto.check_out
    );

    return {
      room_type_id: roomType.id,
      room_type_name: roomType.name,
      base_price: Number(roomType.base_price),
      max_occupancy: roomType.max_occupancy,
      nights: priceCalculation.nights,
      raw_total: priceCalculation.rawTotal,
      final_total: priceCalculation.finalTotal,
      available_rooms: availableRoomsCount,
      has_available_room: availableRoomsCount > 0,
    };
  }

  // Bước 2: Giữ chỗ (pessimistic lock, source 'admin', hold 30m, room_id NULL)
  async holdManualBooking(
    dto: {
      apartment_id: number;
      room_type_id: number;
      check_in: string;
      check_out: string;
      adults: number;
      children: number;
      booking_type: BookingType;
      customer: { full_name: string; email: string; phone: string };
      stay_reason?: string;
      note?: string;
    },
    staff: CurrentStaff
  ) {
    this.checkPermission(staff, Permission.CREATE_MANUAL_BOOKING);
    this.enforceBranchAccess(staff, dto.apartment_id);

    // Kiểm tra phòng trống
    const available = await this.countAvailableRooms(dto.room_type_id, dto.check_in, dto.check_out);
    if (available <= 0) {
      throw new ConflictException('Loại phòng này hiện không còn phòng trống trong khung giờ đã chọn.');
    }

    // Tìm hoặc tạo CUSTOMER (không lưu password)
    let [customer] = await this.dataSource.query(
      `SELECT id, email, full_name FROM CUSTOMER WHERE email = ?`,
      [dto.customer.email.toLowerCase().trim()]
    );

    if (!customer) {
      const custInsert = await this.dataSource.query(
        `INSERT INTO CUSTOMER (full_name, email, phone, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`,
        [dto.customer.full_name, dto.customer.email.toLowerCase().trim(), dto.customer.phone]
      );
      customer = { id: custInsert.insertId, email: dto.customer.email, full_name: dto.customer.full_name };
    }

    // Tính giá
    const [roomType] = await this.dataSource.query(`SELECT base_price FROM room_types WHERE id = ?`, [dto.room_type_id]);
    const price = calculateBookingPrice(Number(roomType.base_price), dto.check_in, dto.check_out, dto.booking_type);

    const bookingCode = `BK-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const holdExpiresAt = dayjs().add(HOLD_EXPIRATION_MINUTES, 'minute').toDate();

    const insertRes = await this.dataSource.query(
      `INSERT INTO BOOKINGS (
        booking_code, apartment_id, customer_id, adults, children,
        booking_type, booked_start_time, booked_end_time,
        booking_status, verification_status, source, created_by,
        total_price, discount_amount, hold_expires_at, stay_reason, note,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        bookingCode,
        dto.apartment_id,
        customer.id,
        dto.adults,
        dto.children,
        dto.booking_type,
        dto.check_in,
        dto.check_out,
        BookingStatus.PENDING_PAYMENT,
        VerificationStatus.PENDING,
        BookingSource.ADMIN,
        staff.id,
        price.finalTotal,
        0,
        holdExpiresAt,
        dto.stay_reason || 'Đặt phòng qua quầy',
        dto.note || null,
      ]
    );

    const bookingId = insertRes.insertId;

    // Tạo Booking_rooms với room_id = NULL
    await this.dataSource.query(
      `INSERT INTO Booking_rooms (bookings_id, room_types_id, room_id, created_at) VALUES (?, ?, NULL, NOW())`,
      [bookingId, dto.room_type_id]
    );

    // Tạo các slot booking_guests rỗng
    const totalSlots = dto.adults + dto.children;
    for (let i = 0; i < totalSlots; i++) {
      const isPrimary = i === 0;
      await this.dataSource.query(
        `INSERT INTO booking_guests (
          bookings_id, guest_type, is_staying, full_name, status, created_at, updated_at
        ) VALUES (?, ?, 1, ?, 'empty', NOW(), NOW())`,
        [bookingId, isPrimary ? GuestType.PRIMARY : GuestType.ADDITIONAL, isPrimary ? customer.full_name : `Khách lưu trú ${i + 1}`]
      );
    }

    await this.auditLogService.log({
      actor: staff.full_name,
      action: 'CREATE_MANUAL_HOLD_BOOKING',
      entity_type: 'BOOKINGS',
      entity_id: bookingId,
      old_value: null,
      new_value: {
        booking_code: bookingCode,
        customer_id: customer.id,
        hold_expires_at: holdExpiresAt,
      },
    });

    // Thông báo realtime
    this.realtimeSyncService.emitPostCommit(REALTIME_EVENTS.BOOKING_UPDATED, bookingId, {
      apartment_id: dto.apartment_id,
      customer_id: customer.id,
    });
    this.realtimeSyncService.emitPostCommit(REALTIME_EVENTS.AVAILABILITY_CHANGED, dto.apartment_id, {
      apartment_id: dto.apartment_id,
    });

    return {
      booking_id: bookingId,
      booking_code: bookingCode,
      hold_expires_at: holdExpiresAt,
      total_price: price.finalTotal,
    };
  }

  // Bước 3: Ghi nhận thanh toán tại quầy & Tự động gán phòng
  async recordCounterPayment(
    bookingId: number,
    dto: { amount: number; payment_method: 'counter_cash' | 'counter_bank_transfer'; note?: string },
    staff: CurrentStaff
  ) {
    this.checkPermission(staff, Permission.RECORD_COUNTER_PAYMENT);

    const [booking] = await this.dataSource.query(`SELECT * FROM BOOKINGS WHERE id = ?`, [bookingId]);
    if (!booking) throw new NotFoundException(`Không tìm thấy đơn #${bookingId}`);
    this.enforceBranchAccess(staff, booking.apartment_id);

    if (booking.booking_status !== BookingStatus.PENDING_PAYMENT) {
      throw new ConflictException(`Chỉ có thể ghi nhận thanh toán cho đơn ở trạng thái 'pending_payment'.`);
    }

    // 1. Ghi nhận TRANSACTION 'payment'
    await this.dataSource.query(
      `INSERT INTO TRANSACTION (booking_id, type, amount, payment_method, note, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [bookingId, TransactionType.PAYMENT, dto.amount, dto.payment_method, dto.note || 'Thanh toán tại quầy', staff.id]
    );

    // 2. Tự động gán phòng qua AutoRoomAssignmentService
    await this.autoRoomAssignmentService.assignRoomsOnPaymentSuccess(bookingId, staff.full_name);

    // 3. Xóa hạn hold_expires_at
    await this.dataSource.query(`UPDATE BOOKINGS SET hold_expires_at = NULL WHERE id = ?`, [bookingId]);

    // 4. Phát sự kiện realtime
    this.realtimeSyncService.emitPostCommit(REALTIME_EVENTS.BOOKING_UPDATED, bookingId, {
      apartment_id: booking.apartment_id,
      customer_id: booking.customer_id,
    });

    return {
      success: true,
      booking_id: bookingId,
      status: BookingStatus.CONFIRMED,
      message: 'Ghi nhận thanh toán thành công và đã tự động gán phòng khả dụng.',
    };
  }

  // Bước 4: Điền thông tin người ở
  async fillGuestInfo(
    bookingId: number,
    guestsData: Array<{
      id?: number;
      full_name: string;
      date_of_birth?: string;
      phone?: string;
      email?: string;
      doc_type?: DocType;
      doc_number?: string;
    }>,
    staff: CurrentStaff
  ) {
    this.checkPermission(staff, Permission.EDIT_BOOKING);
    const [booking] = await this.dataSource.query(`SELECT * FROM BOOKINGS WHERE id = ?`, [bookingId]);
    if (!booking) throw new NotFoundException(`Không tìm thấy đơn #${bookingId}`);
    this.enforceBranchAccess(staff, booking.apartment_id);

    const checkInDate = booking.booked_start_time;
    let allValid = true;

    for (const g of guestsData) {
      if (!g.full_name || !g.full_name.trim()) {
        throw new BadRequestException('Họ và tên người ở là bắt buộc.');
      }

      const isChild = g.date_of_birth ? isChildUnder10(g.date_of_birth, checkInDate) : false;

      if (!isChild && (!g.doc_number || !g.doc_number.trim())) {
        allValid = false;
      }

      const status = isChild
        ? GuestSlotStatus.MANUAL_CHILD
        : g.doc_number
        ? GuestSlotStatus.CONFIRMED
        : GuestSlotStatus.EMPTY;

      if (g.id) {
        await this.dataSource.query(
          `UPDATE booking_guests 
           SET full_name = ?, date_of_birth = ?, phone = ?, email = ?, doc_type = ?, doc_number = ?, status = ?, updated_at = NOW()
           WHERE id = ? AND bookings_id = ?`,
          [
            g.full_name,
            g.date_of_birth || null,
            g.phone || null,
            g.email || null,
            g.doc_type || null,
            g.doc_number || null,
            status,
            g.id,
            bookingId,
          ]
        );
      }
    }

    // Nếu đủ thông tin và đã confirmed -> phát lock_pin
    if (allValid && booking.booking_status === BookingStatus.CONFIRMED) {
      await this.dataSource.query(
        `UPDATE BOOKINGS SET verification_status = 'passed', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
        [staff.id, bookingId]
      );

      // Cấp lock_pin nếu chưa có
      const [existingPin] = await this.dataSource.query(`SELECT id FROM lock_pin WHERE booking_id = ?`, [bookingId]);
      if (!existingPin) {
        const [assignedRoom] = await this.dataSource.query(
          `SELECT room_id FROM Booking_rooms WHERE bookings_id = ? AND room_id IS NOT NULL LIMIT 1`,
          [bookingId]
        );
        if (assignedRoom) {
          const [lock] = await this.dataSource.query(`SELECT id FROM \`lock\` WHERE room_id = ? AND deleted_at IS NULL LIMIT 1`, [assignedRoom.room_id]);
          if (lock) {
            const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
            await this.dataSource.query(
              `INSERT INTO lock_pin (booking_id, lock_id, pin, lock_pin_start_time, lock_pin_end_time, status, created_at)
               VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
              [bookingId, lock.id, randomPin, booking.booked_start_time, booking.booked_end_time]
            );
          }
        }
      }
    }

    await this.auditLogService.log({
      actor: staff.full_name,
      action: 'FILL_GUEST_INFO',
      entity_type: 'BOOKINGS',
      entity_id: bookingId,
      old_value: null,
      new_value: { guests_count: guestsData.length, all_valid: allValid },
    });

    return { success: true, all_valid: allValid, verification_status: allValid ? 'passed' : 'pending' };
  }

  /**
   * 5. SỬA BOOKING
   * - pending_payment: cho sửa loại phòng, ngày, số khách (tính lại tiền, check lại phòng trống)
   * - confirmed / checked_in: chỉ sửa thông tin người ở, lock_email, ghi chú; CHẶN sửa ngày/loại phòng!
   */
  async editBooking(
    bookingId: number,
    dto: {
      check_in?: string;
      check_out?: string;
      room_type_id?: number;
      adults?: number;
      children?: number;
      lock_email?: string;
      note?: string;
    },
    staff: CurrentStaff
  ) {
    this.checkPermission(staff, Permission.EDIT_BOOKING);
    const [booking] = await this.dataSource.query(`SELECT * FROM BOOKINGS WHERE id = ?`, [bookingId]);
    if (!booking) throw new NotFoundException(`Không tìm thấy đơn #${bookingId}`);
    this.enforceBranchAccess(staff, booking.apartment_id);

    if (booking.booking_status === BookingStatus.PENDING_PAYMENT) {
      const newCheckIn = dto.check_in || booking.booked_start_time;
      const newCheckOut = dto.check_out || booking.booked_end_time;
      const newAdults = dto.adults ?? booking.adults;
      const newChildren = dto.children ?? booking.children;

      let roomTypeId = dto.room_type_id;
      if (!roomTypeId) {
        const [br] = await this.dataSource.query(`SELECT room_types_id FROM Booking_rooms WHERE bookings_id = ? LIMIT 1`, [bookingId]);
        roomTypeId = br?.room_types_id;
      }

      // Kiểm tra sức chứa
      const [rt] = await this.dataSource.query(`SELECT * FROM room_types WHERE id = ?`, [roomTypeId]);
      if (newAdults + newChildren > rt.max_occupancy) {
        throw new BadRequestException(`Tổng số khách vượt quá sức chứa ${rt.max_occupancy} của loại phòng.`);
      }

      // Kiểm tra phòng trống
      const avail = await this.countAvailableRooms(roomTypeId, newCheckIn, newCheckOut, bookingId);
      if (avail <= 0) {
        throw new ConflictException('Không còn phòng trống trong khung thời gian mới.');
      }

      // Tính lại giá
      const price = calculateBookingPrice(Number(rt.base_price), newCheckIn, newCheckOut, booking.booking_type);

      await this.dataSource.query(
        `UPDATE BOOKINGS 
         SET booked_start_time = ?, booked_end_time = ?, adults = ?, children = ?,
             total_price = ?, lock_email = COALESCE(?, lock_email), note = COALESCE(?, note), updated_at = NOW()
         WHERE id = ?`,
        [newCheckIn, newCheckOut, newAdults, newChildren, price.finalTotal, dto.lock_email, dto.note, bookingId]
      );

      if (dto.room_type_id) {
        await this.dataSource.query(
          `UPDATE Booking_rooms SET room_types_id = ? WHERE bookings_id = ?`,
          [dto.room_type_id, bookingId]
        );
      }
    } else if (booking.booking_status === BookingStatus.CONFIRMED || booking.booking_status === BookingStatus.CHECKED_IN) {
      // Chặn sửa ngày và loại phòng
      if (dto.check_in || dto.check_out || dto.room_type_id) {
        throw new BadRequestException('Đơn đã xác nhận / đang ở KHÔNG được phép thay đổi ngày hoặc loại phòng.');
      }

      await this.dataSource.query(
        `UPDATE BOOKINGS SET lock_email = COALESCE(?, lock_email), note = COALESCE(?, note), updated_at = NOW() WHERE id = ?`,
        [dto.lock_email, dto.note, bookingId]
      );
    } else {
      throw new BadRequestException(`Không thể sửa đơn ở trạng thái '${booking.booking_status}'.`);
    }

    await this.auditLogService.log({
      actor: staff.full_name,
      action: 'EDIT_BOOKING',
      entity_type: 'BOOKINGS',
      entity_id: bookingId,
      old_value: { note: booking.note, lock_email: booking.lock_email },
      new_value: dto,
    });

    this.realtimeSyncService.emitPostCommit(REALTIME_EVENTS.BOOKING_UPDATED, bookingId, {
      apartment_id: booking.apartment_id,
      customer_id: booking.customer_id,
    });

    return { success: true, message: 'Cập nhật đơn thành công.' };
  }

  /**
   * 6. HỦY BOOKING
   * - pending_payment: manager & admin, nhả hold ngay
   * - confirmed: admin only, bắt buộc cancel_reason, tạo TRANSACTION 'refund', nhả phòng, thu hồi PIN
   */
  async cancelBooking(bookingId: number, cancelReason: string, staff: CurrentStaff) {
    const [booking] = await this.dataSource.query(`SELECT * FROM BOOKINGS WHERE id = ?`, [bookingId]);
    if (!booking) throw new NotFoundException(`Không tìm thấy đơn #${bookingId}`);
    this.enforceBranchAccess(staff, booking.apartment_id);

    if (booking.booking_status === BookingStatus.PENDING_PAYMENT) {
      this.checkPermission(staff, Permission.CANCEL_PENDING_BOOKING);

      await this.stateMachineService.transitionStatus(bookingId, BookingStatus.CANCELLED, staff.full_name, {
        actorId: staff.id,
        actionReason: cancelReason || 'Hủy đơn giữ chỗ chưa thanh toán',
      });

      await this.dataSource.query(
        `UPDATE BOOKINGS SET cancel_reason = ?, cancelled_at = NOW(), cancelled_by = ?, hold_expires_at = NULL WHERE id = ?`,
        [cancelReason || 'Lễ tân / Khách hủy đơn chưa thanh toán', staff.id, bookingId]
      );
    } else if (booking.booking_status === BookingStatus.CONFIRMED) {
      // Admin only!
      this.checkPermission(staff, Permission.CANCEL_CONFIRMED_BOOKING);
      if (!cancelReason || !cancelReason.trim()) {
        throw new BadRequestException('Bắt buộc phải nhập lý do hủy đơn đã xác nhận.');
      }

      await this.stateMachineService.transitionStatus(bookingId, BookingStatus.CANCELLED, staff.full_name, {
        actorId: staff.id,
        actionReason: cancelReason,
      });

      // Ghi nhận TRANSACTION 'refund'
      await this.dataSource.query(
        `INSERT INTO TRANSACTION (booking_id, type, amount, payment_method, note, created_by, created_at)
         VALUES (?, ?, ?, 'refund_transfer', ?, ?, NOW())`,
        [bookingId, TransactionType.REFUND, booking.total_price, `Hoàn tiền hủy đơn: ${cancelReason}`, staff.id]
      );

      // Giải phóng phòng
      await this.dataSource.query(`UPDATE Booking_rooms SET room_id = NULL WHERE bookings_id = ?`, [bookingId]);

      // Thu hồi lock_pin
      await this.dataSource.query(`UPDATE lock_pin SET status = 'revoked' WHERE booking_id = ?`, [bookingId]);

      await this.dataSource.query(
        `UPDATE BOOKINGS SET cancel_reason = ?, cancelled_at = NOW(), cancelled_by = ? WHERE id = ?`,
        [cancelReason, staff.id, bookingId]
      );
    } else {
      throw new BadRequestException(`Không thể hủy đơn ở trạng thái '${booking.booking_status}'.`);
    }

    return { success: true, message: 'Hủy đơn đặt phòng thành công.' };
  }

  /**
   * 7. GIA HẠN GIỮ CHỖ (+15 phút)
   */
  async extendHold(bookingId: number, staff: CurrentStaff) {
    this.checkPermission(staff, Permission.EXTEND_HOLD);
    const [booking] = await this.dataSource.query(`SELECT * FROM BOOKINGS WHERE id = ?`, [bookingId]);
    if (!booking) throw new NotFoundException(`Không tìm thấy đơn #${bookingId}`);
    this.enforceBranchAccess(staff, booking.apartment_id);

    if (booking.booking_status !== BookingStatus.PENDING_PAYMENT) {
      throw new ConflictException(`Chỉ có thể gia hạn cho đơn ở trạng thái 'pending_payment'.`);
    }

    const baseTime = booking.hold_expires_at && dayjs(booking.hold_expires_at).isAfter(dayjs())
      ? dayjs(booking.hold_expires_at)
      : dayjs();

    const newHoldExpiresAt = baseTime.add(EXTENDED_HOLD_MINUTES, 'minute').toDate();

    await this.dataSource.query(
      `UPDATE BOOKINGS SET hold_expires_at = ?, updated_at = NOW() WHERE id = ?`,
      [newHoldExpiresAt, bookingId]
    );

    await this.auditLogService.log({
      actor: staff.full_name,
      action: 'EXTEND_HOLD',
      entity_type: 'BOOKINGS',
      entity_id: bookingId,
      old_value: { hold_expires_at: booking.hold_expires_at },
      new_value: { hold_expires_at: newHoldExpiresAt, extended_minutes: EXTENDED_HOLD_MINUTES },
    });

    this.realtimeSyncService.emitPostCommit(REALTIME_EVENTS.BOOKING_UPDATED, bookingId, {
      apartment_id: booking.apartment_id,
      customer_id: booking.customer_id,
    });

    return {
      success: true,
      booking_id: bookingId,
      hold_expires_at: newHoldExpiresAt,
      message: `Đã gia hạn giữ chỗ thêm ${EXTENDED_HOLD_MINUTES} phút.`,
    };
  }

  /**
   * 8. CHECK-IN VÀ CHECK-OUT
   */
  async checkIn(bookingId: number, staff: CurrentStaff) {
    this.checkPermission(staff, Permission.CHECKIN_CHECKOUT);
    const [booking] = await this.dataSource.query(`SELECT * FROM BOOKINGS WHERE id = ?`, [bookingId]);
    if (!booking) throw new NotFoundException(`Không tìm thấy đơn #${bookingId}`);
    this.enforceBranchAccess(staff, booking.apartment_id);

    await this.stateMachineService.transitionStatus(bookingId, BookingStatus.CHECKED_IN, staff.full_name, {
      actorId: staff.id,
      actionReason: 'Check-in tại quầy',
    });

    const checkInTime = new Date();
    await this.dataSource.query(
      `UPDATE BOOKINGS SET check_in_actual = ?, updated_at = NOW() WHERE id = ?`,
      [checkInTime, bookingId]
    );

    return { success: true, booking_id: bookingId, check_in_actual: checkInTime };
  }

  async checkOut(bookingId: number, staff: CurrentStaff) {
    this.checkPermission(staff, Permission.CHECKIN_CHECKOUT);
    const [booking] = await this.dataSource.query(`SELECT * FROM BOOKINGS WHERE id = ?`, [bookingId]);
    if (!booking) throw new NotFoundException(`Không tìm thấy đơn #${bookingId}`);
    this.enforceBranchAccess(staff, booking.apartment_id);

    await this.stateMachineService.transitionStatus(bookingId, BookingStatus.CHECKED_OUT, staff.full_name, {
      actorId: staff.id,
      actionReason: 'Check-out trả phòng',
    });

    const checkOutTime = new Date();

    // 1. Ghi check_out_actual
    await this.dataSource.query(
      `UPDATE BOOKINGS SET check_out_actual = ?, updated_at = NOW() WHERE id = ?`,
      [checkOutTime, bookingId]
    );

    // 2. Thu hồi lock_pin
    await this.dataSource.query(`UPDATE lock_pin SET status = 'revoked' WHERE booking_id = ?`, [bookingId]);

    // 3. Xóa ảnh CCCD theo chính sách lưu trữ (ghi doc_deleted_at)
    await this.dataSource.query(
      `UPDATE booking_guests SET doc_deleted_at = NOW() WHERE bookings_id = ?`,
      [bookingId]
    );

    return { success: true, booking_id: bookingId, check_out_actual: checkOutTime };
  }

  /**
   * 9. BACKGROUND CRON JOB: QUÉT ĐƠN QUÁ HẠN GIỮ CHỖ (Idempotent 1 phút)
   */
  async expireOverdueHolds() {
    const overdueBookings = await this.dataSource.query(
      `SELECT id, apartment_id, customer_id FROM BOOKINGS
       WHERE booking_status = 'pending_payment'
         AND hold_expires_at IS NOT NULL
         AND hold_expires_at <= NOW()`
    );

    let expiredCount = 0;
    for (const b of overdueBookings) {
      try {
        await this.stateMachineService.transitionStatus(b.id, BookingStatus.EXPIRED, 'cron_job_auto_expire', {
          actionReason: 'Hết hạn giữ chỗ 30 phút mà chưa thanh toán',
        });
        expiredCount++;
      } catch (err: any) {
        this.logger.error(`Lỗi khi expire đơn #${b.id}: ${err.message}`);
      }
    }

    if (expiredCount > 0) {
      this.logger.log(`Cron job quét hoàn tất: Đã chuyển ${expiredCount} đơn giữ chỗ quá hạn sang 'expired'.`);
    }

    return { expired_count: expiredCount };
  }

  /**
   * 10. REALTIME ALERTS CHO ADMIN / MANAGER
   * - Có đơn pending_payment mới
   * - Đơn giữ chỗ sắp hết hạn (< 5 phút)
   * - Hết phòng để gán tự động
   */
  async getRealtimeAlerts(staff: CurrentStaff) {
    const scopedApartmentId = this.enforceBranchAccess(staff);
    const aptFilter = scopedApartmentId ? `AND apartment_id = ${scopedApartmentId}` : '';

    // 1. Đơn pending mới (< 10 phút)
    const newPending = await this.dataSource.query(
      `SELECT id, booking_code, apartment_id, total_price, created_at
       FROM BOOKINGS
       WHERE booking_status = 'pending_payment'
         AND created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
         ${aptFilter}
       ORDER BY created_at DESC LIMIT 5`
    );

    // 2. Đơn giữ chỗ sắp hết hạn (< 5 phút)
    const nearExpiry = await this.dataSource.query(
      `SELECT id, booking_code, apartment_id, hold_expires_at,
              TIMESTAMPDIFF(SECOND, NOW(), hold_expires_at) AS remaining_seconds
       FROM BOOKINGS
       WHERE booking_status = 'pending_payment'
         AND hold_expires_at > NOW()
         AND hold_expires_at <= DATE_SUB(NOW(), INTERVAL -5 MINUTE)
         ${aptFilter}
       ORDER BY hold_expires_at ASC LIMIT 5`
    );

    return {
      new_pending_bookings: newPending,
      near_expiry_holds: nearExpiry,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 11. HÀNG ĐỢI DUYỆT GIẤY TỜ (Verification Queue)
   */
  async getVerificationQueue() {
    const guests = await this.dataSource.query(
      `SELECT bg.*, b.booking_code, b.apartment_id, apt.name AS apartment_name
       FROM booking_guests bg
       JOIN BOOKINGS b ON bg.bookings_id = b.id
       LEFT JOIN APARTMENT apt ON b.apartment_id = apt.id
       WHERE bg.status IN ('ocr_done', 'ocr_low_confidence', 'uploading')
          OR b.verification_status = 'manual_review'
       ORDER BY bg.created_at ASC`
    );

    return guests.map((g: any) => ({
      ...g,
      doc_number_masked: maskDocumentNumber(g.doc_number),
    }));
  }

  async reviewGuestDocument(
    bookingId: number,
    guestId: number,
    decision: 'passed' | 'rejected',
    reviewedBy: string,
    notes?: string,
    correctedData?: { name?: string; date_of_birth?: string; doc_number?: string }
  ) {
    const newStatus = decision === 'passed' ? GuestSlotStatus.CONFIRMED : GuestSlotStatus.EMPTY;

    await this.dataSource.query(
      `UPDATE booking_guests 
       SET status = ?, 
           full_name = COALESCE(?, full_name),
           date_of_birth = COALESCE(?, date_of_birth),
           doc_number = COALESCE(?, doc_number),
           updated_at = NOW()
       WHERE id = ? AND bookings_id = ?`,
      [
        newStatus,
        correctedData?.name || null,
        correctedData?.date_of_birth || null,
        correctedData?.doc_number || null,
        guestId,
        bookingId,
      ]
    );

    const verificationStatus = decision === 'passed' ? 'passed' : 'rejected';
    await this.dataSource.query(
      `UPDATE BOOKINGS SET verification_status = ?, reviewed_at = NOW() WHERE id = ?`,
      [verificationStatus, bookingId]
    );

    await this.auditLogService.log({
      actor: reviewedBy,
      action: `REVIEW_GUEST_DOC_${decision.toUpperCase()}`,
      entity_type: 'booking_guests',
      entity_id: guestId,
      old_value: null,
      new_value: { booking_id: bookingId, decision, notes, correctedData },
    });

    return { success: true, decision, guest_id: guestId, booking_id: bookingId };
  }

  async getUnmaskedGuestDoc(guestId: number, actor: string) {
    const [guest] = await this.dataSource.query(
      `SELECT bg.id, bg.bookings_id, bg.full_name, bg.doc_type, bg.doc_number, bg.status, b.apartment_id
       FROM booking_guests bg
       JOIN BOOKINGS b ON bg.bookings_id = b.id
       WHERE bg.id = ?`,
      [guestId]
    );

    if (!guest) {
      throw new NotFoundException(`Không tìm thấy hồ sơ người ở #${guestId}`);
    }

    // Ghi nhật ký kiểm toán hành vi xem số CCCD đầy đủ
    await this.auditLogService.log({
      actor,
      action: 'VIEW_FULL_DOCUMENT_NUMBER',
      entity_type: 'booking_guests',
      entity_id: guestId,
      old_value: null,
      new_value: { booking_id: guest.bookings_id, guest_name: guest.full_name },
    });

    return {
      guest_id: guest.id,
      full_name: guest.full_name,
      doc_type: guest.doc_type,
      doc_number: guest.doc_number,
    };
  }

  /**
   * Helper: Tính số phòng trống khả dụng của loại phòng trong khoảng ngày
   */
  private async countAvailableRooms(
    roomTypeId: number,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: number
  ): Promise<number> {
    const excludeFilter = excludeBookingId ? `AND b.id != ${excludeBookingId}` : '';

    // Tổng số phòng có sẵn và có gắn khóa hoạt động
    const [totalRes] = await this.dataSource.query(
      `SELECT COUNT(DISTINCT r.room_id) AS total
       FROM ROOMS r
       JOIN \`lock\` l ON l.room_id = r.room_id
       WHERE r.room_type_id = ? AND r.status = 'available' AND r.is_hidden = 0 AND l.deleted_at IS NULL`,
      [roomTypeId]
    );
    const totalRooms = Number(totalRes?.total || 0);

    // Số phòng đang bị chiếm trùng thời gian (draft còn hạn, pending_payment còn hạn, confirmed, checked_in)
    const [occupiedRes] = await this.dataSource.query(
      `SELECT COUNT(DISTINCT br.id) AS occupied
       FROM Booking_rooms br
       JOIN BOOKINGS b ON br.bookings_id = b.id
       WHERE br.room_types_id = ?
         AND (
           b.booking_status IN ('confirmed', 'checked_in')
           OR (b.booking_status = 'pending_payment' AND (b.hold_expires_at IS NULL OR b.hold_expires_at > NOW()))
         )
         AND (b.booked_start_time < ? AND b.booked_end_time > ?)
         ${excludeFilter}`,
      [roomTypeId, checkOut, checkIn]
    );
    const occupied = Number(occupiedRes?.occupied || 0);

    return Math.max(0, totalRooms - occupied);
  }
}
