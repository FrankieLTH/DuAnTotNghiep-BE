-- ============================================================================
-- MIGRATION: 007_room_enhancements_and_blocks.sql (UP)
-- Nâng cấp quản lý phòng: floor, room_groups, room_features, room_blocks, housekeeping
-- ============================================================================

-- 1. Bảng room_groups (Nhóm phòng: vị trí trong tòa nhà, chỉ admin/quản lý thấy)
CREATE TABLE IF NOT EXISTS room_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed room_groups
INSERT IGNORE INTO room_groups (id, name, is_active) VALUES
(1, 'Phòng góc', 1),
(2, 'Hành lang', 1),
(3, 'Giữa dãy', 1),
(4, 'Cuối dãy', 1),
(5, 'Gần cầu thang', 1),
(6, 'Gần thang máy', 1);

-- 2. Bảng room_features (Đặc điểm trải nghiệm phòng, khách và admin đều thấy)
CREATE TABLE IF NOT EXISTS room_features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  category ENUM('view', 'sunlight', 'comfort', 'amenity') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed room_features
INSERT IGNORE INTO room_features (id, name, category, is_active) VALUES
-- View
(1, 'View biển trực diện', 'view', 1),
(2, 'View biển một phần', 'view', 1),
(3, 'View hồ bơi', 'view', 1),
(4, 'View núi', 'view', 1),
(5, 'View vườn', 'view', 1),
-- Sunlight
(6, 'Đón nắng sáng', 'sunlight', 1),
(7, 'Hoàng hôn', 'sunlight', 1),
(8, 'Đón gió biển', 'sunlight', 1),
-- Comfort
(9, 'Yên tĩnh', 'comfort', 1),
(10, 'Nhiều cửa sổ / thoáng', 'comfort', 1),
(11, 'Cách âm tốt', 'comfort', 1),
-- Amenity
(12, 'Ban công riêng', 'amenity', 1),
(13, 'Cửa kính sát sàn', 'amenity', 1),
(14, 'Bồn tắm ngâm', 'amenity', 1),
(15, 'Jacuzzi riêng', 'amenity', 1),
(16, 'Gác lửng', 'amenity', 1),
(17, 'Bếp nhỏ', 'amenity', 1),
(18, 'Phòng thông nhau', 'amenity', 1);

-- 3. Cập nhật bảng ROOMS: thêm floor, room_group_id, note, housekeeping, deleted_at
ALTER TABLE ROOMS
  ADD COLUMN floor INT NOT NULL DEFAULT 1 AFTER room_number,
  ADD COLUMN room_group_id INT NULL AFTER floor,
  ADD COLUMN note TEXT NULL AFTER room_group_id,
  ADD COLUMN housekeeping ENUM('clean', 'dirty') NOT NULL DEFAULT 'clean' AFTER note,
  ADD COLUMN deleted_at DATETIME NULL AFTER updated_at,
  ADD CONSTRAINT fk_rooms_room_group FOREIGN KEY (room_group_id) REFERENCES room_groups(id) ON DELETE SET NULL;

-- 4. Bảng liên kết phòng - đặc điểm (room_feature_map, PK kép)
CREATE TABLE IF NOT EXISTS room_feature_map (
  room_id INT NOT NULL,
  feature_id INT NOT NULL,
  PRIMARY KEY (room_id, feature_id),
  CONSTRAINT fk_rfm_room FOREIGN KEY (room_id) REFERENCES ROOMS(room_id) ON DELETE CASCADE,
  CONSTRAINT fk_rfm_feature FOREIGN KEY (feature_id) REFERENCES room_features(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng chặn/bảo trì phòng theo khoảng thời gian (room_blocks)
CREATE TABLE IF NOT EXISTS room_blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  from_at DATETIME NOT NULL,
  to_at DATETIME NULL COMMENT 'NULL = chưa rõ ngày',
  reason VARCHAR(500) NOT NULL,
  created_by VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room_blocks_range (room_id, from_at, to_at),
  CONSTRAINT fk_rb_room FOREIGN KEY (room_id) REFERENCES ROOMS(room_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Chuyển đổi dữ liệu cũ (Backfill)
-- 6.1 Backfill floor từ chữ số hàng trăm của room_number (VD: P101 -> 1, P205 -> 2, 001 -> 0)
UPDATE ROOMS 
SET floor = CASE
  WHEN room_number REGEXP '[0-9]{3,}$' THEN 
    CAST(SUBSTRING(REGEXP_SUBSTR(room_number, '[0-9]+$'), 1, LENGTH(REGEXP_SUBSTR(room_number, '[0-9]+$')) - 2) AS UNSIGNED)
  WHEN room_number REGEXP '[0-9]+' THEN 
    CAST(REGEXP_SUBSTR(room_number, '[0-9]+') AS UNSIGNED)
  ELSE 0
END
WHERE floor = 1;

-- 6.2 Chuyển status = 'maintenance' sang room_blocks mở (to_at = NULL)
INSERT INTO room_blocks (room_id, from_at, to_at, reason, created_by, created_at)
SELECT room_id, NOW(), NULL, 'Chuyển từ trạng thái cũ', 'SYSTEM', NOW()
FROM ROOMS
WHERE status = 'maintenance';

-- 6.3 Chuyển status = 'cleaning' sang housekeeping = 'dirty'
UPDATE ROOMS
SET housekeeping = 'dirty'
WHERE status = 'cleaning';
