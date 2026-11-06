-- ============================================================
-- Migration 004: Rollback
-- DOWN Script
-- ============================================================

-- 1. Chuyển occupied/cleaning về available trước khi thu hẹp enum
UPDATE ROOMS SET status = 'available' WHERE status IN ('occupied', 'cleaning');

-- 2. Thu hẹp lại enum ROOMS.status
ALTER TABLE ROOMS
  MODIFY COLUMN status ENUM('available', 'maintenance')
  NOT NULL DEFAULT 'available';

-- 3. Chuyển extended về overnight trước khi thu hẹp enum
UPDATE BOOKINGS SET booking_type = 'overnight' WHERE booking_type = 'extended';

-- 4. Thu hẹp lại enum BOOKINGS.booking_type
ALTER TABLE BOOKINGS
  MODIFY COLUMN booking_type ENUM('overnight', 'daily')
  NOT NULL DEFAULT 'overnight';
