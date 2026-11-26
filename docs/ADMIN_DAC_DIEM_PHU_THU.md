# Quản lý phòng và phụ thu trong duanmoi

## Phạm vi đã thống nhất

Giao diện quản lý phòng dựa trên nhánh `ha/backend`, commit `da8c4854`, được điều chỉnh để chỉ thêm bảng `room_features`. Database hiện có **25 bảng** (24 bảng cũ + 1 bảng mới). Không chạy migration 007 của nhánh gốc vì migration đó tạo thêm các bảng ngoài phạm vi.

## Cách sử dụng

1. Mở http://localhost:5174/admin, chọn **Quản lý phòng**.
2. Bấm **Đặc điểm & Phụ thu**, nhập tên, nhóm đặc điểm và phụ thu mỗi đêm. Giá 0đ nghĩa là không thu thêm. Có thể sửa hoặc ngừng dùng đặc điểm.
3. Trong **Thêm phòng** hoặc **Chỉnh sửa phòng**, chọn chi nhánh, loại phòng, số phòng và các đặc điểm của phòng thực tế. Các đặc điểm đang được chọn có dấu tích.
4. Nhập nhóm vị trí trực tiếp, ví dụ “Phòng góc”. Nhóm vị trí dùng nội bộ và không tự cộng tiền.
5. Có thể tạo nhiều phòng, gán đặc điểm hoặc nhóm vị trí hàng loạt. Lịch ngừng bán/bảo trì được lưu theo từng phòng; hệ thống cảnh báo khi trùng booking.
6. Khách tìm phòng theo chi nhánh và ngày ở. Các phòng khác đặc điểm/phụ thu được tách thành phương án giá riêng. Giường phụ được chọn trên giỏ phòng.

## Tính giá

**Tiền mỗi phòng = (Giá loại phòng/đêm + Tổng phụ thu đặc điểm/đêm + Phí giường phụ/đêm) × Số đêm.**

Ví dụ lưu trú theo đêm thông thường:

| Khoản | Giá mỗi đêm |
|---|---:|
| Loại phòng | 700.000đ |
| View biển | 100.000đ |
| Một giường phụ | 150.000đ |
| Tổng 2 đêm | **1.900.000đ** |

Nếu giá loại phòng đã bao gồm view biển, đặt phụ thu đặc điểm đó bằng 0đ để tránh cộng hai lần. Giá loại phòng theo các chế độ lưu trú khác vẫn áp dụng quy tắc giá hiện có; phụ thu được tính theo số đêm mà hệ thống xác định.

Backend xác định phòng thực tế còn trống và tự tính tiền; không tin tổng tiền gửi từ trình duyệt. Phòng đang có booking giữ chỗ hợp lệ hoặc lịch bảo trì trùng ngày không được bán lại.

## Lưu ở đâu?

| Dữ liệu | Nơi lưu |
|---|---|
| Danh mục đặc điểm, nhóm, phụ thu mỗi đêm, trạng thái | `room_features` |
| Danh sách ID đặc điểm của từng phòng | `ROOMS.feature_ids` (JSON) |
| Nhóm vị trí nội bộ | `ROOMS.room_group_name` |
| Lịch ngừng bán/bảo trì | `ROOMS.blocked_periods` (JSON) |
| Tầng, ghi chú, tình trạng dọn phòng, xóa mềm | Các cột tương ứng trong `ROOMS` |
| Phòng thực tế đã giữ/đặt | `Booking_rooms.room_id` |
| Giá và đặc điểm tại lúc đặt | `Booking_rooms.pricing_snapshot` (JSON) |
| Tổng đơn, giảm giá và thời hạn giữ chỗ | `BOOKINGS` |
| Thanh toán và tiền thực nhận | Bảng thanh toán/giao dịch hiện có |

Không tạo `room_groups`, `room_feature_map`, `room_blocks`.

Giá chụp tại lúc đặt bao gồm giá cơ bản, đặc điểm và phụ thu, số đêm, giường phụ. Sửa giá danh mục không làm thay đổi đơn đang giữ chỗ hợp lệ hoặc đã thanh toán. Đơn đã hết hạn cần kiểm tra phòng và tính lại giá khi tiếp tục; hệ thống thông báo giá hiện tại. Đơn cũ không có bản chụp giá vẫn dùng dữ liệu giá đã lưu, không tự cộng phụ thu mới.

## Thanh toán và admin booking

Số tiền tạo link PayOS lấy từ đơn đã lưu. Callback được xác minh trước khi ghi nhận; không dựa riêng vào trang chuyển về. Nếu phòng phát sinh bảo trì sau khi tạo link mà khách đã trả tiền, hệ thống ghi nhận tiền và đánh dấu cần kiểm tra thay vì tự xác nhận một phòng không còn sử dụng được.

Chi tiết booking admin đọc giá phòng đã lưu, giường phụ, giảm giá, tiền đã nhận và số còn lại. Luồng sửa trực tiếp thông tin lưu trú của đơn có bản chụp giá được chặn để tránh tính lại bằng giá loại phòng đơn thuần.

Bồi thường hư hỏng khi trả phòng là nghiệp vụ khác với phụ thu đặc điểm mỗi đêm. Thay đổi này chưa bổ sung màn hình thu bồi thường hay tự trừ tiền khách.

## Các file chính

- `project/backend/src/migrations/room-features.cjs`: migration bổ sung, chạy lại an toàn.
- `project/backend/src/modules/admin/admin-room.service.ts`: quản lý đặc điểm, phòng, nhóm vị trí và lịch bảo trì.
- `project/backend/src/modules/rooms/room-inventory.service.ts`: kiểm tra phòng trống và chụp giá.
- `project/backend/src/modules/customer/customer-bookings.service.ts`: lưu/tiếp tục đơn theo phòng thực tế.
- `project/frontend/src/components/admin/screens/RoomsScreen.tsx`: giao diện quản lý phòng.
- `project/frontend/src/components/admin/screens/rooms/ManageGroupsFeaturesModal.tsx`: danh mục đặc điểm và phụ thu.
- `project/backend/test/room-features-integration.cjs`: kiểm thử HTTP và database; email/PayOS được giả lập.

## Kiểm tra và vận hành

Migration được chạy khi backend Docker khởi động. Không xóa volume MySQL và không reset database. Đã sao lưu source và database trước thay đổi trong thư mục `tmp/admin-one-table-backup` ở máy local; thư mục này không đưa lên Git vì có dữ liệu nội bộ.

Các đặc điểm mẫu mặc định có phụ thu 0đ. Admin cần nhập mức phí thật và gán cho đúng phòng trước khi bán. Chưa tự thay đổi giá hay đặc điểm của các phòng đang có sẵn.
