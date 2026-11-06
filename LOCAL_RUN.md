# Chạy ứng dụng local

Thiết kế tài khoản hiện hành: [CUSTOMER_ACCOUNT_V2.md](docs/CUSTOMER_ACCOUNT_V2.md). Khách có tài khoản đăng nhập email + mật khẩu tại http://localhost/account; khách vãng lai tra cứu email + OTP tại http://localhost/booking-lookup. Chạy `npm run db:customer-management --prefix project/backend` để bổ sung trường tài khoản và bảng yêu cầu, giữ nguyên booking cũ.

Tài khoản khách hàng và tra cứu booking bằng email + OTP: xem [thiết kế và use case](docs/CUSTOMER_ACCOUNT.md). Email OTP gửi qua SMTP thật; cấu hình `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` trong `project/backend/.env`. Với Gmail dùng cổng 587, secure=false và mật khẩu ứng dụng. Docker Compose chỉ chạy MySQL và Redis. Giao diện hiện dùng cổng 80 theo `vite.config.ts`: http://localhost/account và http://localhost/booking-lookup.

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

Nếu database đã có dữ liệu, bổ sung bảng yêu cầu quản lý booking (không xóa dữ liệu): `npm run db:customer-management --prefix project/backend`. Tài khoản và quản lý booking: http://localhost/account; chi tiết đối chiếu use case/ERD ở [CUSTOMER_MANAGEMENT.md](docs/CUSTOMER_MANAGEMENT.md).

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
