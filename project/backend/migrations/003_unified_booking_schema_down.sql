-- ============================================================================
-- MIGRATION: 003_unified_booking_schema_down.sql (DOWN)
-- Rollback thống nhất schema cho hệ thống Homestay Booking
-- ============================================================================

-- 1. Hoàn tác AI_CHAT_LOGS
ALTER TABLE ai_chat_logs CHANGE COLUMN customer_id user_id INT NULL;

-- 2. Xóa bảng Audit_logs
DROP TABLE IF EXISTS Audit_logs;

-- 3. Xóa bảng TRANSACTION
DROP TABLE IF EXISTS TRANSACTION;

-- 4. Xóa bảng Booking_rooms
DROP TABLE IF EXISTS Booking_rooms;

-- 5. Xóa bảng booking_guests
DROP TABLE IF EXISTS booking_guests;

-- 6. Hoàn tác các cột và ràng buộc trên BOOKINGS
ALTER TABLE BOOKINGS DROP FOREIGN KEY IF EXISTS fk_bookings_staff_created;
ALTER TABLE BOOKINGS DROP FOREIGN KEY IF EXISTS fk_bookings_staff_reviewed;
ALTER TABLE BOOKINGS DROP FOREIGN KEY IF EXISTS fk_bookings_staff_cancelled;

DROP INDEX IF EXISTS idx_bookings_apt_status_start ON BOOKINGS;
DROP INDEX IF EXISTS idx_bookings_customer_hold ON BOOKINGS;

ALTER TABLE BOOKINGS DROP COLUMN IF EXISTS adults;
ALTER TABLE BOOKINGS DROP COLUMN IF EXISTS children;
ALTER TABLE BOOKINGS DROP COLUMN IF EXISTS is_booked_for_other;
ALTER TABLE BOOKINGS DROP COLUMN IF EXISTS lock_email;
ALTER TABLE BOOKINGS DROP COLUMN IF EXISTS verification_status;
ALTER TABLE BOOKINGS DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE BOOKINGS DROP COLUMN IF EXISTS reviewed_at;
ALTER TABLE BOOKINGS DROP COLUMN IF EXISTS consent_at;
ALTER TABLE BOOKINGS DROP COLUMN IF EXISTS stay_reason;
ALTER TABLE BOOKINGS DROP COLUMN IF EXISTS source;
ALTER TABLE BOOKINGS DROP COLUMN IF EXISTS created_by;
ALTER TABLE BOOKINGS DROP COLUMN IF EXISTS note;
ALTER TABLE BOOKINGS DROP COLUMN IF EXISTS cancel_reason;
ALTER TABLE BOOKINGS DROP COLUMN IF EXISTS cancelled_at;
ALTER TABLE BOOKINGS DROP COLUMN IF EXISTS cancelled_by;

ALTER TABLE BOOKINGS MODIFY COLUMN booking_status ENUM(
  'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'expired', 'no_show'
) NOT NULL DEFAULT 'pending';

ALTER TABLE BOOKINGS MODIFY COLUMN booking_type ENUM(
  'short_stay', 'long_stay', 'monthly', 'overnight', 'daily'
) NOT NULL DEFAULT 'overnight';
