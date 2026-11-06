# DuAnTotNghiep - Homestay Automated Booking & Self Check-in System

> Hướng dẫn chạy local hiện tại: [LOCAL_RUN.md](LOCAL_RUN.md). Backend hiện dùng MySQL; phần hướng dẫn PostgreSQL bên dưới là tài liệu cũ.

Hệ thống Đặt phòng Homestay & Tự động hoá quy trình Check-in / Check-out qua khoá thông minh TTLock, cổng thanh toán PayOS và WebSockets thời gian thực.

---

## 📁 Cấu trúc Thư mục

```text
.
├── figma/              # Thư mục lưu tài nguyên thiết kế UI/UX Figma
├── logo/               # Thư mục lưu trữ Logo & hình ảnh nhận diện thương hiệu
├── docker-compose.yml  # File chạy PostgreSQL & Redis dev local
├── project/
│   ├── backend/        # NestJS TypeScript App (API + Webhooks + TTLock Automation + PayOS)
│   └── frontend/       # React + TypeScript + Vite (Dashboard & Booking Page)
└── README.md
```

---

## 🚀 Hướng dẫn Khởi chạy Môi trường Dev

### 1. Khởi chạy Database (PostgreSQL) & Redis
Trước khi chạy Backend, hãy đảm bảo Docker đã được bật và chạy lệnh:
```bash
docker compose up -d
```
- **PostgreSQL**: `localhost:5432` (User: `postgres`, Password: `postgrespassword`, DB: `homestay_db`)
- **Redis**: `localhost:6379`

---

### 2. Cấu hình & Chạy Backend (NestJS)
```bash
cd project/backend

# Tạo file .env từ .env.example
cp .env.example .env

# Cài đặt gói phụ thuộc (nếu chưa cài)
npm install

# Khởi chạy Backend ở chế độ Dev
npm run start:dev
```
Backend sẽ khởi chạy tại: `http://localhost:3000`

---

### 3. Khởi chạy Frontend (React + Vite)
Mở một cửa sổ Terminal mới:
```bash
cd project/frontend

# Cài đặt gói phụ thuộc (nếu chưa cài)
npm install

# Khởi chạy Frontend ở chế độ Dev
npm run dev
```
Frontend sẽ khởi chạy tại: `http://localhost:5173`

---

### 🌐 Cấu hình TTLock Callback Webhook qua Ngrok (Dev Local)

Vì TTLock Management Center (và cổng thanh toán PayOS) **bắt buộc Callback/Webhook URL phải là một tên miền Public (Domain có HTTPS/HTTP công khai)** và không nhận IP nội bộ (`localhost` hoặc `127.0.0.1`), nên khi lập trình ở máy local bạn cần dùng **Ngrok**:

1. **Tải & cài đặt Ngrok** (nếu chưa có): https://ngrok.com/
2. **Khởi chạy Ngrok tunnel trỏ tới cổng Backend NestJS (3000):**
   ```bash
   ngrok http 3000
   ```
3. Ngrok sẽ trả về một đường dẫn Public dạng: `https://xxxx-xxxx.ngrok-free.app`
4. **Đăng ký Callback URL trong TTLock Management Center:**
   - URL Callback: `https://xxxx-xxxx.ngrok-free.app/webhooks/ttlock/callback`
   - Cổng HTTP Callback của TTLock sẽ gửi thông tin mở cửa dạng `application/x-www-form-urlencoded`. Backend NestJS sẽ phản hồi lại chuỗi thuần `"success"` theo đúng chuẩn yêu cầu của TTLock.

---

## 🛠️ Lệnh Kiểm tra Endpoint Webhook TTLock (Curl)
```bash
curl -X POST http://localhost:3000/webhooks/ttlock/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "notifyType=1&lockId=12345&lockMac=AA:BB:CC:DD:EE:FF&records=[{\"lockDate\":1700000000}]"
```
Phản hồi thành công kỳ vọng: `success`

