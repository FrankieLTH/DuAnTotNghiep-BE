-- ============================================================================
-- MIGRATION: 005_recommendation_and_stay_config.sql (UP)
-- Bảng cấu hình loại lưu trú, chuẩn hóa các cột gợi ý và index cho tìm kiếm
-- ============================================================================

-- 1. BẢNG CẤU HÌNH LOẠI LƯU TRÚ (stay_type_config)
CREATE TABLE IF NOT EXISTS stay_type_config (
  stay_type VARCHAR(20) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  price_factor DECIMAL(3, 2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed 3 loại lưu trú theo đúng quy tắc nghiệp vụ
INSERT INTO stay_type_config (stay_type, name, start_time, end_time, price_factor)
VALUES
  ('overnight', 'Qua đêm', '19:00:00', '12:00:00', 0.70),
  ('daytime', 'Trong ngày', '07:00:00', '17:00:00', 0.70),
  ('fullday', 'Qua ngày', '14:00:00', '12:00:00', 1.00)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  start_time = VALUES(start_time),
  end_time = VALUES(end_time),
  price_factor = VALUES(price_factor);

-- 2. CẬP NHẬT BẢNG BOOKINGS: Bổ sung các cột stay_type, start_at, end_at, room_type_id
ALTER TABLE BOOKINGS
  ADD COLUMN stay_type VARCHAR(20) NULL AFTER booking_type,
  ADD COLUMN start_at DATETIME NULL AFTER booked_start_time,
  ADD COLUMN end_at DATETIME NULL AFTER booked_end_time,
  ADD COLUMN room_type_id INT NULL AFTER apartment_id;

-- Backfill dữ liệu lịch sử cho start_at, end_at, stay_type
UPDATE BOOKINGS
SET
  start_at = booked_start_time,
  end_at = booked_end_time,
  stay_type = CASE
    WHEN booking_type = 'daily' THEN 'daytime'
    WHEN booking_type = 'extended' THEN 'fullday'
    ELSE 'overnight'
  END
WHERE start_at IS NULL;

-- Backfill room_type_id từ Booking_rooms hoặc ROOMS nếu có
UPDATE BOOKINGS b
LEFT JOIN Booking_rooms br ON br.bookings_id = b.id
SET b.room_type_id = br.room_types_id
WHERE b.room_type_id IS NULL AND br.room_types_id IS NOT NULL;

-- 3. ĐẢM BẢO room_types.max_occupancy INT NOT NULL
ALTER TABLE room_types MODIFY COLUMN max_occupancy INT NOT NULL DEFAULT 2;

-- 4. CẬP NHẬT Booking_rooms: thêm adults, children, unit_price
ALTER TABLE Booking_rooms
  ADD COLUMN adults INT NULL DEFAULT 1,
  ADD COLUMN children INT NULL DEFAULT 0,
  ADD COLUMN unit_price DECIMAL(12, 2) NULL DEFAULT 0;

-- 5. THÊM CÁC INDEX TỐI ƯU HÓA TRUY VẤN
-- bookings(room_type_id, status, start_at, end_at)
CREATE INDEX idx_bookings_rt_status_times ON BOOKINGS (room_type_id, booking_status, start_at, end_at);

-- bookings(apartment_id, status, end_at)
CREATE INDEX idx_bookings_apt_status_end_at ON BOOKINGS (apartment_id, booking_status, end_at);

-- room_types(apartment_id, is_active)
CREATE INDEX idx_room_types_apt_active ON room_types (apartment_id, is_active);

-- rooms(room_type_id, status)
CREATE INDEX idx_rooms_rt_status ON ROOMS (room_type_id, status);
