# Vị trí component giao diện Tra cứu tài khoản trên nhánh lth

Giao diện này là React trong `project/frontend`, không phải file `index.html` độc lập ở gốc repository.

| Phần cần tìm | File | Vị trí chính |
|---|---|---|
| Nút Tra cứu ngoài menu | `project/frontend/src/components/home/Navbar.tsx` | Dòng 100: gọi `handleNav('my-account')` |
| Chọn và hiển thị trang tài khoản | `project/frontend/src/App.tsx` | Dòng 232–240: render `CustomerAccountPage` |
| Hai tab Vãng lai / Có tài khoản | `project/frontend/src/pages/CustomerAccountPage.tsx` | Dòng 102: `ca-access-tabs` |
| Form Email + OTP cho khách vãng lai | `project/frontend/src/pages/CustomerAccountPage.tsx` | Dòng 112 trở đi: form gửi và xác minh OTP |
| Component đăng nhập / tạo tài khoản / quên mật khẩu | `project/frontend/src/components/CustomerAccessForm.tsx` | Dòng 14: khai báo component; biến `mode` chọn form |
| Trang riêng của booking | `project/frontend/src/pages/BookingDetailPage.tsx` | Dòng 8: component trang chi tiết và tiếp tục đơn |
| Hiển thị booking, yêu cầu hủy/hoàn | `project/frontend/src/components/CustomerBookingDetail.tsx` | Dòng 9: component chi tiết |
| Giao diện admin duyệt yêu cầu | `project/frontend/src/components/admin/CustomerRequestsPanel.tsx` | Component được gọi trong màn hình Quản lý Booking |
| Màu sắc, bố cục trang tài khoản | `project/frontend/src/pages/customer-account.css` | CSS dùng chung |
| Gọi API | `project/frontend/src/services/customerService.ts` | Phân biệt token lookup/account |

Các số dòng tương ứng bản tích hợp này, có thể đổi khi sửa code về sau.

## Cách hiện giao diện

Luồng nối component:

```text
Navbar: bấm Tra cứu
  -> App: chuyển view my-account, URL /tra-cuu
  -> CustomerAccountPage: chọn tab
       -> Khách vãng lai: form email và OTP
       -> Có tài khoản: CustomerAccessForm
```

## Bạn trong nhóm cần làm sau khi pull

Tại thư mục clone repository của bạn ấy:

```powershell
git switch lth
git pull --ff-only origin lth
cd project
npm install
npm run install:all
npm run db:customer-management --prefix backend
npm run dev
```

Cần có cấu hình DB/Redis/SMTP trong `project/backend/.env` riêng trên máy trước khi chạy migration/backend. Không dùng reset database và không đưa `.env` lên GitHub.

Mở `http://localhost:5173/tra-cuu`. Nếu Vite đang dùng cổng khác, dùng địa chỉ Vite in trong terminal rồi thêm `/tra-cuu`. Dừng tiến trình frontend/backend cũ và chạy lại sau khi pull; tải lại trình duyệt bằng Ctrl + F5.

Nếu chạy Docker, phải build lại image chứa code mới; merge Git không tự cập nhật image cũ. Cấu hình Docker nhánh lth hiện chỉ chạy MySQL/Redis; web chạy theo lệnh npm ở trên.

## Phạm vi tích hợp

Giữ source tìm phòng, giỏ phòng, chi tiết phòng và các chức năng quản trị trên lth. Nối thêm giao diện và backend tài khoản từ y-sao, cùng các sửa lỗi đăng ký email đã kích hoạt và nhãn loại tài khoản trên quản trị. Chức năng thanh toán/dịch vụ mô phỏng vẫn cần đối chiếu phạm vi trong tài liệu tài khoản; không xem thao tác duyệt hoàn là đã chuyển tiền thật.

Phụ phí nệm phụ/dịch vụ/voucher hiển thị trên các màn hình mô phỏng chưa thay thế việc xác nhận giá và sức chứa từ API lưu đơn. Luồng checkout tài khoản hiện tính lại giá phòng trên server, không coi mọi phụ phí mô phỏng đã được áp dụng.
