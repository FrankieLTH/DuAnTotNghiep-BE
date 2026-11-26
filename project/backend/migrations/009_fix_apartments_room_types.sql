-- Fix apartments, room_types, stay_type_config
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS hotline VARCHAR(50) NULL;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE apartments MODIFY COLUMN status ENUM('active','hidden','inactive','under_construction') NOT NULL DEFAULT 'active';

-- room_types: thêm apartment_id, description, bed_config, area, is_active
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS apartment_id INT NULL AFTER id;
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS description TEXT NULL;
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS bed_config VARCHAR(100) NULL DEFAULT '1 giường đôi';
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS area INT NULL DEFAULT 28;
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Backfill apartment_id cho room_types (nếu chưa có, lấy từ rooms)
UPDATE room_types rt
JOIN rooms r ON r.room_type_id = rt.id
SET rt.apartment_id = r.apartment_id
WHERE rt.apartment_id IS NULL;

-- stay_type_config (nếu không có table thì tạo)
CREATE TABLE IF NOT EXISTS stay_type_config (
  stay_type VARCHAR(20) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  price_factor DECIMAL(3,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- services table (đã có, không cần tạo)

-- Thêm cột updated_at cho rooms nếu chưa đúng kiểu
ALTER TABLE rooms MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
