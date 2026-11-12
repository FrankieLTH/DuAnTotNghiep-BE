-- ============================================================================
-- MIGRATION: 006_room_special_features.sql (UP)
-- Thêm cột special_features vào bảng ROOMS để lưu đặc điểm đặc biệt của phòng (nhập tay, không ảnh hưởng giá)
-- ============================================================================

ALTER TABLE ROOMS 
ADD COLUMN special_features VARCHAR(500) NULL COMMENT 'Mô tả đặc điểm đặc biệt của phòng (nhập tay, không ảnh hưởng giá)' AFTER status;
