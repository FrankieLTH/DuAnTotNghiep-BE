-- Chỉ tạo view khi tên khác bảng thực tế
CREATE OR REPLACE VIEW apartment AS SELECT * FROM apartments;
