import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as dayjs from 'dayjs';
import { BOOKING_TIME_CONFIG, SearchRoomsQueryDto, CreateDraftBookingDto } from '../../common/config/booking.config';

@Injectable()
export class BookingWorkflowService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Tính toán thời gian bắt đầu và kết thúc cố định theo loại đặt phòng (lấy từ config)
   */
  calculateBookedTimes(bookingType: 'overnight' | 'daily', checkIn: string, checkOut: string) {
    const config = BOOKING_TIME_CONFIG[bookingType];
    const start = dayjs(checkIn).hour(config.checkInHour).minute(0).second(0);
    let end = dayjs(checkOut).hour(config.checkOutHour).minute(0).second(0);

    if (bookingType === 'overnight') {
      end = dayjs(checkIn).add(1, 'day').hour(config.checkOutHour).minute(0).second(0);
    }

    if (!end.isAfter(start)) {
      throw new BadRequestException('Ngày trả phòng phải sau ngày nhận phòng.');
    }

    return {
      bookedStartTime: start.format('YYYY-MM-DD HH:mm:ss'),
      bookedEndTime: end.format('YYYY-MM-DD HH:mm:ss'),
    };
  }

  /**
   * 1. Tìm kiếm các room_types còn phòng trống và max_occupancy >= adults + children
   */
  async searchAvailableRoomTypes(dto: SearchRoomsQueryDto) {
    const totalGuests = Number(dto.adults) + Number(dto.children);
    const { bookedStartTime, bookedEndTime } = this.calculateBookedTimes(
      dto.booking_type,
      dto.check_in_date,
      dto.check_out_date,
    );

    const sql = `
      SELECT 
        rt.id AS room_types_id,
        rt.name AS room_type_name,
        rt.max_occupancy,
        rt.bed_config,
        rt.base_price,
        apt.id AS apartment_id,
        apt.name AS apartment_name,
        apt.address AS apartment_address,
        COUNT(DISTINCT r.id) AS available_rooms_count
      FROM room_types rt
      JOIN apartments apt ON rt.apartment_id = apt.id
      JOIN rooms r ON r.room_types_id = rt.id AND r.status = 'available'
      WHERE rt.max_occupancy >= ?
        ${dto.apartment_id ? 'AND apt.id = ?' : ''}
        AND r.id NOT IN (
          SELECT DISTINCT br.room_id 
          FROM Booking_rooms br
          JOIN BOOKINGS b ON br.bookings_id = b.id
          WHERE br.room_id IS NOT NULL
            AND b.booking_status NOT IN ('cancelled', 'rejected')
            AND (b.booking_status != 'draft' OR b.hold_expires_at > NOW())
            AND (
              (b.booked_start_time < ? AND b.booked_end_time > ?)
            )
        )
      GROUP BY rt.id, apt.id
      HAVING available_rooms_count > 0
    `;

    const params = dto.apartment_id
      ? [totalGuests, dto.apartment_id, bookedEndTime, bookedStartTime]
      : [totalGuests, bookedEndTime, bookedStartTime];

    const availableRoomTypes = await this.dataSource.query(sql, params);

    return {
      search_meta: {
        booking_type: dto.booking_type,
        booked_start_time: bookedStartTime,
        booked_end_time: bookedEndTime,
        adults: Number(dto.adults),
        children: Number(dto.children),
        total_guests: totalGuests,
      },
      results: availableRoomTypes,
    };
  }

  /**
   * 2. Tạo BOOKINGS status='draft' (hold 15 phút) & sinh sẵn slot từ adults/children
   */
  async createDraftWithSlots(dto: CreateDraftBookingDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Chuẩn hóa danh sách các phòng khách chọn (khớp quan hệ 1-N Booking_rooms trong ERD)
      const roomsToBook =
        dto.selected_rooms && dto.selected_rooms.length > 0
          ? dto.selected_rooms
          : dto.room_types_id
          ? [{ room_types_id: dto.room_types_id, quantity: 1 }]
          : [];

      if (roomsToBook.length === 0) {
        throw new BadRequestException('Vui lòng chọn ít nhất 1 loại phòng để đặt.');
      }

      // Lấy danh sách room_types_id để kiểm tra sức chứa trong DB
      const roomTypeIds = Array.from(new Set(roomsToBook.map((r) => r.room_types_id)));
      const roomTypesInDb = await queryRunner.query(
        `SELECT id, name, max_occupancy FROM room_types WHERE id IN (${roomTypeIds.map(() => '?').join(',')})`,
        roomTypeIds,
      );

      const capacityMap = new Map<number, number>();
      for (const rt of roomTypesInDb) {
        capacityMap.set(Number(rt.id), Number(rt.max_occupancy));
      }

      // KIỂM TRA QUY TẮC YÊU CẦU 2 (KHỚP ERD):
      // Quy tắc mới: Trẻ em <= 15 tuổi miễn tính sức chứa, chỉ người lớn và trẻ > 15 tuổi tính là 1 khách
      const olderChildren = (dto.children_ages || []).filter((a) => Number(a) > 15).length;
      const countableGuests = Number(dto.adults) + olderChildren;
      const totalPeople = Number(dto.adults) + Number(dto.children);
      let totalCapacity = 0;
      for (const r of roomsToBook) {
        const cap = capacityMap.get(Number(r.room_types_id)) || 2;
        totalCapacity += cap * Number(r.quantity);
      }

      if (countableGuests > totalCapacity) {
        throw new BadRequestException(
          `Đoàn gồm ${totalPeople} người (${dto.adults} người lớn, ${dto.children} trẻ em) cần ${countableGuests} chỗ tính theo sức chứa (trẻ em ≤15 tuổi được miễn tính sức chứa), vượt quá tổng sức chứa của các phòng đã chọn (${totalCapacity} khách). Vui lòng chọn thêm phòng.`,
        );
      }

      const { bookedStartTime, bookedEndTime } = this.calculateBookedTimes(
        dto.booking_type,
        dto.check_in_date,
        dto.check_out_date,
      );

      const holdExpiresAt = dayjs().add(BOOKING_TIME_CONFIG.holdExpiresMinutes, 'minute').toDate();

      // 1. Tạo bản ghi BOOKINGS draft
      const bookingInsert = await queryRunner.query(
        `INSERT INTO BOOKINGS (
          customer_id, booking_type, booked_start_time, booked_end_time,
          booking_status, adults, children, is_booked_for_other, lock_email,
          hold_expires_at, verification_status, consent_at, created_at
        ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
        [
          dto.customer_id || null,
          dto.booking_type,
          bookedStartTime,
          bookedEndTime,
          dto.adults,
          dto.children,
          dto.booker.is_booked_for_other ? 1 : 0,
          dto.booker.is_booked_for_other ? (dto.booker.lock_email || dto.booker.email) : null,
          holdExpiresAt,
        ],
      );

      const bookingId = bookingInsert.insertId;

      // 2. Gán Booking_rooms: Mỗi phòng khách chọn tạo 1 bản ghi Booking_rooms (Khớp quan hệ 1-N Booking_rooms)
      for (const r of roomsToBook) {
        const qty = Number(r.quantity) || 1;
        for (let q = 0; q < qty; q++) {
          await queryRunner.query(
            `INSERT INTO Booking_rooms (bookings_id, room_types_id, room_id) VALUES (?, ?, NULL)`,
            [bookingId, r.room_types_id],
          );
        }
      }

      // 3. Sinh sẵn slot cố định từ số lượng adults & children
      const adultSlotCount = dto.adults;
      const childSlotCount = dto.children;

      // Slot người lớn
      for (let i = 1; i <= adultSlotCount; i++) {
        const isBookerStaying = !dto.booker.is_booked_for_other && i === 1;
        await queryRunner.query(
          `INSERT INTO booking_guests (
            bookings_id, name, guest_type, is_staying, is_booker, status
          ) VALUES (?, ?, 'adult', 1, ?, 'empty')`,
          [
            bookingId,
            isBookerStaying ? dto.booker.full_name : '',
            isBookerStaying ? 1 : 0,
          ],
        );
      }

      // Slot trẻ em (dưới 10 tuổi)
      for (let i = 1; i <= childSlotCount; i++) {
        await queryRunner.query(
          `INSERT INTO booking_guests (
            bookings_id, name, guest_type, is_staying, is_booker, status
          ) VALUES (?, '', 'child', 1, 0, 'empty')`,
          [bookingId],
        );
      }

      await queryRunner.commitTransaction();

      return {
        booking_id: bookingId,
        booking_status: 'draft',
        hold_expires_at: holdExpiresAt,
        message: 'Khởi tạo đơn draft thành công. Vui lòng hoàn tất trong 15 phút.',
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Tính lại tuổi từ ngày sinh dựa trên ngày check-in
   */
  calculateAgeAtCheckIn(dateOfBirth: string, checkInDate: string): number {
    const dob = dayjs(dateOfBirth);
    const checkIn = dayjs(checkInDate);
    return checkIn.diff(dob, 'year');
  }

  /**
   * 3. Xử lý Slot Trẻ Em: Nhập tay tên + ngày sinh.
   * Nếu tuổi >= 10 -> tự chuyển thành slot người lớn, yêu cầu upload CCCD
   */
  async submitChildSlot(bookingId: number, guestId: number, data: { name: string; date_of_birth: string }) {
    const [booking] = await this.dataSource.query(`SELECT booked_start_time FROM BOOKINGS WHERE id = ?`, [bookingId]);
    if (!booking) throw new BadRequestException('Không tìm thấy booking.');

    const age = this.calculateAgeAtCheckIn(data.date_of_birth, booking.booked_start_time);

    if (age >= BOOKING_TIME_CONFIG.childAgeLimit) {
      await this.dataSource.query(
        `UPDATE booking_guests 
         SET name = ?, date_of_birth = ?, guest_type = 'adult', status = 'empty'
         WHERE id = ? AND bookings_id = ?`,
        [data.name, data.date_of_birth, guestId, bookingId],
      );

      return {
        guest_id: guestId,
        guest_type: 'adult',
        status: 'empty',
        requires_document: true,
        message: `Trẻ sinh ngày ${data.date_of_birth} (${age} tuổi tính đến ngày check-in) thuộc diện từ 10 tuổi trở lên. Đã tự chuyển thành slot người lớn, vui lòng chụp ảnh CCCD.`,
      };
    }

    await this.dataSource.query(
      `UPDATE booking_guests 
       SET name = ?, date_of_birth = ?, guest_type = 'child', status = 'confirmed'
       WHERE id = ? AND bookings_id = ?`,
      [data.name, data.date_of_birth, guestId, bookingId],
    );

    return {
      guest_id: guestId,
      guest_type: 'child',
      status: 'confirmed',
      requires_document: false,
    };
  }

  /**
   * 4. Đối chiếu toàn bộ đoàn & Hoàn tất
   */
  async finalizeGuestsVerification(bookingId: number) {
    const guests = await this.dataSource.query(
      `SELECT * FROM booking_guests WHERE bookings_id = ?`,
      [bookingId],
    );

    const unconfirmed = guests.filter((g) => g.status !== 'confirmed');
    if (unconfirmed.length > 0) {
      throw new BadRequestException('Vui lòng hoàn tất xác nhận toàn bộ thông tin các slot người ở.');
    }

    // Chặn trùng doc_number trong cùng 1 đơn
    const docNumbers = guests
      .filter((g) => g.doc_number && g.doc_number.trim())
      .map((g) => g.doc_number.trim());

    const uniqueDocs = new Set(docNumbers);
    if (uniqueDocs.size !== docNumbers.length) {
      throw new BadRequestException('Phát hiện số giấy tờ (CCCD/Hộ chiếu) bị trùng lặp giữa các thành viên trong cùng một đơn.');
    }

    // Phải có ít nhất 1 người lớn có giấy tờ hợp lệ
    const validAdult = guests.some(
      (g) => g.guest_type === 'adult' && g.doc_number && g.status === 'confirmed',
    );
    if (!validAdult) {
      throw new BadRequestException('Đoàn bắt buộc phải có ít nhất 1 người lớn có giấy tờ CCCD/Hộ chiếu hợp lệ.');
    }

    const hasLowConfidence = guests.some((g) => g.status === 'ocr_low_confidence' || (g.ocr_confidence && g.ocr_confidence < 80));
    const finalVerification = hasLowConfidence ? 'manual_review' : 'passed';

    await this.dataSource.query(
      `UPDATE BOOKINGS SET verification_status = ? WHERE id = ?`,
      [finalVerification, bookingId],
    );

    return {
      booking_id: bookingId,
      verification_status: finalVerification,
      ready_for_payment: true,
    };
  }
}
