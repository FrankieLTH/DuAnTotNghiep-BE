-- ========================================================
-- SEED DATA CHO DỰ ÁN HOMESTAY CHECK-IN TỰ ĐỘNG (duantotnghiep)
-- ========================================================

USE `duantotnghiep`;

-- 1. BẢNG ROLES (Vai trò)
INSERT INTO `roles` (`id`, `role_name`) VALUES
(1, 'Admin'),
(2, 'Staff'),
(3, 'Customer');

-- 2. BẢNG USERS (Tài khoản người dùng)
-- Mật khẩu mặc định: $2a$12$eImiTXuWVxfM37uY4JANjO5E/805Kqf./.8. (pass: 123456)
INSERT INTO `users` (`id`, `role_id`, `full_name`, `email`, `phone`, `password_hash`, `status`) VALUES
(1, 1, 'Nguyễn Nhật Huy', 'admin@homestay.com', '0901234567', '$2a$12$eImiTXuWVxfM37uY4JANjO5E/805Kqf./.8.', 'active'),
(2, 2, 'Trần Thị Mai (Lễ tân)', 'staff.mai@homestay.com', '0912345678', '$2a$12$eImiTXuWVxfM37uY4JANjO5E/805Kqf./.8.', 'active'),
(3, 3, 'Lê Văn An', 'an.le@gmail.com', '0987654321', '$2a$12$eImiTXuWVxfM37uY4JANjO5E/805Kqf./.8.', 'active'),
(4, 3, 'Phạm Minh Tuấn', 'tuan.pham@gmail.com', '0978123456', '$2a$12$eImiTXuWVxfM37uY4JANjO5E/805Kqf./.8.', 'active'),
(5, 3, 'Hoàng Thu Thảo', 'thao.hoang@gmail.com', '0965432187', '$2a$12$eImiTXuWVxfM37uY4JANjO5E/805Kqf./.8.', 'active');

-- 3. BẢNG APARTMENTS (Tòa nhà / Chi nhánh Homestay)
INSERT INTO `apartments` (`id`, `name`, `address`, `status`) VALUES
(1, 'Đồi Bông Gòn - CN1: Hải Đăng', 'Đường Hải Đăng, phường Vũng Tàu, TP. Hồ Chí Minh', 'active'),
(2, 'Đồi Bông Gòn - CN1: Thiền Môn', 'Đường Trần Phú, phường Vũng Tàu, TP. Hồ Chí Minh', 'active'),
(3, 'Đồi Bông Gòn - CN2: Triền Núi', 'Đường Vi Ba, phường Vũng Tàu, TP. Hồ Chí Minh', 'active');

-- 4. BẢNG ROOM_TYPES (Loại phòng)
INSERT INTO `room_types` (`id`, `name`, `base_price`, `max_occupancy`) VALUES
(1, 'Studio Cozy Standard', 550000.00, 2),
(2, 'Deluxe Ocean View', 850000.00, 2),
(3, 'Family Suite Balcony', 1400000.00, 4),
(4, 'Penthouse Luxury Garden', 2200000.00, 6);

-- 5. BẢNG ROOMS (Phòng)
INSERT INTO `rooms` (`id`, `apartment_id`, `room_type_id`, `room_number`, `status`, `last_maintenance_date`) VALUES
(1, 1, 1, 'P101', 'available', '2026-09-01'),
(2, 1, 1, 'P102', 'occupied', '2026-09-02'),
(3, 1, 3, 'P201', 'available', '2026-08-25'),
(4, 2, 2, 'P301', 'available', '2026-09-05'),
(5, 2, 2, 'P302', 'maintenance', '2026-09-10'),
(6, 2, 4, 'P401', 'available', '2026-09-08'),
(7, 3, 1, 'P501', 'available', '2026-08-30'),
(8, 3, 3, 'P502', 'available', '2026-09-03');

