-- Tạo bảng staff và customer chuẩn thực thể để JwtStrategy và CustomerModule hoạt động hoàn hảo
DROP VIEW IF EXISTS STAFF;
DROP VIEW IF EXISTS staff;
DROP VIEW IF EXISTS CUSTOMER;
DROP VIEW IF EXISTS customer;

CREATE TABLE IF NOT EXISTS staff (
  staff_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  apartment_id INT DEFAULT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(255) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_blocked TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO staff (staff_id, role_id, full_name, email, phone, password_hash, is_blocked)
SELECT id, role_id, full_name, email, phone, password_hash, IF(status='blocked', 1, 0)
FROM users WHERE role_id IN (1, 2);

CREATE TABLE IF NOT EXISTS customer (
  customer_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(255) DEFAULT NULL,
  is_blocked TINYINT NOT NULL DEFAULT 0,
  is_hidden TINYINT NOT NULL DEFAULT 0,
  password_hash VARCHAR(255) DEFAULT NULL,
  account_created_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO customer (customer_id, full_name, email, phone, is_blocked, password_hash)
SELECT id, full_name, email, phone, IF(status='blocked', 1, 0), password_hash
FROM users WHERE role_id = 3;
