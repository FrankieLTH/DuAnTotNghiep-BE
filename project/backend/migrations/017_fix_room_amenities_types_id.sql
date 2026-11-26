-- 017_fix_room_amenities_types_id.sql
-- Thêm cột room_types_id vào room_amenities và liên kết tiện ích theo loại phòng

-- Cập nhật room_types_id dựa trên phòng đã có
UPDATE room_amenities ra 
JOIN rooms r ON r.id = ra.room_id 
SET ra.room_types_id = r.room_type_id 
WHERE ra.room_types_id IS NULL;

-- Cập nhật room_types_id cho parent types nếu có
UPDATE room_amenities ra
JOIN room_types rt ON rt.id = ra.room_types_id
SET ra.room_types_id = rt.parent_id
WHERE rt.parent_id IS NOT NULL AND ra.room_types_id IS NOT NULL;
