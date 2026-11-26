-- ============================================================================
-- MIGRATION 008: Fix rooms table + create room_groups/features/blocks
-- Chạy sau khi import datn1.sql (rooms table có PK là `id`)
-- ============================================================================

-- 1. Tạo bảng room_groups
CREATE TABLE IF NOT EXISTS room_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO room_groups (id, name, is_active) VALUES
(1, 'Phòng góc', 1),(2, 'Hành lang', 1),(3, 'Giữa dãy', 1),
(4, 'Cuối dãy', 1),(5, 'Gần cầu thang', 1),(6, 'Gần thang máy', 1);

-- 2. Tạo bảng room_features
CREATE TABLE IF NOT EXISTS room_features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  category ENUM('view','sunlight','comfort','amenity') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO room_features (id, name, category, is_active) VALUES
(1,'View biển trực diện','view',1),(2,'View biển một phần','view',1),
(3,'View hồ bơi','view',1),(4,'View núi','view',1),(5,'View vườn','view',1),
(6,'Đón nắng sáng','sunlight',1),(7,'Hoàng hôn','sunlight',1),(8,'Đón gió biển','sunlight',1),
(9,'Yên tĩnh','comfort',1),(10,'Nhiều cửa sổ / thoáng','comfort',1),(11,'Cách âm tốt','comfort',1),
(12,'Ban công riêng','amenity',1),(13,'Cửa kính sát sàn','amenity',1),
(14,'Bồn tắm ngâm','amenity',1),(15,'Jacuzzi riêng','amenity',1),
(16,'Gác lửng','amenity',1),(17,'Bếp nhỏ','amenity',1),(18,'Phòng thông nhau','amenity',1);

-- 3. Thêm cột còn thiếu vào bảng rooms (idempotent với IF NOT EXISTS)
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS floor INT NOT NULL DEFAULT 1 AFTER room_number,
  ADD COLUMN IF NOT EXISTS room_group_id INT NULL AFTER floor,
  ADD COLUMN IF NOT EXISTS note TEXT NULL AFTER room_group_id,
  ADD COLUMN IF NOT EXISTS housekeeping ENUM('clean','dirty') NOT NULL DEFAULT 'clean' AFTER note,
  ADD COLUMN IF NOT EXISTS special_features VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS is_hidden TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;

-- 4. Chuẩn hóa status enum (thêm 'cleaning', giữ lại 'occupied')
ALTER TABLE rooms MODIFY COLUMN status 
  ENUM('available','occupied','cleaning','maintenance','inactive') NOT NULL DEFAULT 'available';

-- 5. FK room_group_id (chỉ thêm nếu chưa có)
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA='duantotnghiep' AND TABLE_NAME='rooms' AND CONSTRAINT_NAME='fk_rooms_room_group');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE rooms ADD CONSTRAINT fk_rooms_room_group FOREIGN KEY (room_group_id) REFERENCES room_groups(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. UNIQUE constraint (apartment_id, room_number) nếu chưa có
SET @uq_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA='duantotnghiep' AND TABLE_NAME='rooms' AND CONSTRAINT_NAME='uq_rooms_apt_num');
SET @sql2 = IF(@uq_exists = 0,
  'ALTER TABLE rooms ADD CONSTRAINT uq_rooms_apt_num UNIQUE (apartment_id, room_number)',
  'SELECT 1');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- 7. Backfill floor từ room_number (P101 -> floor=1, P205 -> floor=2)
UPDATE rooms SET floor = CASE
  WHEN room_number REGEXP '[A-Za-z]*[0-9]{3,}$' THEN
    CAST(SUBSTR(REGEXP_SUBSTR(room_number, '[0-9]+$'), 1, LENGTH(REGEXP_SUBSTR(room_number, '[0-9]+$')) - 2) AS UNSIGNED)
  ELSE 0
END
WHERE floor = 1;

-- 8. Chuyển status='maintenance' -> room_blocks mở (cần bảng room_blocks trước)
CREATE TABLE IF NOT EXISTS room_blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  from_at DATETIME NOT NULL,
  to_at DATETIME NULL COMMENT 'NULL = chưa rõ ngày',
  reason VARCHAR(500) NOT NULL,
  created_by VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room_blocks_range (room_id, from_at, to_at),
  CONSTRAINT fk_rb_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO room_blocks (room_id, from_at, to_at, reason, created_by, created_at)
SELECT id, NOW(), NULL, 'Chuyển từ trạng thái cũ', 'SYSTEM', NOW()
FROM rooms WHERE status = 'maintenance';

-- 9. Bảng room_feature_map
CREATE TABLE IF NOT EXISTS room_feature_map (
  room_id INT NOT NULL,
  feature_id INT NOT NULL,
  PRIMARY KEY (room_id, feature_id),
  CONSTRAINT fk_rfm_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_rfm_feature FOREIGN KEY (feature_id) REFERENCES room_features(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
