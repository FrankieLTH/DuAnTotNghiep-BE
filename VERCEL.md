# Deploy frontend và backend lên Vercel

Repo dùng một Vercel Project với hai **Services** trên cùng domain:

| Đường dẫn | Service |
| --- | --- |
| `/api`, `/api/*` | NestJS backend |
| `/socket.io`, `/socket.io/*` | Socket.IO backend |
| Các đường dẫn còn lại | Frontend Vite, có SPA fallback về `index.html` |

`vercel.json` ở gốc repo là cấu hình Vercel. Docker local tiếp tục dùng `docker-compose.yml`, `.env.example`, `docker/` và `start-duanmoi.ps1`.

## 1. Chuẩn bị MySQL và Redis bên ngoài

Vercel không chạy các container MySQL/Redis trong Compose. Cần MySQL 8 và Redis truy cập được từ Vercel, đặt gần region chạy Function.

**MySQL hiện yêu cầu `lower_case_table_names=1`** vì entity và raw SQL trong ứng dụng dùng lẫn tên bảng hoa/thường, trong khi bản export có tên bảng thường. Kiểm tra trên server đích:

```sql
SELECT @@lower_case_table_names;
```

Nếu nhà cung cấp cố định giá trị `0`, cần chuẩn hóa toàn bộ tên bảng/query trước khi dùng nhà cung cấp đó. `DB_SSL=true` bật TLS với kiểm tra chứng chỉ; có thể cung cấp chứng chỉ CA của nhà cung cấp trong `DB_SSL_CA`. Không tắt kiểm tra chứng chỉ để vượt qua lỗi kết nối.

Redis phải cung cấp URL TCP `redis://` hoặc TLS `rediss://`, hỗ trợ list, transaction, Lua và Pub/Sub. URL REST dạng `https://...` không dùng được với ioredis. Dùng database và thông tin xác thực riêng cho Production/Preview; OTP và phiên đăng nhập cũng lưu trong Redis.

API và lệnh migration đặt MySQL session ở `+07:00`, đồng bộ với cách chuyển đổi DATETIME của driver và `NOW()` trong các query hiện tại, kể cả khi server cloud mặc định UTC.

## 2. Chuẩn bị schema và dữ liệu

Với **database mới và trống**, import lần lượt:

1. `database/duanmoi_schema.sql`
2. `database/duanmoi_reference_seed.sql`

File schema có lệnh `DROP TABLE`; chỉ restore vào database mới. Bản seed chỉ chứa danh mục, không chứa tài khoản nhân viên, dữ liệu khách, booking hay thanh toán. Có thể thay bằng bản chuyển dữ liệu riêng phù hợp từ hệ thống của bạn.

Để chạy các migration hiện có một cách chủ động trước khi deploy:

```powershell
# Tại gốc repo. Điền DB_* thật vào file riêng này; file đã được gitignore.
Copy-Item .env.vercel.example .env.vercel
cd project/backend
npm ci
npm run db:deploy -- ../../.env.vercel
```

Lệnh kiểm tra server/schema rồi chạy các migration đang dùng bởi Docker, theo cùng thứ tự. Nó không tạo database, không tự đồng bộ entity, không nạp tài khoản mẫu và không chạy các SQL 001–006 cũ. Nếu migration lỗi, xử lý lỗi trước khi deploy. Build Vercel và cold start của API không chạy migration.

Nếu database chưa có admin, thêm `ADMIN_EMAIL`, `ADMIN_PASSWORD` (ít nhất 12 ký tự) và tùy chọn `ADMIN_NAME` vào file `.env.vercel` riêng, rồi chạy:

```powershell
npm run db:create-admin -- ../../.env.vercel
```

Lệnh tạo nhân viên admin với mật khẩu băm bcrypt, từ chối ghi đè tài khoản đã tồn tại. Không đưa các biến `ADMIN_*` lên Vercel; chúng chỉ phục vụ lệnh tạo admin một lần.

## 3. Tạo Vercel Project

