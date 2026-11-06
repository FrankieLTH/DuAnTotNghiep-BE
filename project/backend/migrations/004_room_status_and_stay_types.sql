-- ============================================================
-- Migration 004: Mở rộng enum ROOMS.status và BOOKINGS.booking_type
-- UP Script
-- ============================================================

-- 1. Mở rộng ROOMS.status để bao gồm 'occupied' và 'cleaning'
ALTER TABLE ROOMS
  MODIFY COLUMN status ENUM('available', 'occupied', 'cleaning', 'maintenance')
  NOT NULL DEFAULT 'available';

-- 2. Mở rộng BOOKINGS.booking_type để bao gồm 'extended' (Qua ngày 14h-12h)
ALTER TABLE BOOKINGS
  MODIFY COLUMN booking_type ENUM('overnight', 'daily', 'extended')
  NOT NULL DEFAULT 'overnight';
