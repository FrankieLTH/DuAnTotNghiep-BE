import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { getRoomById, getServices, getVouchers, RoomItem, ServiceItem, VoucherItem } from '../services/dataService';

interface RoomDetailPageProps {
  roomId?: number;
  onGoBack: () => void;
  onProceedToCheckout: (bookingDetails: any) => void;
}

export const RoomDetailPage: React.FC<RoomDetailPageProps> = ({
  roomId = 1,
  onGoBack,
  onProceedToCheckout,
}) => {
  const [room, setRoom] = useState<RoomItem | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Gallery active photo
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  // Booking parameters
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

  const [checkInDate, setCheckInDate] = useState(formatDateStr(today));
  const [checkOutDate, setCheckOutDate] = useState(formatDateStr(tomorrow));
  const [guestCount, setGuestCount] = useState<number>(2);

  // Selected add-on services: Map of serviceId -> boolean
  const [selectedServiceIds, setSelectedServiceIds] = useState<Record<number, boolean>>({
    1: false, // Thuê xe máy
    3: true,  // Set BBQ
  });

  // Voucher state
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string>('WELCOME2026');
  const [voucherInput, setVoucherInput] = useState<string>('WELCOME2026');
  const [voucherMsg, setVoucherMsg] = useState<{ text: string; isError: boolean } | null>({
    text: 'Đã áp dụng mã WELCOME2026 (-10%)',
    isError: false,
  });

  useEffect(() => {
    async function loadRoom() {
      try {
        setLoading(true);
        const [rData, sData, vData] = await Promise.all([
          getRoomById(roomId),
          getServices(),
          getVouchers(),
        ]);
        setRoom(rData);
        setServices(sData);
        setVouchers(vData);
        setActivePhotoIdx(0);
        setGuestCount(Math.min(2, rData.max_occupancy));
      } catch (err) {
        console.error('Error fetching room detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRoom();
  }, [roomId]);

  // Calculate nights
  const dIn = new Date(checkInDate);
  const dOut = new Date(checkOutDate);
  const diffTime = dOut.getTime() - dIn.getTime();
  const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1);

  const basePricePerNight = room ? room.base_price : 0;
  const roomPriceTotal = basePricePerNight * nights;

  // Add-on services total
  const servicesTotal = services
    .filter((s) => selectedServiceIds[s.id])
    .reduce((sum, s) => sum + Number(s.price), 0);

  // Voucher calculation
  let discountAmount = 0;
  const rawSubtotal = roomPriceTotal + servicesTotal;

  if (appliedVoucherCode) {
    const vMatch = vouchers.find(
      (v) => v.code.toUpperCase() === appliedVoucherCode.toUpperCase()
    );
    if (vMatch) {
      if (rawSubtotal >= vMatch.min_order_value) {
        if (vMatch.discount_type === 'percentage') {
          discountAmount = (rawSubtotal * vMatch.discount_value) / 100;
          if (vMatch.max_discount_amount && discountAmount > vMatch.max_discount_amount) {
            discountAmount = vMatch.max_discount_amount;
          }
        } else {
          discountAmount = vMatch.discount_value;
        }
      }
    }
  }

  const totalPrice = Math.max(0, rawSubtotal - discountAmount);

  const handleApplyVoucher = () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) {
      setAppliedVoucherCode('');
      setVoucherMsg(null);
      return;
    }

    const found = vouchers.find((v) => v.code.toUpperCase() === code);
    if (!found) {
      setVoucherMsg({ text: `Mã "${code}" không hợp lệ hoặc đã hết hạn!`, isError: true });
      return;
    }

    if (rawSubtotal < found.min_order_value) {
      setVoucherMsg({
        text: `Đơn hàng tối thiểu phải từ ${found.min_order_value.toLocaleString('vi-VN')}đ`,
        isError: true,
      });
      return;
    }

    setAppliedVoucherCode(code);
    setVoucherMsg({ text: `Áp dụng thành công mã ${code}!`, isError: false });
  };

  const handleToggleService = (sId: number) => {
    setSelectedServiceIds((prev) => ({
      ...prev,
      [sId]: !prev[sId],
    }));
  };

  if (loading) {
    return (
      <div className="bg-[#FAF7F2] min-h-screen py-24 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#C85A32] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#3E2C23] font-semibold text-sm">Đang tải dữ liệu chi tiết phòng từ hệ thống...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="bg-[#FAF7F2] min-h-screen py-24 text-center">
        <p className="text-lg font-bold text-[#3E2C23]">Không tìm thấy thông tin phòng yêu cầu.</p>
        <Button variant="primary" className="mt-4" onClick={onGoBack}>
          Quay lại danh sách phòng
        </Button>
      </div>
    );
  }

  const roomTitle = `Phòng ${room.room_number} - ${room.room_type_name}`;
  const galleryPhotos = room.images.length > 0 ? room.images : [
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
  ];

  const statusBadgeVariant =
    room.status === 'available'
      ? 'feature-green'
      : room.status === 'occupied'
      ? 'warning'
      : 'error';

  const statusLabel =
    room.status === 'available'
      ? 'Phòng Sẵn Sàng Đón Khách'
      : room.status === 'occupied'
      ? 'Phòng Đang Có Khách'
      : 'Đang Bảo Dưỡng Trang Thiết Bị';

  return (
    <div className="bg-[#FAF7F2] min-h-screen pb-16 font-sans">
      {/* Header / Breadcrumb */}
      <div className="bg-[#FAF7F2] border-b border-[#E8DFD1]/70 pt-6 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center text-xs font-sans text-[#3E2C23]/60 space-x-2 mb-4">
            <button onClick={onGoBack} className="hover:text-[#C85A32] transition-colors">
              Trang chủ
            </button>
            <span>/</span>
            <button onClick={onGoBack} className="hover:text-[#C85A32] transition-colors">
              Danh sách phòng
            </button>
            <span>/</span>
            <span className="text-[#3E2C23] font-semibold">{roomTitle}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="signature">📍 {room.apartment_name}</Badge>
                <Badge variant={statusBadgeVariant}>● {statusLabel}</Badge>
                <Badge variant="smartpin">🔑 TTLock: {room.lock?.cloud_lock_id || 'Smart Lock 24/7'}</Badge>
              </div>
              <h1 className="text-3xl lg:text-4xl font-serif font-bold text-[#3E2C23]">
                {roomTitle}
              </h1>
              <p className="text-xs lg:text-sm font-sans text-[#7A6B63] mt-1">
                📍 {room.address} • ({room.city})
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onGoBack}>
              ← Quay lại danh sách
            </Button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Photo Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 rounded-3xl overflow-hidden shadow-md border border-[#E8DFD1] mb-10 bg-white p-3">
          {/* Main Large Photo */}
          <div className="md:col-span-8 relative h-[360px] md:h-[480px] rounded-2xl overflow-hidden">
            <img
              src={galleryPhotos[activePhotoIdx] || galleryPhotos[0]}
              alt={roomTitle}
              className="w-full h-full object-cover transition-all duration-500"
            />
            <span className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg font-medium">
              📷 {roomTitle} ({activePhotoIdx + 1}/{galleryPhotos.length})
            </span>
          </div>

          {/* Side Photo List / Thumbnails */}
          <div className="md:col-span-4 flex flex-col gap-3 h-[360px] md:h-[480px]">
            {galleryPhotos.map((photo, idx) => (
              <div
                key={idx}
                onClick={() => setActivePhotoIdx(idx)}
                className={`relative flex-1 rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-200 ${
                  activePhotoIdx === idx ? 'border-[#C85A32] shadow-md scale-[1.01]' : 'border-transparent opacity-85 hover:opacity-100'
                }`}
              >
                <img
                  src={photo}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Content Layout Grid (Left: Details, Right: Sticky Booking Form) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column - Details */}
          <div className="lg:col-span-7 space-y-8">
            {/* 1. Tổng Quan Không Gian */}
            <section className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E8DFD1] space-y-4 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-[#3E2C23] flex items-center gap-2">
                🏡 Tổng Quan Không Gian Phòng {room.room_number}
              </h2>
              <p className="text-sm font-sans text-[#7A6B63] leading-relaxed">
                {room.description}
              </p>

              {/* 4 Box thông số */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#F2ECE1] text-center">
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8DFD1]">
                  <span className="text-[11px] text-[#8C7A70] block uppercase font-bold">Diện tích</span>
                  <span className="text-sm font-bold text-[#3E2C23]">{room.area}</span>
                </div>
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8DFD1]">
                  <span className="text-[11px] text-[#8C7A70] block uppercase font-bold">Sức chứa</span>
                  <span className="text-sm font-bold text-[#3E2C23]">{room.max_occupancy} Khách</span>
                </div>
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8DFD1]">
                  <span className="text-[11px] text-[#8C7A70] block uppercase font-bold">Giường ngủ</span>
                  <span className="text-xs font-bold text-[#3E2C23] truncate block">{room.bed_type}</span>
                </div>
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8DFD1]">
                  <span className="text-[11px] text-[#8C7A70] block uppercase font-bold">Khóa cửa</span>
                  <span className="text-xs font-bold text-[#C85A32] block">TTLock Smart PIN</span>
                </div>
              </div>
            </section>

            {/* 2. Tiện Nghi Thực Tế (Tải từ DB Seed Data: amenities & room_amenities) */}
            <section className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E8DFD1] space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-bold text-[#3E2C23]">
                  ✨ Tiện Nghi Có Sẵn Trong Phòng
                </h2>
                <span className="text-xs text-[#C85A32] font-semibold bg-[#C85A32]/10 px-3 py-1 rounded-full">
                  {room.amenities.length} Tiện ích chuẩn
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {room.amenities.map((amenity) => (
                  <div
                    key={amenity.id}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8DFD1]/80 hover:border-[#C85A32]/50 transition-colors"
                  >
                    <span className="text-xl shrink-0">{amenity.icon || '✓'}</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#3E2C23]">{amenity.name}</h4>
                      <p className="text-[11px] text-[#8C7A70]">
                        Phân loại: {amenity.category || 'Tiện ích nghỉ dưỡng'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. Tích hợp Khóa Thông Minh TTLock */}
            <section className="bg-[#2D1D16] text-white p-6 sm:p-7 rounded-3xl space-y-4 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-widest text-[#E07A5F] uppercase">
                  TỰ ĐỘNG HÓA NHẬN PHÒNG KHÔNG CHẠM
                </span>
                <span className="text-[11px] font-mono bg-white/10 px-2.5 py-1 rounded-full text-white/90">
                  {room.lock?.cloud_lock_id || 'LOCK_TTLOCK'}
                </span>
              </div>

              <h2 className="text-xl font-serif font-bold text-white">
                3 Bước Nhận Phòng Tự Động Với Khóa TTLock {room.room_number}
              </h2>

              <p className="text-xs text-white/70 font-light leading-relaxed">
                Sau khi thanh toán hoàn tất, hệ thống tự động đồng bộ API tạo mã PIN số có hiệu lực đúng theo khoảng thời gian bạn đăng ký lưu trú.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 space-y-1.5">
                  <span className="text-[#E07A5F] font-mono font-bold text-lg">01.</span>
                  <h4 className="text-xs font-bold text-white">Thanh Toán Trực Tuyến</h4>
                  <p className="text-[11px] text-white/70">Xác nhận thanh toán qua PayOS/QR tức thì.</p>
                </div>

                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 space-y-1.5">
                  <span className="text-[#E07A5F] font-mono font-bold text-lg">02.</span>
                  <h4 className="text-xs font-bold text-white">Nhận Mã PIN Cửa</h4>
                  <p className="text-[11px] text-white/70">Mã PIN cá nhân gửi qua Zalo/Email trước giờ check-in.</p>
                </div>

                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 space-y-1.5">
                  <span className="text-[#E07A5F] font-mono font-bold text-lg">03.</span>
                  <h4 className="text-xs font-bold text-white">Chạm & Mở Cửa</h4>
                  <p className="text-[11px] text-white/70">Bấm số PIN + phím # trên khóa cửa phòng {room.room_number}.</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column - Booking Sidebar */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E8DFD1] shadow-xl sticky top-24 space-y-6">
              {/* Header Price */}
              <div className="flex items-baseline justify-between border-b border-[#F2ECE1] pb-4">
                <div>
                  <span className="text-xs text-[#8C7A70] uppercase font-bold tracking-wider block">
                    Giá niêm yết
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-serif text-[#C85A32]">
                      {room.base_price.toLocaleString('vi-VN')}đ
                    </span>
                    <span className="text-xs font-sans text-[#7A6B63]">/ đêm</span>
                  </div>
                </div>
                <Badge variant="signature">Phòng {room.room_number}</Badge>
              </div>

              {/* Form Controls: Dates & Guests */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#3E2C23] block mb-1">
                      Nhận phòng (Check-in)
                    </label>
                    <input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl px-3 py-2 text-xs font-sans outline-none focus:border-[#C85A32]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#3E2C23] block mb-1">
                      Trả phòng (Check-out)
                    </label>
                    <input
                      type="date"
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="w-full bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl px-3 py-2 text-xs font-sans outline-none focus:border-[#C85A32]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#3E2C23] block mb-1">
                    Số lượng khách lưu trú
                  </label>
                  <select
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl px-3 py-2.5 text-xs font-sans outline-none focus:border-[#C85A32]"
                  >
                    {Array.from({ length: room.max_occupancy }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} Khách {n === room.max_occupancy ? '(Tối đa)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Add-on Services from Database (services table) */}
              <div className="space-y-2.5 pt-2 border-t border-[#F2ECE1]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3E2C23] block">
                    🎁 Dịch vụ tiện ích gia tăng (Bảng Services DB):
                  </span>
                </div>

                {services.map((svc) => (
                  <label
                    key={svc.id}
                    className="flex items-start gap-2.5 text-xs text-[#3E2C23] cursor-pointer p-2.5 rounded-xl hover:bg-[#FAF7F2] transition-colors border border-transparent hover:border-[#E8DFD1]"
                  >
                    <input
                      type="checkbox"
                      checked={!!selectedServiceIds[svc.id]}
                      onChange={() => handleToggleService(svc.id)}
                      className="accent-[#C85A32] mt-0.5"
                    />
                    <div className="flex-1">
                      <span className="font-semibold block">{svc.name}</span>
                      <span className="text-[11px] text-[#8C7A70] line-clamp-1">{svc.description}</span>
                    </div>
                    <span className="font-bold text-[#C85A32] shrink-0">
                      +{Number(svc.price).toLocaleString('vi-VN')}đ
                    </span>
                  </label>
                ))}
              </div>

              {/* Voucher Input */}
              <div className="pt-2 border-t border-[#F2ECE1] space-y-2">
                <label className="text-xs font-bold text-[#3E2C23] block">
                  🎟️ Mã giảm giá (Bảng Vouchers DB):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value)}
                    placeholder="Nhập WELCOME2026 hoặc SUMMERVIP"
                    className="flex-1 bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl px-3 py-2 text-xs font-mono uppercase outline-none focus:border-[#C85A32]"
                  />
                  <button
                    onClick={handleApplyVoucher}
                    className="bg-[#3E2C23] text-white px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-[#2D1D16] transition-colors cursor-pointer"
                  >
                    Áp dụng
                  </button>
                </div>
                {voucherMsg && (
                  <p className={`text-[11px] ${voucherMsg.isError ? 'text-rose-600' : 'text-emerald-700'} font-medium`}>
                    {voucherMsg.text}
                  </p>
                )}
              </div>

              {/* Price Calculation Summary */}
              <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFD1] space-y-2 text-xs">
                <div className="flex justify-between text-[#7A6B63]">
                  <span>Tiền phòng ({nights} đêm x {room.base_price.toLocaleString('vi-VN')}đ):</span>
                  <span className="font-semibold text-[#3E2C23]">{roomPriceTotal.toLocaleString('vi-VN')}đ</span>
                </div>

                {servicesTotal > 0 && (
                  <div className="flex justify-between text-[#7A6B63]">
                    <span>Dịch vụ tiện ích chọn thêm:</span>
                    <span className="font-semibold text-[#3E2C23]">+{servicesTotal.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Mã ưu đãi {appliedVoucherCode}:</span>
                    <span>-{discountAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-bold text-[#3E2C23] pt-2 border-t border-[#E8DFD1]">
                  <span>Tổng tiền thanh toán:</span>
                  <span className="text-xl font-serif text-[#C85A32]">
                    {totalPrice.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              {/* CTA Action */}
              <Button
                variant="primary"
                size="lg"
                className="w-full font-bold uppercase tracking-wider"
                disabled={room.status !== 'available'}
                onClick={() =>
                  onProceedToCheckout({
                    roomId: room.id,
                    roomNumber: room.room_number,
                    roomTitle: roomTitle,
                    branch: room.apartment_name,
                    address: room.address,
                    city: room.city,
                    checkInDate,
                    checkOutDate,
                    nights,
                    guestCount,
                    selectedServices: services.filter((s) => selectedServiceIds[s.id]),
                    voucherCode: appliedVoucherCode,
                    discountAmount,
                    totalPrice,
                  })
                }
              >
                {room.status === 'available' ? '🔒 Đặt Phòng & Nhận Mã PIN' : 'Phòng Hiện Không Sẵn Sàng'}
              </Button>

              <div className="text-[11px] text-center text-[#8C7A70] space-y-1">
                <p>⚡ Nhận phòng tự động 24/7 với Smart Lock TTLock</p>
                <p>📞 Hotline quản gia 24/7: <strong>0901.234.567</strong></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