-- 6. BẢNG AMENITIES (Tiện ích)
INSERT INTO `amenities` (`id`, `name`, `category`) VALUES
(1, 'Wi-Fi 5G tốc độ cao', 'Công nghệ'),
(2, 'Điều hòa 2 chiều', 'Thiết bị'),
(3, 'Smart Lock tự động (TTLock)', 'An ninh'),
(4, 'Smart TV 55 inch 4K', 'Giải trí'),
(5, 'Tủ lạnh Mini & Nước miễn phí', 'Ẩm thực'),
(6, 'Bếp điện & Dụng cụ nấu ăn', 'Nội thất'),
(7, 'Bồn tắm ngâm thư giãn', 'Phòng tắm'),
(8, 'Ban công ngắm thành phố', 'Tầm nhìn'),
(9, 'Máy sấy tóc & Bàn ủi', 'Cá nhân'),
(10, 'Máy pha Cà phê Espresso', 'Ẩm thực');

-- 7. BẢNG ROOM_AMENITIES (Gán tiện ích cho phòng)
INSERT INTO `room_amenities` (`room_id`, `amenity_id`) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 9),
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6),
(3, 1), (3, 2), (3, 3), (3, 4), (3, 6), (3, 7), (3, 8),
(4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 8), (4, 10),
(6, 1), (6, 2), (6, 3), (6, 4), (6, 6), (6, 7), (6, 8), (6, 10);

