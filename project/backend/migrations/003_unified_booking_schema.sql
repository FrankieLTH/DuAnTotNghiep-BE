-- ============================================================================
-- MIGRATION: 003_unified_booking_schema.sql (UP)
-- Thống nhất toàn bộ bảng, cột, index, enum cho hệ thống Homestay Booking
-- ============================================================================

-- 1. BẢNG BOOKINGS
-- Cập nhật enum booking_status và booking_type
ALTER TABLE BOOKINGS MODIFY COLUMN booking_status ENUM(
  'draft', 'pending_payment', 'confirmed', 'checked_in', 'checked_out', 'expired', 'cancelled'
) NOT NULL DEFAULT 'pending_payment';

ALTER TABLE BOOKINGS MODIFY COLUMN booking_type ENUM(
  'overnight', 'daily'
) NOT NULL DEFAULT 'overnight';

-- Bổ sung các cột phục vụ quản lý booking nâng cao
ALTER TABLE BOOKINGS ADD COLUMN adults INT NOT NULL DEFAULT 1 AFTER voucher_id;
ALTER TABLE BOOKINGS ADD COLUMN children INT NOT NULL DEFAULT 0 AFTER adults;
ALTER TABLE BOOKINGS ADD COLUMN is_booked_for_other TINYINT(1) NOT NULL DEFAULT 0 AFTER children;
ALTER TABLE BOOKINGS ADD COLUMN lock_email VARCHAR(150) NULL AFTER is_booked_for_other;
ALTER TABLE BOOKINGS ADD COLUMN verification_status ENUM('pending', 'passed', 'manual_review', 'rejected') NOT NULL DEFAULT 'pending' AFTER booking_status;
ALTER TABLE BOOKINGS ADD COLUMN reviewed_by INT NULL AFTER verification_status;
ALTER TABLE BOOKINGS ADD COLUMN reviewed_at DATETIME NULL AFTER reviewed_by;
ALTER TABLE BOOKINGS ADD COLUMN consent_at DATETIME NULL AFTER reviewed_at;
ALTER TABLE BOOKINGS ADD COLUMN stay_reason VARCHAR(255) NULL AFTER consent_at;
ALTER TABLE BOOKINGS ADD COLUMN source ENUM('online', 'admin') NOT NULL DEFAULT 'online' AFTER stay_reason;
ALTER TABLE BOOKINGS ADD COLUMN created_by INT NULL AFTER source;
ALTER TABLE BOOKINGS ADD COLUMN note TEXT NULL AFTER created_by;
ALTER TABLE BOOKINGS ADD COLUMN cancel_reason TEXT NULL AFTER note;
ALTER TABLE BOOKINGS ADD COLUMN cancelled_at DATETIME NULL AFTER cancel_reason;
ALTER TABLE BOOKINGS ADD COLUMN cancelled_by INT NULL AFTER cancelled_at;

-- Khóa ngoại STAFF cho BOOKINGS
ALTER TABLE BOOKINGS ADD CONSTRAINT fk_bookings_staff_created FOREIGN KEY (created_by) REFERENCES STAFF(staff_id) ON DELETE SET NULL;
ALTER TABLE BOOKINGS ADD CONSTRAINT fk_bookings_staff_reviewed FOREIGN KEY (reviewed_by) REFERENCES STAFF(staff_id) ON DELETE SET NULL;
ALTER TABLE BOOKINGS ADD CONSTRAINT fk_bookings_staff_cancelled FOREIGN KEY (cancelled_by) REFERENCES STAFF(staff_id) ON DELETE SET NULL;

-- Thêm các Index tối ưu hóa truy vấn
CREATE INDEX idx_bookings_apt_status_start ON BOOKINGS (apartment_id, booking_status, booked_start_time);
CREATE INDEX idx_bookings_customer_hold ON BOOKINGS (customer_id, hold_expires_at);

-- 2. BẢNG booking_guests
CREATE TABLE IF NOT EXISTS booking_guests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bookings_id INT NOT NULL,
  guest_type ENUM('primary', 'additional') NOT NULL DEFAULT 'primary',
  is_staying TINYINT(1) NOT NULL DEFAULT 1,
  full_name VARCHAR(150) NOT NULL,
  date_of_birth DATE NULL,
  gender ENUM('male', 'female', 'other') NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  doc_type ENUM('cccd', 'passport', 'birth_cert') NULL,
  doc_number VARCHAR(50) NULL,
  doc_image_front VARCHAR(255) NULL,
  doc_image_back VARCHAR(255) NULL,
  ocr_confidence DECIMAL(5,2) NULL,
  ocr_raw LONGTEXT NULL,
  status ENUM('empty', 'uploading', 'ocr_done', 'ocr_low_confidence', 'manual_child', 'confirmed') NOT NULL DEFAULT 'empty',
  doc_deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_guests_booking FOREIGN KEY (bookings_id) REFERENCES BOOKINGS(id) ON DELETE CASCADE,
  CONSTRAINT uq_booking_guest_doc UNIQUE (bookings_id, doc_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BẢNG Booking_rooms
CREATE TABLE IF NOT EXISTS Booking_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bookings_id INT NOT NULL,
  room_types_id INT NOT NULL,
  room_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_rooms_booking FOREIGN KEY (bookings_id) REFERENCES BOOKINGS(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_rooms_room_type FOREIGN KEY (room_types_id) REFERENCES room_types(id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_rooms_room FOREIGN KEY (room_id) REFERENCES ROOMS(room_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_booking_rooms_room_id ON Booking_rooms (room_id);

-- 4. BẢNG TRANSACTION
CREATE TABLE IF NOT EXISTS TRANSACTION (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  type ENUM('payment', 'refund') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'counter_cash',
  transaction_code VARCHAR(100) NULL,
  note TEXT NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_transaction_booking FOREIGN KEY (booking_id) REFERENCES BOOKINGS(id) ON DELETE CASCADE,
  CONSTRAINT fk_transaction_staff FOREIGN KEY (created_by) REFERENCES STAFF(staff_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. BẢNG Audit_logs
CREATE TABLE IF NOT EXISTS Audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor VARCHAR(100) NOT NULL,
  actor_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  old_value LONGTEXT NULL,
  new_value LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_audit_logs_entity ON Audit_logs (entity_type, entity_id);

-- 6. AI_CHAT_LOGS: chuẩn hóa user_id -> customer_id
ALTER TABLE ai_chat_logs CHANGE COLUMN user_id customer_id INT NULL;