1. Import Git repository, giữ **Root Directory là gốc repo** (`.`).
2. Dùng framework **Services**, theo `vercel.json`; không chọn riêng `project/frontend` làm Root Directory của Project này.
3. Dùng Node.js **22.x** và Fluid Compute. Backend/frontend đều khai báo Node 22 trong `package.json`.
   Backend build bằng Nest CLI, sau đó Vercel đóng gói entrypoint JavaScript `dist/backend/src/main.js` từ output directory `dist/backend`, kèm các module `dist/shared` được import. Frontend xuất bản `dist` của riêng service frontend.
4. Giữ quyền truy cập file bên ngoài service root nếu Dashboard hiển thị tùy chọn đó: cả hai service dùng `project/shared`.
5. Giữ các system environment variables của Vercel được cung cấp cho ứng dụng, đặc biệt `VERCEL=1` và `VERCEL_ENV`.
6. Khai báo các biến ở bước tiếp theo, rồi deploy.

Services, Schedules và WebSocket/Socket.IO trên Fluid Compute hiện thuộc các tính năng beta của Vercel; dùng phiên bản Vercel CLI hiện hành nếu deploy bằng CLI.

## 4. Environment Variables

Dùng `.env.vercel.example` làm danh sách tham chiếu để nhập trong **Project Settings → Environment Variables**. Không upload `.env` local và không đưa secret vào `vercel.json`.

| Biến | Giá trị |
| --- | --- |
| `NODE_ENV` | `production` |
| `TZ` | `Asia/Ho_Chi_Minh` |
| `VITE_API_URL` | `/api`, công khai và dùng tại thời điểm build frontend |
| `FRONTEND_URL` | URL HTTPS chính thức của website, ví dụ `https://ten-du-an.vercel.app` |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | MySQL bên ngoài |
| `DB_SSL`, `DB_SSL_CA` | TLS theo nhà cung cấp; `DB_SSL_CA` tùy chọn, chấp nhận PEM với `\n` |
| `DB_POOL_SIZE` | `5` kết nối mỗi instance; điều chỉnh theo giới hạn MySQL |
| `REDIS_URL` | URL TCP/TLS của Redis bên ngoài |
| `JWT_SECRET` | Chuỗi ngẫu nhiên dài, giữ ổn định giữa các deploy |
| `CRON_SECRET` | Chuỗi ngẫu nhiên riêng, ít nhất 16 ký tự; bảo vệ endpoint Schedules |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | SMTP thật cho gửi OTP/biên nhận |
| `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | Khóa PayOS nếu dùng thanh toán |
| `TTLOCK_CLIENT_ID`, `TTLOCK_CLIENT_SECRET` | Khóa TTLock nếu dùng tích hợp |

Vercel dùng trực tiếp tên biến `SMTP_*`, `PAYOS_*`, `FRONTEND_URL`. Các tên `DUANMOI_*` dành cho Compose local, không được tự chuyển đổi trên Vercel. Không đặt secret vào biến bắt đầu bằng `VITE_`.

`REDIS_KEY_PREFIX` tùy chọn, mặc định `duanmoi:production` hoặc `duanmoi:preview` dựa trên `VERCEL_ENV`. Không dùng chung database vận hành giữa Preview và Production.

Sau khi đổi biến môi trường, redeploy để frontend được build lại và backend dùng giá trị mới. Nếu bật Deployment Protection, cấu hình Scheduled Runs của Vercel để truy cập được các path target theo hướng dẫn của Vercel.

## 5. Tác vụ định kỳ trên Hobby

Backend tắt Nest `@Cron`/`@Interval` khi `VERCEL=1`. Vercel Schedules gọi các route `POST` được bảo vệ bằng `Authorization: Bearer <CRON_SECRET>`:

| Schedule | Lịch tại Việt Nam | Route |
| --- | --- | --- |
| `booking-maintenance` | Mỗi 15 phút | `/api/internal/jobs/maintenance` |
| `photo-cleanup` | Mỗi giờ | `/api/internal/jobs/photo-cleanup` |
| `data-anonymization` | 02:00 mỗi ngày | `/api/internal/jobs/anonymization` |

Maintenance đồng bộ thanh toán PayOS, hết hạn giữ phòng rồi xử lý checkout. Khóa Redis ngăn hai instance chạy đồng thời cùng tác vụ. Đây không phải bảo đảm thực thi đúng một lần; các tác vụ phải tiếp tục chịu được retry.

Hobby có jitter 15 phút nên thời điểm chạy thực tế có thể trễ. Quét hết hạn giữ phòng, checkout và đồng bộ PayOS sẽ thưa hơn Docker; giới hạn thời gian lưu trú/giữ chỗ trong request vẫn do API kiểm tra. Lịch này khoảng 3.600–3.800 lần chạy/tháng, nằm trong 5.000 runs/tháng bao gồm của Hobby, chưa tính lịch khác hoặc chạy thủ công. Dùng **Schedules**, không chuyển thành `crons` cũ: Cron Jobs cũ trên Hobby chỉ cho lịch hằng ngày.

Docker không đặt `VERCEL=1` nên vẫn dùng các Nest timer hiện có. Các endpoint nội bộ bị từ chối nếu không có `CRON_SECRET` hợp lệ.

## 6. Realtime và webhook

Lịch sử sự kiện polling/SSE được chia sẻ trong Redis, giữ tối đa 200 sự kiện và hết hạn sau một giờ. Các request ghi sự kiện chờ lưu Redis trước khi hoàn tất; lỗi lưu sự kiện được log, không biến một thay đổi booking đã commit thành lỗi rollback. Client có thể tải lại dữ liệu khi bỏ lỡ thông báo.

Socket.IO dùng Redis adapter để phát cảnh báo qua các instance. Trên Vercel chỉ bật transport WebSocket để tránh phụ thuộc sticky session của HTTP polling. Client Socket.IO cần `transports: ['websocket']` và tự reconnect khi Function hết thời lượng hoặc được thay thế. Giao diện hiện dùng polling có xác thực để đồng bộ dữ liệu.

Đăng ký webhook PayOS tại `https://<domain>/api/webhooks/payos`. Với TTLock, đường dẫn dự kiến là `/api/webhooks/ttlock/callback`, nhưng module callback hiện chưa được đăng ký và logic xử lý còn TODO; không coi đây là tích hợp khóa đã hoàn thiện.

