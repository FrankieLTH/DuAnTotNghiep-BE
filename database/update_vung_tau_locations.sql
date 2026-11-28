-- Update existing local databases from the old Hanoi/demo locations.
-- Safe to run more than once; keeps apartment IDs and all booking relationships.
SET NAMES utf8mb4;

UPDATE apartment
SET
  name = CASE id
    WHEN 1 THEN 'Đồi Bông Gòn - CN1: Hải Đăng'
    WHEN 2 THEN 'Đồi Bông Gòn - CN1: Thiền Môn'
    WHEN 3 THEN 'Đồi Bông Gòn - CN2: Triền Núi'
  END,
  address = CASE id
    WHEN 1 THEN 'Đường Hải Đăng, phường Vũng Tàu, TP. Hồ Chí Minh'
    WHEN 2 THEN 'Đường Trần Phú, phường Vũng Tàu, TP. Hồ Chí Minh'
    WHEN 3 THEN 'Đường Vi Ba, phường Vũng Tàu, TP. Hồ Chí Minh'
  END,
  hotline = '0908888888'
WHERE id IN (1, 2, 3);

UPDATE room_types
SET name = REPLACE(name, '(Retreat)', '(Triền Núi)'),
    description = REPLACE(description, 'Retreat Triền Núi', 'Triền Núi')
WHERE apartment_id = 3;

UPDATE room_types
SET
  name = REPLACE(REPLACE(REPLACE(name, '(Ba)', '(Hải Đăng)'), '(Giấy)', '(Thiền Môn)'), '(Hoàn)', '(Triền Núi)'),
  description = REPLACE(REPLACE(REPLACE(REPLACE(description,
    'The Grand Ba Đình', 'Đồi Bông Gòn - CN1: Hải Đăng'),
    'Riverside Cầu Giấy', 'Đồi Bông Gòn - CN1: Thiền Môn'),
    'Old Quarter Hoàn Kiếm', 'Đồi Bông Gòn - CN2: Triền Núi'),
    'Sunshine Villa Phố Cổ', 'Đồi Bông Gòn - CN1: Hải Đăng');

UPDATE bookings
SET stay_reason = CASE
  WHEN stay_reason LIKE '%Hà Nội%' OR stay_reason LIKE '%Cầu Giấy%' THEN 'Nghỉ dưỡng tại Vũng Tàu'
  ELSE stay_reason
END
WHERE stay_reason LIKE '%Hà Nội%' OR stay_reason LIKE '%Cầu Giấy%';
