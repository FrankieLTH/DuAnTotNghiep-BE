-- ============================================================================
-- MIGRATION: 007_room_enhancements_and_blocks_down.sql (DOWN)
-- Rollback nâng cấp quản lý phòng
-- ============================================================================

DROP TABLE IF EXISTS room_blocks;
DROP TABLE IF EXISTS room_feature_map;

ALTER TABLE ROOMS DROP FOREIGN KEY fk_rooms_room_group;
ALTER TABLE ROOMS 
  DROP COLUMN floor,
  DROP COLUMN room_group_id,
  DROP COLUMN note,
  DROP COLUMN housekeeping,
  DROP COLUMN deleted_at;

DROP TABLE IF EXISTS room_features;
DROP TABLE IF EXISTS room_groups;