-- 8. BẢNG ROOM_IMAGES (Hình ảnh phòng)
INSERT INTO `room_images` (`room_id`, `image_url`) VALUES
(1, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'),
(1, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'),
(2, 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80'),
(3, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80'),
(4, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80'),
(6, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80');

-- 9. BẢNG SERVICES (Dịch vụ gia tăng)
INSERT INTO `services` (`id`, `name`, `description`, `price`, `is_compensation`, `is_active`) VALUES
(1, 'Thuê xe máy tay ga (1 ngày)', 'Xe Honda Vision/AirBlade đầy bình xăng', 150000.00, 0, 1),
(2, 'Đưa đón sân bay (4 chỗ)', 'Hỗ trợ đưa đón sân bay và di chuyển tại Vũng Tàu theo yêu cầu', 300000.00, 0, 1),
(3, 'Set tiệc nướng BBQ ngoài trời', 'Bao gồm bếp nướng, than & dụng cụ ướp thịt', 450000.00, 0, 1),
(4, 'Dịch vụ giặt ủi sấy lấy ngay', 'Giặt sạch sấy khô thơm tho trong 4 tiếng', 60000.00, 0, 1),
(5, 'Đền bù: Làm hỏng/mất khăn tắm', 'Phí đền bù đồ dùng bị hỏng/mất', 100000.00, 1, 1);

-- 10. BẢNG LOCKS (Danh sách Khóa thông minh)
INSERT INTO `locks` (`id`, `room_id`, `cloud_lock_id`, `lock_name`, `lock_type`, `lock_status`, `master_pin`, `last_sync_at`) VALUES
(1, 1, 'LOCK_TTL_101', 'Smart Lock P101', 'ttlock', 'online', '999888', NOW()),
(2, 2, 'LOCK_TTL_102', 'Smart Lock P102', 'ttlock', 'online', '999888', NOW()),
(3, 3, 'LOCK_TTL_201', 'Smart Lock P201', 'ttlock', 'online', '999888', NOW()),
(4, 4, 'LOCK_TTL_301', 'Smart Lock P301', 'ttlock', 'online', '999888', NOW()),
(5, 5, 'LOCK_TTL_302', 'Smart Lock P302', 'ttlock', 'offline', '999888', NOW()),
(6, 6, 'LOCK_TTL_401', 'Smart Lock P401', 'ttlock', 'online', '999888', NOW()),
(7, 7, 'LOCK_TTL_501', 'Smart Lock P501', 'ttlock', 'online', '999888', NOW()),
(8, 8, 'LOCK_TTL_502', 'Smart Lock P502', 'ttlock', 'online', '999888', NOW());

-- 11. BẢNG PAYMENT_METHODS (Phương thức thanh toán)
INSERT INTO `payment_methods` (`id`, `method_name`, `provider_code`, `is_active`) VALUES
(1, 'Thanh toán trực tuyến VNPAY', 'vnpay', 1),
(2, 'Ví điện tử MoMo', 'momo', 1),
(3, 'Chuyển khoản VietQR', 'vietqr', 1),
(4, 'Tiền mặt tại lễ tân', 'cash', 1);

-- 12. BẢNG VOUCHERS (Mã giảm giá)
INSERT INTO `vouchers` (`id`, `code`, `title`, `discount_type`, `discount_value`, `max_discount_amount`, `min_order_value`, `usage_limit`, `used_count`, `start_date`, `end_date`, `is_active`) VALUES
(1, 'WELCOME2026', 'Giảm 10% cho khách hàng mới', 'percentage', 10.00, 100000.00, 500000.00, 100, 2, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 1),
(2, 'SUMMERVIP', 'Giảm ngay 200K đơn từ 1.5 triệu', 'fixed_amount', 200000.00, 200000.00, 1500000.00, 50, 1, '2026-06-01 00:00:00', '2026-09-30 23:59:59', 1);

-- 13. BẢNG BOOKINGS (Đơn đặt phòng mẫu)
INSERT INTO `bookings` (`id`, `booking_code`, `user_id`, `room_id`, `voucher_id`, `guests_list`, `booking_type`, `booked_start_time`, `booked_end_time`, `check_in_actual`, `booking_status`, `total_price`, `discount_amount`) VALUES
-- 1. Đơn đang ở (checked_in) - Phòng 102
(1, 'BK2026091201', 3, 2, 1, '[{"name":"Lê Văn An","phone":"0987654321","cccd":"001200012345"}]', 'short_stay', '2026-09-12 14:00:00', '2026-09-14 12:00:00', '2026-09-12 14:15:00', 'checked_in', 1000000.00, 100000.00),

-- 2. Đơn sắp đến (confirmed) - Phòng 301
(2, 'BK2026091502', 4, 4, NULL, '[{"name":"Phạm Minh Tuấn","phone":"0978123456","cccd":"036095009876"}]', 'short_stay', '2026-09-15 14:00:00', '2026-09-17 12:00:00', NULL, 'confirmed', 1700000.00, 0.00),

-- 3. Đơn đã hoàn thành (checked_out) - Phòng 101
(3, 'BK2026090103', 5, 1, NULL, '[{"name":"Hoàng Thu Thảo","phone":"0965432187","cccd":"012345678901"}]', 'short_stay', '2026-09-08 14:00:00', '2026-09-10 12:00:00', '2026-09-08 14:05:00', 'checked_out', 1100000.00, 0.00);

-- 14. BẢNG LOCK_PIN (Mã PIN khóa cửa cho các Booking)
INSERT INTO `lock_pin` (`id`, `booking_id`, `lock_id`, `cloud_pw_id`, `pin`, `lock_pin_start_time`, `lock_pin_end_time`, `status`) VALUES
-- Mã PIN đang dùng cho đơn 1 (Phòng 102)
(1, 1, 2, 'PW_CLOUD_8812', '852963', '2026-09-12 14:00:00', '2026-09-14 12:00:00', 'active'),
-- Mã PIN đã tạo cho đơn 2 sắp tới (Phòng 301)
(2, 2, 4, 'PW_CLOUD_8813', '741258', '2026-09-15 14:00:00', '2026-09-17 12:00:00', 'active');

-- 15. BẢNG PAYMENTS (Lịch sử thanh toán)
INSERT INTO `payments` (`id`, `booking_id`, `payment_method_id`, `transaction_id`, `amount`, `payment_status`, `paid_at`) VALUES
(1, 1, 1, 'VNP14592031', 1000000.00, 'paid', '2026-09-11 10:30:00'),
(2, 2, 2, 'MOMO9921045', 1700000.00, 'paid', '2026-09-12 08:15:00'),
(3, 3, 3, 'FT260908123', 1100000.00, 'paid', '2026-09-07 19:20:00');
