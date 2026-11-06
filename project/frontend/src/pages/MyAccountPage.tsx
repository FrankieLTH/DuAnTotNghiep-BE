import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

interface MyAccountPageProps {
  onGoHome: () => void;
  onBookRoom: () => void;
}

export const MyAccountPage: React.FC<MyAccountPageProps> = ({ onGoHome, onBookRoom }) => {
  const [activeTab, setActiveTab] = useState<'trips' | 'smartpin' | 'vouchers' | 'profile' | 'support'>('trips');
  const [copiedPin, setCopiedPin] = useState(false);
  const [, setSyncKey] = useState<number>(0);

  // Lắng nghe sự kiện realtime từ Admin: cập nhật đơn phòng & mã PIN tức thì
  useRealtimeSync({
    eventTypes: ['booking.updated', 'customer.updated'],
    onRefresh: () => {
      setSyncKey((prev) => prev + 1);
    },
  });

  const handleCopyPin = () => {
    navigator.clipboard.writeText('829415');
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen pb-16 font-sans">
      {/* Header & Breadcrumbs */}
      <div className="bg-[#FAF7F2] border-b border-secondary-sand/70 pt-6 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <nav className="flex items-center text-xs font-sans text-brand-earth/60 space-x-2">
              <button onClick={onGoHome} className="hover:text-brand-terracotta">Trang chủ</button>
              <span>/</span>
              <span className="text-brand-earth font-semibold">Tài khoản cá nhân</span>
            </nav>

            <span className="text-xs text-semantic-success flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-semantic-success animate-pulse" />
              Hệ thống Smart Lock đang đồng bộ dữ liệu
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* User Profile Summary */}
            <div className="bg-white p-5 rounded-2xl border border-secondary-sand shadow-xs space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-brand-earth text-brand-amber font-serif font-bold text-xl rounded-2xl flex items-center justify-center shadow-xs">
                  HN
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold text-brand-earth">
                    Nguyễn Hoàng Nam
                  </h2>
                  <Badge variant="success" className="mt-1">Thành viên đã xác thực</Badge>
                </div>
              </div>

              {/* Account Tabs Menu */}
              <div className="space-y-1 pt-2 border-t border-secondary-sand/60 text-xs font-medium">
                <button
                  onClick={() => setActiveTab('trips')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                    activeTab === 'trips'
                      ? 'bg-brand-earth text-white shadow-xs font-semibold'
                      : 'text-brand-earth/80 hover:bg-secondary-cream'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span>🧳</span> Chuyến đi & Đặt phòng
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'trips' ? 'bg-brand-amber text-brand-earth font-bold' : 'bg-brand-terracotta text-white'}`}>
                    1 Mới
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('smartpin')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                    activeTab === 'smartpin'
                      ? 'bg-brand-earth text-white shadow-xs font-semibold'
                      : 'text-brand-earth/80 hover:bg-secondary-cream'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span>🔑</span> Mã PIN Smart Lock
                  </span>
                  <span className="w-2 h-2 rounded-full bg-semantic-success" />
                </button>

                <button
                  onClick={() => setActiveTab('vouchers')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                    activeTab === 'vouchers'
                      ? 'bg-brand-earth text-white shadow-xs font-semibold'
                      : 'text-brand-earth/80 hover:bg-secondary-cream'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span>🎟️</span> Kho Voucher & Ưu đãi
                  </span>
                  <span className="text-[11px] text-brand-earth/60">3 mã</span>
                </button>

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                    activeTab === 'profile'
                      ? 'bg-brand-earth text-white shadow-xs font-semibold'
                      : 'text-brand-earth/80 hover:bg-secondary-cream'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span>🪪</span> Thông tin cá nhân
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('support')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                    activeTab === 'support'
                      ? 'bg-brand-earth text-white shadow-xs font-semibold'
                      : 'text-brand-earth/80 hover:bg-secondary-cream'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span>🎧</span> Hỗ trợ & Hotline 24/7
                  </span>
                </button>
              </div>
            </div>

            {/* Branch Preferences */}
            <div className="bg-white p-5 rounded-2xl border border-secondary-sand space-y-3">
              <h3 className="text-xs font-bold text-brand-earth uppercase tracking-wider">
                CHI NHÁNH ĐẶT CHÂN
              </h3>

              <div className="bg-secondary-cream p-3 rounded-xl border border-secondary-sand space-y-1">
                <span className="text-xs font-bold text-brand-earth block">
                  CN 2: Hải Đăng Retreat
                </span>
                <span className="text-[11px] text-brand-terracotta font-medium block">
                  Đang có chuyến đi sắp tới
                </span>
              </div>

              <div className="bg-secondary-cream p-3 rounded-xl border border-secondary-sand space-y-1">
                <span className="text-xs font-bold text-brand-earth block">
                  CN 1: Triển Núi Nhỏ
                </span>
                <span className="text-[11px] text-brand-earth/70 block">
                  Đã lưu trú 2 lần trước đây
                </span>
              </div>
            </div>

            {/* Privilege box */}
            <div className="bg-brand-earth text-white p-5 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold text-brand-amber uppercase tracking-wider block">
                💡 QUYỀN LỢI CHECK-IN TỰ ĐỘNG
              </span>
              <p className="text-xs text-secondary-sand/90 leading-relaxed">
                Nhận mã khóa số riêng không đụng hàng, tự mở cổng và phòng bất kể chuyến xe muốn lúc nửa đêm.
              </p>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Upcoming Trip Card */}
            <section className="bg-white p-6 rounded-2xl border border-secondary-sand shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-secondary-sand/60 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-semantic-success" />
                  <h2 className="text-lg font-serif font-bold text-brand-earth">
                    Chuyến Đi Sắp Tới
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="success">✓ Đã xác nhận & Đã thanh toán</Badge>
                  <span className="text-brand-earth/60">Mã đơn: #DBG-89241</span>
                </div>
              </div>

              {/* Room & Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 relative h-48 rounded-xl overflow-hidden bg-brand-earth">
                  <img
                    src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80"
                    alt="Sunset Penthouse"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2.5 py-1 rounded-md">
                    Jacuzzi 270° View Biển
                  </span>
                  <div className="absolute bottom-2 left-2 text-[10px] text-white bg-brand-earth/80 px-2 py-1 rounded">
                    Hẻm 12 Hạ Long, Phường 2, Vũng Tàu
                  </div>
                </div>

                <div className="md:col-span-7 space-y-3">
                  <span className="text-xs font-bold text-brand-terracotta uppercase">
                    CHI NHÁNH 2 • HẢI ĐĂNG RETREAT
                  </span>
                  <h3 className="text-xl font-serif font-bold text-brand-earth">
                    Sunset Penthouse & Jacuzzi 270°
                  </h3>

                  <div className="grid grid-cols-3 gap-2 bg-secondary-cream p-3 rounded-xl border border-secondary-sand text-xs">
                    <div>
                      <span className="text-[10px] text-brand-earth/60 block">Nhận phòng</span>
                      <strong className="text-brand-earth">15/11/2024</strong>
                      <span className="text-[10px] text-brand-earth/60 block">Từ 14:00</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-earth/60 block">Trả phòng</span>
                      <strong className="text-brand-earth">17/11/2024</strong>
                      <span className="text-[10px] text-brand-earth/60 block">Trước 12:00</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-earth/60 block">Quy mô</span>
                      <strong className="text-brand-earth">2 Đêm • 2 Khách</strong>
                      <span className="text-[10px] text-brand-earth/60 block">1 Giường King</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PIN Box Card */}
              <div className="bg-[#FAF6EE] p-5 rounded-2xl border border-[#EBE0C9] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-earth flex items-center gap-2">
                    🔑 Mã PIN Smart Lock Của Bạn
                  </span>
                  <span className="text-[11px] text-brand-earth/60 bg-white px-2.5 py-1 rounded-full border border-secondary-sand">
                    Kích hoạt lúc 14:00 ngày 15/11
                  </span>
                </div>

                {/* Big digits */}
                <div className="flex items-center justify-center gap-3 my-2">
                  {['8', '2', '9', '4', '1', '5'].map((digit, idx) => (
                    <div
                      key={idx}
                      className="w-11 h-13 bg-white text-brand-earth border border-secondary-sand rounded-xl shadow-xs flex items-center justify-center text-2xl font-mono font-bold"
                    >
                      {digit}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <p className="text-[11px] text-brand-earth/80">
                    <strong>Cách mở:</strong> Chạm lòng bàn tay bật sáng khóa số ➔ Nhập <strong className="text-brand-terracotta">829415</strong> ➔ Nhấn phím <strong>#</strong> để mở cửa.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleCopyPin} className="shrink-0">
                    {copiedPin ? '✓ Đã Sao Chép' : '📋 Nhận PIN'}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button variant="dark" size="sm" onClick={() => window.open('https://maps.google.com', '_blank')}>
                  🗺️ Xem chỉ đường Google Maps
                </Button>
                <Button variant="ghost" size="sm" onClick={() => alert('Vui lòng liên hệ quản gia để được hỗ trợ nhận phòng sớm nếu phòng trống.')}>
                  ⏱️ Yêu cầu nhận phòng sớm
                </Button>
                <span className="ml-auto text-xs text-brand-earth/60 hover:underline cursor-pointer">
                  Chính sách hoàn hủy mùa mưa bão →
                </span>
              </div>
            </section>

            {/* Vouchers section inside Account */}
            <section className="bg-white p-6 rounded-2xl border border-secondary-sand shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-secondary-sand/60 pb-3">
                <h2 className="text-lg font-serif font-bold text-brand-earth flex items-center gap-2">
                  🎟️ Ví Voucher Thành Viên
                </h2>
                <span className="text-xs text-brand-earth/70">3 mã khả dụng cho lần đặt tới</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-secondary-cream p-4 rounded-xl border border-secondary-sand space-y-2">
                  <div className="flex justify-between text-xs">
                    <Badge variant="discount">GIẢM 15%</Badge>
                    <span className="text-[10px] text-brand-earth/60">HSD: 31/12/2024</span>
                  </div>
                  <h4 className="text-sm font-mono font-bold text-brand-earth">BONGGON15</h4>
                  <p className="text-[11px] text-brand-earth/70">Áp dụng khi đặt từ 2 đêm tại Triển Núi Nhỏ & Hải Đăng Retreat.</p>
                  <button onClick={onBookRoom} className="text-xs font-semibold text-brand-terracotta hover:underline block pt-1">
                    Áp dụng ngay →
                  </button>
                </div>

                <div className="bg-secondary-cream p-4 rounded-xl border border-secondary-sand space-y-2">
                  <div className="flex justify-between text-xs">
                    <Badge variant="discount">GIẢM 10%</Badge>
                    <span className="text-[10px] text-brand-earth/60">HSD: 15/01/2025</span>
                  </div>
                  <h4 className="text-sm font-mono font-bold text-brand-earth">EARLYBIRD</h4>
                  <p className="text-[11px] text-brand-earth/70">Đặt phòng trước tối thiểu 14 ngày cho kỳ nghỉ thong thả.</p>
                  <button onClick={onBookRoom} className="text-xs font-semibold text-brand-terracotta hover:underline block pt-1">
                    Áp dụng ngay →
                  </button>
                </div>

                <div className="bg-secondary-cream p-4 rounded-xl border border-secondary-sand space-y-2">
                  <div className="flex justify-between text-xs">
                    <Badge variant="signature">QUÀ TẶNG</Badge>
                    <span className="text-[10px] text-brand-earth/60">Vô thời hạn</span>
                  </div>
                  <h4 className="text-sm font-mono font-bold text-brand-earth">TEAWELLNESS</h4>
                  <p className="text-[11px] text-brand-earth/70">Tặng 01 khay trà thảo mộc hoa cúc kèm bánh quy nướng thủ công.</p>
                  <button onClick={onBookRoom} className="text-xs font-semibold text-brand-terracotta hover:underline block pt-1">
                    Áp dụng ngay →
                  </button>
                </div>
              </div>
            </section>

            {/* Travel History */}
            <section className="bg-white p-6 rounded-2xl border border-secondary-sand shadow-xs space-y-4">
              <h2 className="text-lg font-serif font-bold text-brand-earth flex items-center gap-2 border-b border-secondary-sand/60 pb-3">
                📜 Lịch Sử Các Chuyến Đi Trước
              </h2>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-secondary-cream rounded-xl border border-secondary-sand gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=150&q=80"
                      alt="Sea View Balcony"
                      className="w-14 h-14 object-cover rounded-lg shrink-0"
                    />
                    <div>
                      <span className="text-[10px] text-semantic-success font-semibold">✓ Hoàn thành • Tháng 08/2024 (1 đêm)</span>
                      <h4 className="text-xs font-bold text-brand-earth">Sea View Balcony Room</h4>
                      <p className="text-[11px] text-brand-earth/70">Chi nhánh 1: Triển Núi Nhỏ • Ban công đón gió biển</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-brand-earth block">1.150.000đ</span>
                    <Button variant="outline" size="sm" onClick={onBookRoom} className="mt-1">
                      🔄 Đặt lại phòng này
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-secondary-cream rounded-xl border border-secondary-sand gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=150&q=80"
                      alt="The Family Attic"
                      className="w-14 h-14 object-cover rounded-lg shrink-0"
                    />
                    <div>
                      <span className="text-[10px] text-semantic-success font-semibold">✓ Hoàn thành • Tháng 04/2024 (2 đêm)</span>
                      <h4 className="text-xs font-bold text-brand-earth">The Family Attic & Terrace</h4>
                      <p className="text-[11px] text-brand-earth/70">Chi nhánh 1: Triển Núi Nhỏ • Bếp BBQ sân hiên riêng</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-brand-earth block">3.700.000đ</span>
                    <span className="text-[10px] text-semantic-success font-semibold">⭐ Đã nhận 100 điểm thưởng</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
