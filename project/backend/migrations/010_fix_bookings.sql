-- Fix bookings table: thêm apartment_id và các cột còn thiếu
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS apartment_id INT NULL AFTER booking_code;

-- Backfill apartment_id từ booking_rooms -> rooms
UPDATE bookings b
JOIN (
  SELECT br.bookings_id, r.apartment_id
  FROM booking_services br
  JOIN rooms r ON br.room_id = r.id
  GROUP BY br.bookings_id
) derived ON b.id = derived.bookings_id
SET b.apartment_id = derived.apartment_id
WHERE b.apartment_id IS NULL;

-- Fix lock table name (reserved keyword) -> đổi thành `locks`
-- Kiểm tra xem bảng có tên 'lock' không
-- (đã có 'locks' từ datn1.sql, nên thường là OK)

-- Backfill apartment_id còn lại = 1
UPDATE bookings SET apartment_id = 1 WHERE apartment_id IS NULL;
