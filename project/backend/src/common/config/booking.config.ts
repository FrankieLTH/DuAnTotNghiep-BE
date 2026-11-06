/**
 * Config giờ nhận/trả cố định theo từng loại đặt phòng
 * KHÔNG cho khách chọn giờ, chỉ chọn ngày
 */
export const BOOKING_TIME_CONFIG = {
  overnight: {
    checkInHour: 14,   // 14:00 ngày nhận
    checkOutHour: 12,  // 12:00 ngày hôm sau
    minNights: 1,
    maxNights: 1,      // Qua đêm: trả phòng = nhận phòng + 1 ngày
  },
  daily: {
    checkInHour: 14,   // 14:00 ngày nhận
    checkOutHour: 12,  // 12:00 ngày trả phòng (sau N ngày)
    minNights: 1,
  },
  holdExpiresMinutes: 15, // Thời gian giữ phòng tạm: 15 phút
  childAgeLimit: 10,      // Dưới 10 tuổi = Trẻ em, từ 10 tuổi trở lên = bắt buộc upload CCCD
};

export interface SearchRoomsQueryDto {
  apartment_id?: number;
  booking_type: 'overnight' | 'daily';
  check_in_date: string;  // YYYY-MM-DD
  check_out_date: string; // YYYY-MM-DD
  adults: number;         // min 1
  children: number;
  children_ages?: number[];       // min 0 (dưới 10 tuổi)
}

export interface SelectedRoomItemDto {
  room_types_id: number;
  quantity: number;
}

export interface CreateDraftBookingDto {
  customer_id?: number;
  room_types_id?: number; // Hỗ trợ 1 loại phòng đơn lẻ (tương thích ngược)
  selected_rooms?: SelectedRoomItemDto[]; // Danh sách các loại phòng và số lượng khách chọn (khớp quan hệ 1-N Booking_rooms)
  booking_type: 'overnight' | 'daily';
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  children_ages?: number[]; // tuổi của từng trẻ em (để kiểm tra quy tắc sức chứa)
  booker: {
    full_name: string;
    email: string;
    phone: string;
    is_booked_for_other: boolean;
    lock_email?: string;
    consent_at: boolean;
  };
}
