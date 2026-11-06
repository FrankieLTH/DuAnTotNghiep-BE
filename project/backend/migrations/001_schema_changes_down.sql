-- ============================================================================
-- MIGRATION: 001_schema_changes_down.sql (ROLLBACK)
-- ============================================================================

-- 1. Rollback CUSTOMER
ALTER TABLE CUSTOMER ADD COLUMN password_hash VARCHAR(255) NULL;
ALTER TABLE CUSTOMER DROP INDEX uq_customer_email;
ALTER TABLE CUSTOMER DROP COLUMN updated_at;
ALTER TABLE CUSTOMER DROP COLUMN created_at;
ALTER TABLE CUSTOMER DROP COLUMN is_hidden;

-- 2. Rollback lock & ROOMS
ALTER TABLE lock DROP INDEX uq_lock_active_room_id;
ALTER TABLE lock DROP COLUMN active_room_id;
ALTER TABLE lock DROP FOREIGN KEY fk_lock_room;

ALTER TABLE ROOMS ADD COLUMN master_pin VARCHAR(50) NULL;
ALTER TABLE ROOMS ADD COLUMN last_sync_at DATETIME NULL;
ALTER TABLE ROOMS ADD COLUMN battery_level INT NULL DEFAULT 100;
ALTER TABLE ROOMS ADD COLUMN lock_status VARCHAR(50) NULL DEFAULT 'unknown';
ALTER TABLE ROOMS ADD COLUMN lock_name VARCHAR(100) NULL;
ALTER TABLE ROOMS ADD COLUMN lock_id INT NULL;

ALTER TABLE ROOMS DROP INDEX uq_rooms_apartment_room_number;
ALTER TABLE ROOMS MODIFY COLUMN status ENUM('available', 'occupied', 'maintenance', 'inactive') NOT NULL DEFAULT 'available';
ALTER TABLE ROOMS DROP COLUMN updated_at;
ALTER TABLE ROOMS DROP COLUMN created_at;
ALTER TABLE ROOMS DROP COLUMN is_hidden;

ALTER TABLE lock DROP COLUMN deleted_at;
ALTER TABLE lock DROP COLUMN master_pin;
ALTER TABLE lock DROP COLUMN last_sync_at;
ALTER TABLE lock DROP COLUMN battery_level;
ALTER TABLE lock DROP COLUMN lock_status;

-- 3. Rollback BOOKINGS
ALTER TABLE BOOKINGS DROP COLUMN apartment_id;

-- 4. Rollback room_types
ALTER TABLE room_types DROP COLUMN is_active;
ALTER TABLE room_types DROP COLUMN area;
ALTER TABLE room_types DROP COLUMN bed_config;
ALTER TABLE room_types DROP COLUMN description;
ALTER TABLE room_types DROP COLUMN apartment_id;

-- 5. Rollback APARTMENT
ALTER TABLE APARTMENT MODIFY COLUMN status ENUM('active', 'inactive', 'under_construction') NOT NULL DEFAULT 'active';
ALTER TABLE APARTMENT DROP COLUMN updated_at;
ALTER TABLE APARTMENT DROP COLUMN created_at;
ALTER TABLE APARTMENT DROP COLUMN hotline;
