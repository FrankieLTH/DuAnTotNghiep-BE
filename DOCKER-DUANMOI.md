# Chạy dự án mới bằng Docker

Bật Docker Desktop, rồi mở PowerShell tại thư mục gốc dự án. Lần đầu, tạo file cấu hình:

```powershell
Copy-Item .env.example .env
```

Điền `JWT_SECRET` bằng chuỗi ngẫu nhiên dài, `DUANMOI_SMTP_USER` và `DUANMOI_SMTP_PASS` bằng thông tin SMTP thật trong `.env`, rồi chạy:

```powershell
.\start-duanmoi.ps1
```

`docker-compose.yml`, `.env` và `.dockerignore` nằm tại gốc dự án. Hai Dockerfile và `backend-entrypoint.sh` nằm trong `docker/`. Build context là thư mục gốc để backend và frontend đều truy cập được `project/shared`. Docker không đọc `project/backend/.env`; file đó chỉ dùng khi chạy backend trực tiếp trên host.

Script kiểm tra Compose trước khi build. Hai image có tên tường minh `duanmoi-backend:latest`, `duanmoi-frontend:latest`, trùng với tên image dùng bởi Compose. Backend đợi MySQL và Redis healthy, khởi tạo database và chạy các migration hiện có theo thứ tự trước khi nhận request.

- Web: http://localhost:5174
- Quản trị: http://localhost:5174/admin
- API: http://localhost:3001/api
- MySQL: `127.0.0.1:3307`, database/user `duanmoi`, password `duanmoi_local`
- Redis: `127.0.0.1:6380`
- Tra cứu: http://localhost:5174/tra-cuu — nút **Tra cứu** luôn nằm ngoài menu.

Trang tra cứu hỗ trợ khách vãng lai qua email + OTP và khách có tài khoản qua email + mật khẩu. Cả hai chỉ truy cập đơn liên kết với email đã xác thực; có thể xem thanh toán, yêu cầu hủy/hoàn tiền/gia hạn/đổi phòng và xem PIN khi đủ điều kiện. Chỉ tài khoản đăng nhập được sửa hồ sơ hoặc đổi mật khẩu. Yêu cầu khách gửi được xem và phản hồi tại màn hình quản trị booking.

Sau khi xác thực email và nhấn **Tiếp tục** ở bước người đặt, checkout lưu đơn giữ chỗ `draft` trong MySQL; đơn xuất hiện ngay trong Tra cứu với nút **Hoàn tất thông tin**. Các trường chữ của người ở được lưu tự động. Khi hoàn tất bước người ở, chính đơn đó chuyển sang **chờ thanh toán** và Tra cứu có nút **Tiếp tục thanh toán**. Mở lại đơn còn hạn không tạo đơn mới hay gia hạn thời gian giữ chỗ. Với đơn hết hạn chưa có giao dịch và chưa qua giờ nhận phòng, nút **Tiếp tục hoàn tất đơn** kiểm tra lại phòng trống và giá hiện tại trước khi cấp lại 15 phút giữ chỗ cho cùng đơn; thông tin đã nhập được giữ nguyên. Nếu hết phòng hoặc đã qua giờ nhận phòng, hệ thống báo lỗi và không mở lại đơn. Ảnh giấy tờ hiện chỉ xem trước trong lần nhập; thông tin giấy tờ lưu chưa đồng nghĩa với được nhân viên xác minh.

Giá phòng được tính lại phía máy chủ; các dịch vụ/voucher trong giao diện mô phỏng chưa được áp dụng tại API lưu đơn. Không tự ghi nhận đã thanh toán hoặc cấp PIN. PIN chỉ hiển thị khi đã thanh toán đủ, giấy tờ được duyệt, mã đang hoạt động và trong thời gian lưu trú.

Email xác thực gửi qua SMTP, mặc định Gmail. Cấu hình bằng các biến `DUANMOI_SMTP_HOST`, `DUANMOI_SMTP_PORT`, `DUANMOI_SMTP_SECURE`, `DUANMOI_SMTP_USER`, `DUANMOI_SMTP_PASS` trong môi trường chạy Compose hoặc file `.env` ở thư mục gốc rồi tạo lại container backend. `JWT_SECRET`, `DUANMOI_SMTP_USER` và `DUANMOI_SMTP_PASS` là bắt buộc; không commit thông tin bí mật. Backend chạy trực tiếp dùng các biến `SMTP_*` trong `project/backend/.env`.

PayOS dùng `DUANMOI_PAYOS_CLIENT_ID`, `DUANMOI_PAYOS_API_KEY`, `DUANMOI_PAYOS_CHECKSUM_KEY`; TTLock dùng `TTLOCK_CLIENT_ID`, `TTLOCK_CLIENT_SECRET`. Tất cả đều khai báo trong `.env` ở gốc. Cấu hình `DUANMOI_FRONTEND_URL` mặc định là `http://localhost:5174`, được backend dùng cho đường dẫn quay về sau thanh toán và email.

Docker Compose dùng project `duanmoi`, network và volume riêng. Các container của dự án cũ không bị thay đổi.

Lần chạy đầu, script tạo schema từ entity hiện tại trong database trống `duanmoi` và nạp 3 chi nhánh, 12 loại phòng, 36 phòng cùng dữ liệu danh mục. Các lần chạy sau giữ nguyên dữ liệu hiện có. Không nhập SQL cũ hoặc chạy lại migration 001–006 lên schema này.

Trang đăng nhập quản trị gọi API xác thực thật. Script bootstrap đặt mật khẩu mẫu `duanmoi123` cho nhân sự trong seed; tài khoản User `admin@duanmoi.local` cũng được tạo riêng. Email nhân sự để đăng nhập quản trị xem tại `project/backend/src/migrations/seed-data.ts`.

```powershell
# Kiểm tra cấu hình
docker compose -p duanmoi config --quiet

# Xem trạng thái
docker compose -p duanmoi ps

# Xem log
docker compose -p duanmoi logs --tail 100 backend frontend

# Dừng các container, giữ dữ liệu
docker compose -p duanmoi stop

# Khởi động lại image đã build
docker compose -p duanmoi up -d --no-build
```

Đây là cấu hình phát triển trên máy local: backend chạy bằng ts-node, frontend chạy Vite dev server. PayOS cần khóa tích hợp thật để tạo thanh toán; cấu hình Docker không tự xác nhận giao dịch. Callback TTLock hiện còn thiếu bước đăng ký `WebhooksModule` trong `AppModule`.


Luồng hủy/hoàn dùng chung cho khách vãng lai đã xác thực OTP và khách có tài khoản đã xác minh email. Yêu cầu và phản hồi gắn với `BOOKINGS.checkout_data.requests`; `refunds` lưu yêu cầu hoàn với trạng thái `requested/approved/rejected/processed`. Admin duyệt hủy mới cập nhật trạng thái đơn và thu hồi PIN. Admin duyệt hoàn chỉ chuyển `refunds` sang `approved`, không tạo giao dịch tiền giả. `Audit_logs` ghi nhật ký gửi và xét duyệt. Không dùng bảng `booking_requests`; migration bảo toàn các bản ghi cũ trước khi bỏ bảng thêm, đưa tổng số bảng về 24. Cột `refunds.payment_id` cho phép NULL để hỗ trợ khoản thu lưu ở `TRANSACTION` hoặc khoản hoàn tổng hợp nhiều lần thanh toán; liên kết `booking_id` vẫn bắt buộc.
