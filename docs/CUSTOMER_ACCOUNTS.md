# Tài khoản khách hàng và tra cứu đặt phòng

Bản cập nhật dùng chung `/tra-cuu` cho khách vãng lai và khách có tài khoản. Các URL `/account` và `/booking-lookup` vẫn được nhận diện.

- Khách vãng lai: xác thực email bằng OTP rồi tra cứu các booking thuộc email đó, không cần mật khẩu.
- Tài khoản: đăng ký, xác minh mã email, đăng nhập bằng mật khẩu, quên/đổi mật khẩu và sửa hồ sơ.
- Đơn đang đặt được lưu sau bước người đặt; có thể tiếp tục khai báo khách hoặc thanh toán trên trang `/tra-cuu/don/:id` mà không tạo đơn trùng.
- Cả hai phiên đã xác thực được gửi yêu cầu hủy/hoàn; admin duyệt hoặc từ chối. Duyệt hủy mới thay đổi trạng thái đơn. Duyệt hoàn chưa đồng nghĩa đã chuyển tiền.
- Quyền truy cập booking và mã vào cửa được kiểm tra ở backend. Phiên tra cứu và phiên tài khoản được lưu riêng.

## Cấu hình và dữ liệu

Giữ file `project/backend/.env` riêng trên máy, tham khảo `.env.example`. Cần cấu hình `DB_*`, `REDIS_URL`, `JWT_SECRET` và `SMTP_HOST/PORT/SECURE/USER/PASS/FROM`. Với Gmail: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`, cùng tài khoản và mật khẩu ứng dụng của bạn. Không commit mật khẩu SMTP.

Với database hiện có, chạy tại `project/backend`:

```powershell
npm run db:customer-management
```

Migration bổ sung các cột cần thiết vào bảng hiện có. Yêu cầu và phản hồi gắn với `BOOKINGS.checkout_data.requests`; hoàn tiền dùng `refunds`, nhật ký dùng `Audit_logs`. Các bản ghi trong bảng cũ `booking_requests` được sao chép đầy đủ trước khi bỏ bảng thêm; không tạo thêm bảng yêu cầu. `refunds.payment_id` cho phép NULL với khoản thu qua sổ giao dịch `TRANSACTION`; `booking_id` vẫn bắt buộc. Không reset dữ liệu.

## Kiểm tra

```powershell
# Tại project/backend: test bằng dữ liệu giả riêng, email được chặn và thu trong bộ nhớ.
npm run test:customer

# Tại project/frontend: kiểm tra phiên đăng nhập.
npm run test:session
npm run build
```

Bộ kiểm thử tài khoản cần MySQL/Redis local đang chạy và database có schema hiện hành. Nó kiểm tra đăng ký, gửi lại mã, mã hết hạn, phân quyền, tiếp tục đơn, duyệt hủy/hoàn và không ghi giao dịch tiền giả.

`npm run test:customer:smtp` chỉ kiểm tra web/API và xác thực kết nối SMTP, không gửi thư thật. Có thể đặt `CUSTOMER_TEST_BASE_URL` nếu frontend không chạy cổng 80. SMTP xác thực thành công không bảo đảm thư đã vào Hộp thư đến.

Backend API mặc định chạy cổng 3000, Vite giữ cổng 80 của nhánh `y-sao` và proxy `/api` về backend. Có thể đặt `VITE_PROXY_TARGET` hoặc `VITE_API_URL` theo môi trường.
