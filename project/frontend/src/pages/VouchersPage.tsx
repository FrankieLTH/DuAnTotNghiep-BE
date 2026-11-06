import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface VouchersPageProps {
  onGoHome: () => void;
  onBookNow: (voucherCode?: string) => void;
}

const VOUCHERS_LIST = [
  {
    id: 1,
    code: 'WELCOME2026',
    title: 'WELCOME2026: Giảm ngay 10% khách mới',
    category: 'welcome',
    badge: 'Chào Mừng Khách Mới',
    hsd: '31/12/2026',
    description: 'Ưu đãi chính thức trong hệ thống: Giảm ngay 10% (tối đa 100.000đ) cho khách hàng mới khi đặt phòng từ 500.000đ trở lên.',
  },
  {
    id: 2,
    code: 'SUMMERVIP',
    title: 'SUMMERVIP: Giảm ngay 200.000đ đơn từ 1.5tr',
    category: 'family',
    badge: 'Kỳ Nghỉ Nhóm / Gia Đình',
    hsd: '30/09/2026',
    description: 'Ưu đãi áp dụng cho các căn Family Suite hoặc Penthouse khi đơn hàng đạt từ 1.500.000đ trở lên.',
  },
  {
    id: 3,
    code: 'EARLY10',
    title: 'EARLYBIRD: Giảm 10% Đặt Sớm',
    category: 'longstay',
    badge: 'Đặt sớm 14 ngày',
    hsd: 'Đang diễn ra',
    description: 'Lên kế hoạch thảnh thơi. Giảm 10% trên tổng giá trị đơn khi đặt trước ngày nhận phòng tối thiểu 14 ngày.',
  },
  {
    id: 4,
    code: 'WEEKENDLOVE',
    title: 'WEEKENDRETREAT: Set Trà & Check-in Sớm',
    category: 'weekend',
    badge: 'Cặp đôi & Cuối tuần',
    hsd: 'Đang diễn ra',
    description: 'Dành cho kỳ nghỉ cuối tuần ngọt ngào. Tặng set trà thảo mộc hoa cúc nhà làm và ưu tiên nhận phòng sớm 1 giờ.',
  },
  {
    id: 5,
    code: 'FAMILYBBQ',
    title: 'FAMILYSTAY: Tặng Set Than BBQ',
    category: 'family',
    badge: 'Gia đình / Nhóm bạn',
    hsd: 'Phổ biến',
    description: 'Áp dụng cho căn hộ Family Suite Balcony tại các chi nhánh. Miễn phí set than và bếp nướng sân vườn ngoài trời.',
  },
  {
    id: 6,
    code: 'MIDWEEK20',
    title: 'MIDWEEKHEALING: Giảm 20% Workation',
    category: 'midweek',
    badge: 'Giữa tuần (T2 - T5)',
    hsd: 'Tiết kiệm 20%',
    description: 'Tạm lánh khỏi bụi đô thị. Giảm trực tiếp 20% cho hạng phòng Studio Cozy Standard kèm đường truyền Wifi 5G tốc độ cao.',
  },
];

