-- ============================================================================
-- MIGRATION: 001_schema_changes.sql (UP)
-- Mục tiêu: Cập nhật schema cho APARTMENT, room_types, BOOKINGS, ROOMS, lock, CUSTOMER
-- ============================================================================

-- 1. APARTMENT: thêm hotline, created_at, updated_at; status 'active' | 'hidden'
ALTER TABLE APARTMENT ADD COLUMN hotline VARCHAR(50) NULL AFTER address;
ALTER TABLE APARTMENT ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE APARTMENT ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Chuẩn hóa status sang 'active' | 'hidden'
UPDATE APARTMENT SET status = 'hidden' WHERE status NOT IN ('active', 'hidden');
ALTER TABLE APARTMENT MODIFY COLUMN status ENUM('active', 'hidden') NOT NULL DEFAULT 'active';

-- 2. room_types: thêm apartment_id (nullable tạm để backfill), description, bed_config, area, is_active
ALTER TABLE room_types ADD COLUMN apartment_id INT NULL AFTER id;
ALTER TABLE room_types ADD COLUMN description TEXT NULL;
ALTER TABLE room_types ADD COLUMN bed_config VARCHAR(100) NULL DEFAULT '1 giường đôi';
ALTER TABLE room_types ADD COLUMN area INT NULL DEFAULT 28;
ALTER TABLE room_types ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;

-- 3. BOOKINGS: thêm apartment_id (nullable tạm để backfill)
ALTER TABLE BOOKINGS ADD COLUMN apartment_id INT NULL AFTER booking_code;

-- 4. lock: đảm bảo có các cột theo dõi tình trạng khóa trước khi dọn bảng ROOMS
ALTER TABLE lock ADD COLUMN lock_status ENUM('online', 'offline', 'unknown') NOT NULL DEFAULT 'unknown';
ALTER TABLE lock ADD COLUMN battery_level INT NOT NULL DEFAULT 100;
ALTER TABLE lock ADD COLUMN last_sync_at DATETIME NULL;
ALTER TABLE lock ADD COLUMN master_pin VARCHAR(50) NULL;
ALTER TABLE lock ADD COLUMN deleted_at DATETIME NULL;

-- 5. ROOMS: thêm is_hidden, created_at, updated_at; chuyển status sang 'available' | 'maintenance'
ALTER TABLE ROOMS ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE ROOMS ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE ROOMS ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Chuyển trạng thái cũ sang 'available' | 'maintenance'
UPDATE ROOMS SET status = 'available' WHERE status NOT IN ('available', 'maintenance');
ALTER TABLE ROOMS MODIFY COLUMN status ENUM('available', 'maintenance') NOT NULL DEFAULT 'available';

-- Ràng buộc UNIQUE (apartment_id, room_number)
ALTER TABLE ROOMS ADD CONSTRAINT uq_rooms_apartment_room_number UNIQUE (apartment_id, room_number);

-- Sao chép dữ liệu khóa từ ROOMS sang lock (nếu có khớp room_id) trước khi bỏ cột
UPDATE lock l
JOIN ROOMS r ON r.room_id = l.room_id
SET l.lock_status = COALESCE(r.lock_status, l.lock_status),
    l.battery_level = COALESCE(r.battery_level, l.battery_level),
    l.last_sync_at = COALESCE(r.last_sync_at, l.last_sync_at),
    l.master_pin = COALESCE(r.master_pin, l.master_pin)
WHERE r.room_id IS NOT NULL;

-- Bỏ các cột khóa khỏi bảng ROOMS để gom quản lý về bảng lock
ALTER TABLE ROOMS DROP COLUMN lock_id;
ALTER TABLE ROOMS DROP COLUMN lock_name;
ALTER TABLE ROOMS DROP COLUMN lock_status;
ALTER TABLE ROOMS DROP COLUMN battery_level;
ALTER TABLE ROOMS DROP COLUMN last_sync_at;
ALTER TABLE ROOMS DROP COLUMN master_pin;

-- Nối quan hệ lock.room_id (FK ROOMS, NULLABLE) và UNIQUE active lock (khóa chưa xóa mềm)
ALTER TABLE lock MODIFY COLUMN room_id INT NULL;
ALTER TABLE lock ADD CONSTRAINT fk_lock_room FOREIGN KEY (room_id) REFERENCES ROOMS(room_id) ON DELETE SET NULL;

-- Cột ảo active_room_id để bảo đảm 1 phòng chỉ có 1 khóa active, cho phép nhiều NULL và soft-deleted
ALTER TABLE lock ADD COLUMN active_room_id INT GENERATED ALWAYS AS (IF(deleted_at IS NULL, room_id, NULL)) VIRTUAL;
ALTER TABLE lock ADD CONSTRAINT uq_lock_active_room_id UNIQUE (active_room_id);

-- 6. CUSTOMER: thêm is_hidden, created_at, updated_at; UNIQUE(email); xóa password_hash
ALTER TABLE CUSTOMER ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE CUSTOMER ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE CUSTOMER ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE CUSTOMER ADD CONSTRAINT uq_customer_email UNIQUE (email);

-- Xóa cột password_hash nếu tồn tại (khách dùng OTP email xác thực không lưu mật khẩu)
ALTER TABLE CUSTOMER DROP COLUMN password_hash;
