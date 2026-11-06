-- ============================================================================
-- MIGRATION: 002_backfill_data.sql (UP)
-- Mục tiêu: Tách room_types dùng chung giữa các chi nhánh & suy ra BOOKINGS.apartment_id
-- ============================================================================

-- BƯỚC 1: Gán apartment_id cho room_types đơn chi nhánh trước
UPDATE room_types rt
JOIN (
  SELECT room_type_id, MIN(apartment_id) AS single_apt_id
  FROM ROOMS
  GROUP BY room_type_id
  HAVING COUNT(DISTINCT apartment_id) = 1
) r_single ON r_single.room_type_id = rt.id
SET rt.apartment_id = r_single.single_apt_id
WHERE rt.apartment_id IS NULL;

-- Nếu room_types chưa có phòng nào trong ROOMS, mặc định gán về chi nhánh 1
UPDATE room_types SET apartment_id = 1 WHERE apartment_id IS NULL;

-- BƯỚC 2: Backfill BOOKINGS.apartment_id từ Booking_rooms -> ROOMS hoặc room_types
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

-- Mặc định fallback cho đơn không có Booking_rooms
UPDATE BOOKINGS SET apartment_id = 1 WHERE apartment_id IS NULL;

-- BƯỚC 3: Thắt chặt ràng buộc NOT NULL và FOREIGN KEY
ALTER TABLE room_types MODIFY COLUMN apartment_id INT NOT NULL;
ALTER TABLE room_types ADD CONSTRAINT fk_room_types_apartment FOREIGN KEY (apartment_id) REFERENCES APARTMENT(id) ON DELETE RESTRICT;

ALTER TABLE BOOKINGS MODIFY COLUMN apartment_id INT NOT NULL;
ALTER TABLE BOOKINGS ADD CONSTRAINT fk_bookings_apartment FOREIGN KEY (apartment_id) REFERENCES APARTMENT(id) ON DELETE RESTRICT;