export const VouchersPage: React.FC<VouchersPageProps> = ({ onGoHome, onBookNow }) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredVouchers = VOUCHERS_LIST.filter((v) => {
    if (selectedFilter === 'all') return true;
    return v.category === selectedFilter;
  });

  return (
    <div className="bg-[#FAF7F2] min-h-screen pb-16 font-sans">
      {/* Header section */}
      <div className="bg-[#FAF7F2] border-b border-secondary-sand/70 pt-6 pb-10 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex items-center justify-center text-xs font-sans text-brand-earth/60 space-x-2 mb-4">
            <button onClick={onGoHome} className="hover:text-brand-terracotta">Trang chủ</button>
            <span>/</span>
            <span className="text-brand-earth font-semibold">Ưu đãi & Voucher</span>
          </nav>

          <span className="text-xs font-bold tracking-widest uppercase text-brand-terracotta bg-brand-tint px-3.5 py-1 rounded-full inline-block mb-3">
            BOUTIQUE SANCTUARY PRIVILEGES
          </span>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-brand-earth">
            Ưu Đãi & Đặc Quyền Dành Riêng Cho Bạn
          </h1>
          <p className="text-sm font-sans text-brand-earth/80 mt-3 max-w-2xl mx-auto leading-relaxed">
            Tiết kiệm hơn khi đặt phòng trực tiếp tại website chính thức. Tự động nhận mã PIN Smart Lock và quà tặng mộc mạc đặc trưng hương vị biển Vũng Tàu.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Badge variant="signature">🏷️ Giá thấp hơn OTA 12-15%</Badge>
            <Badge variant="smartpin">🔑 Check-in không tiếp xúc 24/7</Badge>
            <Badge variant="feature-green">🎁 Quà chào đón bản địa</Badge>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {/* Featured Banner Hero Voucher */}
        <div className="bg-brand-earth text-white rounded-3xl overflow-hidden shadow-lg border border-brand-earth/20 grid grid-cols-1 lg:grid-cols-12 mb-12">
          <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-between space-y-6">
            <div>
              <span className="text-xs font-bold text-brand-amber uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
                ƯU ĐÃI ĐẶC TRỰC TÍẾP WEBSITE • Đảm bảo giá chuẩn
              </span>
              <h2 className="text-3xl lg:text-4xl font-serif font-bold text-white mt-4">
                Giảm 15% khi đặt từ 2 đêm
              </h2>
              <p className="text-xs lg:text-sm font-sans text-secondary-sand/90 mt-2 leading-relaxed">
                Áp dụng cho trọn bộ 6 hạng phòng tại cả 2 chi nhánh (Triển Núi Nhỏ & Hải Đăng Retreat). Tặng kèm trà thảo mộc hoa cúc ủ lạnh khi nhận phòng.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs text-secondary-sand/80">
              <span>📅 HSD: Đến 31/12/2025</span>
              <span>•</span>
              <span>🛏️ Từ 02 đêm lưu trú</span>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#2E2019] p-8 lg:p-10 flex flex-col items-center justify-center text-center border-t lg:border-t-0 lg:border-l border-white/10 space-y-4">
            <span className="text-xs text-secondary-sand/70">MÃ ƯU ĐÃI ĐẶC QUYỀN</span>
            <div className="bg-black/40 border border-brand-amber/40 px-6 py-3 rounded-2xl text-2xl font-mono font-bold text-brand-amber tracking-widest">
              BONGGON15
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                handleCopyCode('BONGGON15');
                onBookNow('BONGGON15');
              }}
            >
              {copiedCode === 'BONGGON15' ? '✓ Đã Áp Dụng' : '📋 Sao Chép & Áp Dụng Ngay'}
            </Button>
          </div>
        </div>

        {/* Voucher List Section */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-secondary-sand pb-4">
            <h3 className="text-xl font-serif font-bold text-brand-earth">
              Voucher & Khuyến Mãi Khả Dụng
            </h3>

            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  selectedFilter === 'all'
                    ? 'bg-brand-earth text-white shadow-xs'
                    : 'bg-white border border-secondary-sand text-brand-earth hover:bg-secondary-cream'
                }`}
              >
                Tất cả ưu đãi
              </button>
              <button
                onClick={() => setSelectedFilter('longstay')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  selectedFilter === 'longstay'
                    ? 'bg-brand-earth text-white shadow-xs'
                    : 'bg-white border border-secondary-sand text-brand-earth hover:bg-secondary-cream'
                }`}
              >
                Đặt dài ngày
              </button>
              <button
                onClick={() => setSelectedFilter('weekend')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  selectedFilter === 'weekend'
                    ? 'bg-brand-earth text-white shadow-xs'
                    : 'bg-white border border-secondary-sand text-brand-earth hover:bg-secondary-cream'
                }`}
              >
                Mùa lễ & Cuối tuần
              </button>
              <button
                onClick={() => setSelectedFilter('midweek')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  selectedFilter === 'midweek'
                    ? 'bg-brand-earth text-white shadow-xs'
                    : 'bg-white border border-secondary-sand text-brand-earth hover:bg-secondary-cream'
                }`}
              >
                Đi giữa tuần (T2 - T5)
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVouchers.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-secondary-sand p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="signature">{item.badge}</Badge>
                    <span className="text-[11px] text-brand-earth/60 font-medium">HSD: {item.hsd}</span>
                  </div>

                  <h4 className="text-base font-serif font-bold text-brand-earth">
                    {item.title}
                  </h4>

                  <p className="text-xs text-brand-earth/70 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-secondary-sand/50 flex items-center justify-between">
                  <div className="bg-secondary-cream px-3 py-1.5 rounded-lg border border-secondary-sand text-xs font-mono font-bold text-brand-earth">
                    {item.code}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleCopyCode(item.code);
                      onBookNow(item.code);
                    }}
                  >
                    {copiedCode === item.code ? '✓ Đã chép' : 'Dùng mã ngay'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3 Step usage guide */}
        <div className="mt-16 bg-white p-8 rounded-3xl border border-secondary-sand text-center space-y-8">
          <span className="text-xs font-bold text-brand-terracotta uppercase tracking-widest">
            QUY TRÌNH ÁP DỤNG
          </span>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-brand-earth">
            3 Bước Sử Dụng Voucher Tinh Gọn
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-secondary-cream p-5 rounded-2xl border border-secondary-sand space-y-2">
              <span className="text-2xl font-bold font-mono text-brand-terracotta">01</span>
              <h4 className="text-sm font-bold text-brand-earth">Chọn phòng & Ngày lưu trú</h4>
              <p className="text-xs text-brand-earth/70">Xem danh sách phòng trống tại Chi nhánh 1 hoặc Chi nhánh 2.</p>
            </div>

            <div className="bg-secondary-cream p-5 rounded-2xl border border-secondary-sand space-y-2">
              <span className="text-2xl font-bold font-mono text-brand-terracotta">02</span>
              <h4 className="text-sm font-bold text-brand-earth">Áp dụng mã tại bước thanh toán</h4>
              <p className="text-xs text-brand-earth/70">Dán mã voucher vào ô "Mã giảm giá". Mức giảm sẽ trừ ngay tức thì.</p>
            </div>

            <div className="bg-secondary-cream p-5 rounded-2xl border border-secondary-sand space-y-2">
              <span className="text-2xl font-bold font-mono text-brand-terracotta">03</span>
              <h4 className="text-sm font-bold text-brand-earth">Nhận mã PIN Smart Lock 24/7</h4>
              <p className="text-xs text-brand-earth/70">Hệ thống tự động gửi tin nhắn SMS/Zalo kèm mã PIN và hướng dẫn.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
