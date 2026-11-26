-- Fix bookings table: thêm các cột còn thiếu
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS customer_id INT NULL AFTER user_id,
  ADD COLUMN IF NOT EXISTS room_type_id INT NULL,
  ADD COLUMN IF NOT EXISTS adults INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS children INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_booked_for_other TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lock_email VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS stay_type VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS start_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS end_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS verification_status ENUM('pending','passed','manual_review','rejected') NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by INT NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS consent_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS stay_reason VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS source ENUM('online','admin') NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS created_by INT NULL,
  ADD COLUMN IF NOT EXISTS note TEXT NULL,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by INT NULL,
  ADD COLUMN IF NOT EXISTS hold_expires_at DATETIME NULL;

-- Cập nhật enum booking_status để chứa đủ các giá trị
ALTER TABLE bookings MODIFY COLUMN booking_status 
  ENUM('pending','pending_payment','confirmed','checked_in','checked_out','cancelled','no_show','expired','draft') 
  NOT NULL DEFAULT 'pending';

-- Cập nhật enum booking_type
ALTER TABLE bookings MODIFY COLUMN booking_type 
  ENUM('short_stay','long_stay','monthly','overnight','daily') 
  NOT NULL DEFAULT 'short_stay';

-- Fix audit_logs table: thêm cột còn thiếu
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS actor VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS actor_id INT NULL,
  ADD COLUMN IF NOT EXISTS action VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS entity_id INT NULL,
  ADD COLUMN IF NOT EXISTS old_value LONGTEXT NULL,
  ADD COLUMN IF NOT EXISTS new_value LONGTEXT NULL;

-- Backfill actor từ user_id
UPDATE audit_logs SET actor = CONCAT('user_', user_id), entity_type = 'booking', entity_id = 0, action = 'unknown' 
WHERE actor IS NULL;

-- Fix TRANSACTION table (bảng hiện có là payments/refunds, tạo bảng transaction riêng nếu cần)
CREATE TABLE IF NOT EXISTS TRANSACTION (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  type ENUM('payment','refund') NOT NULL DEFAULT 'payment',
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(100) NOT NULL DEFAULT 'counter_cash',
  transaction_code VARCHAR(150) NULL,
  note TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fix booking_guests table (nếu chưa có)
CREATE TABLE IF NOT EXISTS booking_guests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bookings_id INT NOT NULL,
  guest_type ENUM('primary','additional') NOT NULL DEFAULT 'primary',
  is_staying TINYINT(1) NOT NULL DEFAULT 1,
  full_name VARCHAR(150) NOT NULL,
  date_of_birth DATE NULL,
  gender ENUM('male','female','other') NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  doc_type ENUM('cccd','passport','birth_cert') NULL,
  doc_number VARCHAR(50) NULL,
  doc_image_front VARCHAR(255) NULL,
  doc_image_back VARCHAR(255) NULL,
  ocr_confidence DECIMAL(5,2) NULL,
  ocr_raw LONGTEXT NULL,
  status ENUM('empty','uploading','ocr_done','ocr_low_confidence','manual_child','confirmed') NOT NULL DEFAULT 'empty',
  doc_deleted_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fix Booking_rooms table (nếu chưa có)
CREATE TABLE IF NOT EXISTS Booking_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bookings_id INT NOT NULL,
  room_types_id INT NOT NULL,
  room_id INT NULL,
  adults INT NOT NULL DEFAULT 1,
  children INT NOT NULL DEFAULT 0,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- customer_id backfill từ user_id 
UPDATE bookings SET customer_id = user_id WHERE customer_id IS NULL AND user_id IS NOT NULL;