## 7. Kiểm tra sau deploy

- Mở `/`, `/admin`, `/tra-cuu` trực tiếp và refresh trang.
- Gọi `GET /api/apartments`, kiểm tra API trả JSON.
- Kiểm tra OTP qua SMTP thật và đăng nhập nhân viên.
- Gọi endpoint jobs không có token phải trả `401`; xem lịch sử Schedules để xác nhận các lần chạy được xác thực.
- Kiểm tra webhook PayOS bằng môi trường tích hợp phù hợp.
- Kiểm tra Runtime Logs, kết nối MySQL/Redis và giới hạn kết nối khi có nhiều instance.

Bộ kiểm tra triển khai chạy trên Redis local, dùng namespace ngẫu nhiên và không gọi SMTP/PayOS thật:

```powershell
# Tại project/backend, khi Redis local đã chạy ở cổng 6380
$env:TEST_REDIS_URL = 'redis://127.0.0.1:6380'
npm run test:deployment
```

Bộ kiểm tra xác nhận tắt timer trên Vercel, xác thực Scheduled Jobs, khóa phân tán, lọc chi nhánh, polling/SSE qua nhiều instance và Socket.IO Redis adapter.

## Tài liệu nền tảng

- [Services và routing](https://vercel.com/docs/services/routing)
- [NestJS trên Vercel](https://vercel.com/docs/frameworks/backend/nestjs)
- [Cấu hình Schedules](https://vercel.com/docs/schedules/configuration)
- [Bảo vệ Scheduled Runs bằng CRON_SECRET](https://vercel.com/docs/schedules/handle-runs)
- [Giới hạn Schedules](https://vercel.com/docs/schedules/limits)
- [WebSocket trên Vercel](https://vercel.com/changelog/websocket-support-is-now-in-public-beta)
