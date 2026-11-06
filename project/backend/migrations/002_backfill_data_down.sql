-- ============================================================================
-- MIGRATION: 002_backfill_data_down.sql (ROLLBACK)
-- ============================================================================

ALTER TABLE BOOKINGS DROP FOREIGN KEY fk_bookings_apartment;
ALTER TABLE BOOKINGS MODIFY COLUMN apartment_id INT NULL;

ALTER TABLE room_types DROP FOREIGN KEY fk_room_types_apartment;
ALTER TABLE room_types MODIFY COLUMN apartment_id INT NULL;
