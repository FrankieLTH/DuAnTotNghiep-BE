-- Migration 016: Thêm parent_id cho room_types và room_types_id cho room_images
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS parent_id INT NULL AFTER apartment_id;
ALTER TABLE room_types ADD INDEX IF NOT EXISTS idx_room_types_parent (parent_id);

ALTER TABLE room_images ADD COLUMN IF NOT EXISTS room_types_id INT NULL AFTER room_id;
ALTER TABLE room_images ADD INDEX IF NOT EXISTS idx_room_images_type (room_types_id);

-- Backfill room_types_id cho room_images nếu có
UPDATE room_images ri
JOIN rooms r ON r.id = ri.room_id
SET ri.room_types_id = r.room_type_id
WHERE ri.room_types_id IS NULL;
