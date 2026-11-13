# Chạy ứng dụng local

Tài khoản và tra cứu dùng chung trang **http://localhost/tra-cuu**: khách vãng lai xác thực email + OTP; khách có tài khoản dùng email + mật khẩu sau khi xác minh đăng ký. Các đường dẫn `/account` và `/booking-lookup` cũ vẫn truy cập được. Hướng dẫn bản hiện tại: [CUSTOMER_ACCOUNTS.md](docs/CUSTOMER_ACCOUNTS.md).

SMTP gửi email thật được cấu hình trong `project/backend/.env`. Với Gmail dùng cổng 587, `SMTP_SECURE=false` và mật khẩu ứng dụng. Không đưa file `.env` hoặc thông tin SMTP lên GitHub. Docker Compose của nhánh chỉ chạy MySQL và Redis.

Backend hiện dùng MySQL 8, frontend dùng Vite. Cài Node.js và các dependencies:

```powershell
cd project
npm install
npm run install:all
```

## Database

Nếu Docker Desktop chạy được, tại thư mục gốc chạy:

```powershell
docker compose up -d --wait
```

MySQL: `127.0.0.1:3306`, database `duantotnghiep`, user `root`, mật khẩu local mặc định `homestay_local_password`. Có thể đổi mật khẩu container bằng biến `MYSQL_ROOT_PASSWORD`; đồng thời cập nhật `DB_PASSWORD` của backend. Redis: `127.0.0.1:6379`.

Nếu dùng MySQL có sẵn (ví dụ Laragon), khởi động MySQL đó và dùng thông tin kết nối tương ứng. Không chạy đồng thời hai MySQL trên cổng 3306.

Tạo `project/backend/.env` từ `.env.example` nếu chưa có, rồi chỉnh các biến `DB_*`. Không ghi đè `.env` đang dùng.

Nếu database đã có dữ liệu, chạy `npm run db:customer-management --prefix project/backend` để bổ sung các trường tài khoản/checkout cần thiết. Migration giữ dữ liệu cũ và chuyển các yêu cầu từ bảng thêm `booking_requests` về booking trước khi bỏ bảng đó. Không chạy lệnh reset database.

Với database local mới:

```powershell
cd project/backend
npm run db:init:local
```

Lệnh này tạo schema và dữ liệu mẫu gồm 3 chi nhánh, 12 loại phòng, 36 phòng, khách hàng và khóa. Nếu đã có dữ liệu, lệnh giữ nguyên database. Lệnh chỉ dành cho local; backend vẫn đặt `synchronize: false`. Các lệnh `db:migrate` và `db:seed` cũ chỉ đọc SQL/sinh dữ liệu trong bộ nhớ, chưa thực thi SQL vào database.

## Backend và frontend

Tại thư mục `project`:

```powershell
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Kiểm tra database/API: http://localhost:3000/api/rooms

Frontend mặc định gọi `http://localhost:3000/api`; có thể ghi đè bằng `VITE_API_URL`.

Backend production build local:

```powershell
cd project/backend
npm run build
npm run start:prod
```

## Docker báo không có ảo hóa

Docker Desktop đã chạy được và MySQL/Redis đã được kiểm tra ngày 06/11/2026. Nếu sau này gặp `HCS_E_HYPERV_NOT_INSTALLED`, kiểm tra ảo hóa trong BIOS/UEFI và Virtual Machine Platform trong Windows, rồi khởi động lại máy. Có thể dùng MySQL Laragon thay thế khi Docker chưa hoạt động.

Trang quản trị local: http://localhost:5173/admin. Màn hình đăng nhập hiện dùng tài khoản demo ở frontend: `admin@homestay.com` / `admin123`; đây chưa phải xác thực quản trị qua backend.

Các tiến trình được khởi động trong phiên hỗ trợ ghi log vào `.runtime/` ở thư mục gốc. TTLock, PayOS và gửi email thật cần cấu hình riêng; dữ liệu mẫu không thay thế các tài khoản dịch vụ này.
