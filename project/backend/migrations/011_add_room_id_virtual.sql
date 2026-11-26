-- Thêm generated column room_id = id vào rooms (để backward compat với code dùng r.room_id)
-- MariaDB: dùng expression không dùng AUTO_INCREMENT column trực tiếp, dùng CONCAT trick
-- Thay vì generated column, dùng cách đơn giản: thêm cột regular room_id và trigger
-- Nhưng đơn giản nhất: ALTER TABLE để rooms.id có alias qua VIEW

-- Tạo VIEW để query dùng r.room_id hoạt động:
CREATE OR REPLACE VIEW rooms_view AS 
SELECT *, id AS room_id FROM rooms;

-- Với ROOMS table (case-insensitive trên Windows), cũng tạo view ROOMS:
-- (không cần vì Windows MySQL case-insensitive)
