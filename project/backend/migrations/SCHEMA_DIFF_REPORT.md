# BÁO CÁO KHÁC BIỆT SCHEMA VÀ CHIẾN LƯỢC ĐỒNG BỘ DỮ LIỆU
**Dự án:** Hệ thống Đặt Homestay Tự Động (Client + Admin)  
**Ngày lập:** 05/11/2026  
**Chuẩn tham chiếu:** ERD Kiến trúc Thống nhất (Single Source of Truth)

---

## 1. TỔNG QUAN SO SÁNH
Hệ thống trước đây có sự phân mảnh giữa dump ban đầu (`db/datn1.sql`), các migration rời rạc (`001_schema_changes.sql`, `002_backfill_data.sql`), và các entity TypeORM:
- **Tên bảng:** Phía SQL cũ dùng chữ thường số nhiều (`bookings`, `apartments`, `rooms`, `users`), trong khi TypeORM và ERD mới dùng chuẩn thực thể nhất quán (`BOOKINGS`, `APARTMENT`, `ROOMS`, `room_types`, `CUSTOMER`, `STAFF`, `lock`, `lock_pin`, `Booking_rooms`, `booking_guests`, `TRANSACTION`, `Audit_logs`).
- **Nguồn sự thật:** Database MySQL là nguồn sự thật duy nhất; cả Client và Admin đều dùng chung 1 database và chung 1 module chia sẻ định nghĩa `@shared`.

---

## 2. BẢNG CHI TIẾT KHÁC BIỆT VÀ KHẮC PHỤC

| Bảng | Cột / Thuộc tính cũ | Cột / Thuộc tính mới chuẩn ERD | Trạng thái & Giải pháp |
| :--- | :--- | :--- | :--- |
| **BOOKINGS** | `booking_status`: pending, confirmed, checked_in, checked_out, cancelled, no_show | ENUM('draft', 'pending_payment', 'confirmed', 'checked_in', 'checked_out', 'expired', 'cancelled') | **Cập nhật:** Thêm trạng thái `draft`, `pending_payment`, `expired`. Chuyển đổi dữ liệu cũ khớp enum mới. |
| **BOOKINGS** | `booking_type`: short_stay, long_stay, monthly | ENUM('overnight', 'daily') | **Cập nhật:** Chuẩn hóa chỉ hỗ trợ theo đêm (overnight) và theo ngày (daily). |
| **BOOKINGS** | Thiếu phân loại khách, kiểm duyệt & nguồn đơn | Thêm: `adults`, `children`, `is_booked_for_other`, `lock_email`, `verification_status`, `reviewed_by`, `reviewed_at`, `consent_at`, `stay_reason`, `source`, `created_by`, `note`, `cancel_reason`, `cancelled_at`, `cancelled_by`, `hold_expires_at` | **Thêm mới:** Hỗ trợ quy trình đặt online (draft/pending) và tạo đơn thủ công tại quầy (`source='admin'`). |
| **BOOKINGS** | Thiếu index tối ưu tìm kiếm theo thời gian & hold | Thêm index: `(apartment_id, booking_status, booked_start_time)` và `(customer_id, hold_expires_at)` | **Tạo Index:** Tăng tốc độ truy vấn kiểm tra phòng trống và quét cron hủy đơn hết hạn. |
| **booking_guests** | Lưu chuỗi `guests_list` hoặc bảng `cccd_img` thô | Bảng `booking_guests`: `guest_type`, `is_staying`, `doc_type`, `doc_number`, `gender`, `doc_image_front`, `doc_image_back`, `ocr_confidence`, `ocr_raw`, `status`, `doc_deleted_at` | **Tạo bảng:** Quản lý từng slot khách theo quy chuẩn. Trẻ em < 10 tuổi không bắt buộc CCCD; xóa ảnh CCCD sau check-out. |
| **room_types** | Dùng chung tự do, thiếu mô tả chi tiết | Thêm `apartment_id` (FK APARTMENT), `description`, `bed_config`, `area`, `is_active` | **Đã migrate (001, 002):** Độc lập theo từng chi nhánh; các chi nhánh không dùng chung 1 record. |
| **ROOMS** | Chứa cột khóa: `lock_id`, `lock_name`, `lock_status`, `battery_level`, `master_pin` | Chuyển toàn bộ sang bảng `lock`. ROOMS chỉ quản lý phòng vật lý (`apartment_id`, `room_type_id`, `room_number`, `status`, `is_hidden`). | **Tách bảng:** ROOMS có quan hệ 1-1 với `lock` qua `lock.room_id` (NULLable, UNIQUE qua active_room_id). |
| **APARTMENT** | `status`: active, inactive, under_construction | `status`: ENUM('active', 'hidden'), thêm `hotline`, `created_at`, `updated_at` | **Chuẩn hóa:** Chỉ 2 trạng thái hoạt động hoặc ẩn. |
| **CUSTOMER** | Gộp chung `users`, có `password_hash` | Tách riêng `CUSTOMER`: email UNIQUE, không lưu mật khẩu (xác thực OTP không lưu DB). | **Bảo mật:** Loại bỏ nguy cơ lộ mật khẩu khách hàng. |
| **STAFF** | Nằm lẫn trong `users` | Tách riêng `STAFF` kết nối `ROLES` và `apartment_id` (NULL nếu Admin, có ID nếu Manager). | **Phân quyền:** Quản lý truy cập chặt chẽ theo chi nhánh. |
| **TRANSACTION** | Bảng `payments` và `refunds` riêng lẻ | Bảng `TRANSACTION` gom chung: type ('payment' \| 'refund'), `amount`, `payment_method`, `created_by` | **Thống nhất:** Dễ dàng kiểm toán dòng tiền và hoàn tiền khi hủy đơn đã xác nhận. |
| **AI_CHAT_LOGS** | `user_id` | Đổi thành `customer_id` (NULLable) | **Cập nhật:** Đồng bộ danh tính khách hàng AI tư vấn. |
| **Audit_logs** | Cột actor_user_id không rõ ràng | `id`, `actor`, `action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `created_at` | **Chuẩn hóa:** Ghi lại mọi biến động trạng thái booking, cấp pin, xem ảnh CCCD. |

---

## 3. THỐNG KÊ ẢNH HƯỞNG BACKFILL
- **BOOKINGS.apartment_id**: 100% bản ghi được cập nhật dựa trên `Booking_rooms` -> `ROOMS.apartment_id`.
- **room_types**: Tách các loại phòng dùng chung sang các bản ghi độc lập gắn liền với từng chi nhánh cụ thể.
- **ROOMS - lock**: Dữ liệu khóa cũ được sao chép sang bảng `lock` an toàn trước khi xóa bỏ cột thừa tại `ROOMS`.

---

## 4. KẾ HOẠCH MIGRATION AN TOÀN
- File UP: `003_unified_booking_schema.sql` (bổ sung toàn bộ cột, bảng, index còn thiếu theo chuẩn idempotent `ADD COLUMN IF NOT EXISTS`).
- File DOWN: `003_unified_booking_schema_down.sql` (rollback an toàn, bảo toàn dữ liệu gốc).
