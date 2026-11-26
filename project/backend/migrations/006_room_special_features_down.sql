-- ============================================================================
-- MIGRATION: 006_room_special_features_down.sql (DOWN)
-- Xóa cột special_features khỏi bảng ROOMS
-- ============================================================================

ALTER TABLE ROOMS
DROP COLUMN special_features;
