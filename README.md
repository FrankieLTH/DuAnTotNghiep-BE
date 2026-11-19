# DuAnTotNghiep - Homestay Automated Booking & Self Check-in System

Hệ thống đặt phòng Homestay và tự động hóa quy trình check-in / check-out, tích hợp khóa TTLock, thanh toán PayOS và cập nhật thời gian thực.

## Cấu trúc thư mục

```text
.
├── docker-compose.yml       # MySQL, Redis, backend, frontend cho local
├── vercel.json              # Frontend/backend Services và Schedules trên Vercel
├── .env.vercel.example      # Biến môi trường cloud; tách khỏi Docker .env
├── .dockerignore            # Lọc build context tại thư mục gốc
├── .env.example             # Mẫu biến môi trường cho Docker Compose
├── start-duanmoi.ps1        # Kiểm tra cấu hình, build và chạy trên Windows
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── backend-entrypoint.sh # Khởi tạo DB, chạy migration rồi khởi động API
├── project/
│   ├── backend/             # NestJS API; .env.example ở đây dành cho chạy trực tiếp
│   ├── frontend/            # React + TypeScript + Vite
│   └── shared/              # Kiểu dữ liệu và hàm dùng chung
├── database/                # Schema và dữ liệu danh mục hiện tại
├── db/                      # SQL cũ; không dùng để khởi tạo stack Docker này
├── docs/
├── figma/
└── logo/
```

## Deploy lên Vercel

Frontend và backend deploy cùng một Vercel Project bằng Services. Dùng MySQL/Redis bên ngoài và Vercel Schedules phù hợp gói Hobby; xem từng bước tại [VERCEL.md](VERCEL.md). Docker local vẫn chạy độc lập theo hướng dẫn dưới đây.

## Chạy bằng Docker trên Windows

Bật Docker Desktop và mở PowerShell tại thư mục gốc dự án:

```powershell
Copy-Item .env.example .env
```

Điền `JWT_SECRET` bằng chuỗi ngẫu nhiên dài, `DUANMOI_SMTP_USER` bằng tài khoản SMTP và `DUANMOI_SMTP_PASS` bằng mật khẩu ứng dụng trong `.env`, rồi chạy:

```powershell
.\start-duanmoi.ps1
```

Script kiểm tra cấu hình trước khi build. Docker Compose tự đọc `.env` ở gốc; không cần tạo `project/backend/.env` khi chạy Docker. Các khóa PayOS được cấu hình bằng `DUANMOI_PAYOS_*` trong cùng file.

| Dịch vụ | Địa chỉ trên máy local |
| --- | --- |
| Website | http://localhost:5174 |
| Quản trị | http://localhost:5174/admin |
| API | http://localhost:3001/api |
| MySQL | `127.0.0.1:3307`, database/user `duanmoi`, password `duanmoi_local` |
| Redis | `127.0.0.1:6380` |

Trong mạng Docker, backend kết nối `mysql:3306`, `redis:6379`; frontend chuyển tiếp `/api` và `/socket.io` đến `backend:3000`.

Có thể chạy thủ công từ thư mục gốc sau khi đã điền `.env`:

```powershell
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 180
docker compose logs --tail 100 backend frontend
```

Build context của cả hai image là thư mục gốc để truy cập được `project/shared`. `.dockerignore` loại bỏ dependency local, build cũ, biến môi trường và các thư mục ngoài mã ứng dụng.

Đây là stack phát triển local: backend chạy TypeScript, frontend chạy Vite dev server. Hướng dẫn vận hành và khởi tạo dữ liệu nằm trong [DOCKER-DUANMOI.md](DOCKER-DUANMOI.md).

## Chạy trực tiếp ngoài Docker

File `project/backend/.env.example` dành riêng cho backend chạy trên máy host, dùng MySQL `127.0.0.1:3307` và Redis `127.0.0.1:6380`. Các script npm điều phối frontend/backend nằm tại `project/package.json`.

Backend đã build chạy bằng `npm run start:prod`; frontend `npm run dev` dùng proxy đến API `localhost:3000`. Stack Docker dùng các đường dẫn và biến môi trường riêng được khai báo ở trên.

## Callback TTLock

Đường dẫn theo tiền tố API hiện tại là `/api/webhooks/ttlock/callback`. Khi dùng Docker, tunnel cần trỏ vào cổng host `3001`. Hiện `WebhooksModule` chưa được đăng ký trong `AppModule`; cần hoàn thiện bước này trước khi sử dụng callback.
