import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface SupportPageProps {
  onGoHome: () => void;
}

export const SupportPage: React.FC<SupportPageProps> = ({ onGoHome }) => {
  const [activeCategory, setActiveCategory] = useState<'policy' | 'cancellation' | 'map' | 'faq' | 'contact'>('policy');
  const [openFaq, setOpenFaq] = useState<number | null>(1);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen pb-16 font-sans">
      {/* Header section */}
      <div className="bg-[#FAF7F2] border-b border-secondary-sand/70 pt-6 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center text-xs font-sans text-brand-earth/60 space-x-2 mb-4">
            <button onClick={onGoHome} className="hover:text-brand-terracotta">Trang chủ</button>
            <span>/</span>
            <span className="text-brand-earth font-semibold">Trung tâm hỗ trợ</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold tracking-widest uppercase text-brand-terracotta bg-brand-tint px-3 py-1 rounded-full inline-block mb-2">
                BOUTIQUE SANCTUARY SUPPORT DESK
              </span>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-brand-earth">
                Trung Tâm Hỗ Trợ & Hướng Dẫn
              </h1>
              <p className="text-sm font-sans text-brand-earth/80 mt-2 max-w-2xl leading-relaxed">
                Thông tin ngắn gọn, minh bạch về chính sách lưu trú, bản đồ 2 chi nhánh và hỗ trợ giải đáp nhanh 24/7.
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-secondary-sand shadow-xs text-xs space-y-1 shrink-0">
              <span className="flex items-center gap-2 font-bold text-brand-earth">
                <span className="w-2.5 h-2.5 rounded-full bg-semantic-success animate-ping" />
                Tự động check-in PIN 24/7
              </span>
              <p className="text-brand-earth/70">Không chạm • Riêng tư tuyệt đối</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Navigation Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-secondary-sand shadow-xs space-y-1 text-xs font-medium">
              <button
                onClick={() => setActiveCategory('policy')}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all ${
                  activeCategory === 'policy'
                    ? 'bg-brand-earth text-white shadow-xs font-semibold'
                    : 'text-brand-earth/80 hover:bg-secondary-cream'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span>🛡️</span> Chính sách lưu trú
                </span>
                <span>→</span>
              </button>

              <button
                onClick={() => setActiveCategory('cancellation')}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all ${
                  activeCategory === 'cancellation'
                    ? 'bg-brand-earth text-white shadow-xs font-semibold'
                    : 'text-brand-earth/80 hover:bg-secondary-cream'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span>🔄</span> Hủy phòng & Hoàn cọc
                </span>
                <span>→</span>
              </button>

              <button
                onClick={() => setActiveCategory('map')}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all ${
                  activeCategory === 'map'
                    ? 'bg-brand-earth text-white shadow-xs font-semibold'
                    : 'text-brand-earth/80 hover:bg-secondary-cream'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span>🗺️</span> Giới thiệu & Bản đồ
                </span>
                <span>→</span>
              </button>

              <button
                onClick={() => setActiveCategory('faq')}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all ${
                  activeCategory === 'faq'
                    ? 'bg-brand-earth text-white shadow-xs font-semibold'
                    : 'text-brand-earth/80 hover:bg-secondary-cream'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span>❓</span> Câu hỏi thường gặp (FAQ)
                </span>
                <span>→</span>
              </button>

              <button
                onClick={() => setActiveCategory('contact')}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all ${
                  activeCategory === 'contact'
                    ? 'bg-brand-earth text-white shadow-xs font-semibold'
                    : 'text-brand-earth/80 hover:bg-secondary-cream'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span>📞</span> Liên hệ khẩn cấp 24/7
                </span>
                <span>→</span>
              </button>
            </div>

            {/* Smart Check-in Promo Box */}
            <div className="bg-secondary-cream p-5 rounded-2xl border border-secondary-sand space-y-2">
              <span className="text-xl">🔑</span>
              <h4 className="text-xs font-bold text-brand-earth">Check-in tự động 24/7</h4>
              <p className="text-[11px] text-brand-earth/70 leading-relaxed">
                Mã PIN riêng tư gửi tự động qua Zalo/SMS trước 2 giờ. Đến bất cứ lúc nào không cần chờ đợi.
              </p>
              <span className="text-[10px] text-brand-terracotta font-bold block pt-1">
                100% Không chạm →
              </span>
            </div>

            {/* Emergency Hotline Box */}
            <div className="bg-brand-earth text-white p-5 rounded-2xl space-y-2 shadow-md">
              <span className="text-[10px] text-brand-amber font-mono uppercase tracking-widest block">
                HOTLINE TRỰC TUYẾN 24/7
              </span>
              <h3 className="text-2xl font-serif font-bold text-brand-amber">
                0908.868.888
              </h3>
              <p className="text-xs text-secondary-sand/90">
                Quản gia túc trực hỗ trợ mở cửa, đổi giờ và xử lý thắc mắc trực tiếp.
              </p>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Section 1: Policies */}
            <section className="bg-white p-6 rounded-2xl border border-secondary-sand shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-secondary-sand/60 pb-3">
                <h2 className="text-xl font-serif font-bold text-brand-earth">
                  Chính Sách & Nội Quy Lưu Trú
                </h2>
                <Badge variant="smartpin">Tiêu chuẩn 2024</Badge>
              </div>

              {/* Block 1: Check-in / Out */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-brand-earth uppercase tracking-wider flex items-center gap-2">
                  ⏱️ Nhận & Trả phòng thông minh
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-secondary-cream p-4 rounded-xl border border-secondary-sand space-y-1">
                    <span className="text-[10px] text-brand-earth/60 font-semibold block">GIỜ NHẬN PHÒNG (CHECK-IN)</span>
                    <strong className="text-lg font-serif text-brand-earth block">Từ 14:00</strong>
                    <p className="text-[11px] text-brand-earth/70">Mã PIN gửi tự động trước 2 tiếng qua SMS/Zalo.</p>
                  </div>

                  <div className="bg-secondary-cream p-4 rounded-xl border border-secondary-sand space-y-1">
                    <span className="text-[10px] text-brand-earth/60 font-semibold block">GIỜ TRẢ PHÒNG (CHECK-OUT)</span>
                    <strong className="text-lg font-serif text-brand-earth block">Trước 12:00</strong>
                    <p className="text-[11px] text-brand-earth/70">Khóa tự động đặt lại mã mới để bảo mật.</p>
                  </div>
                </div>
                <p className="text-[11px] text-brand-earth/70 italic">
                  ✓ Hỗ trợ nhận sớm / trả muộn linh hoạt theo tình trạng phòng (vui lòng nhắn Hotline/Zalo trước).
                </p>
              </div>

              {/* Block 2: Preservation Rules */}
              <div className="space-y-3 pt-4 border-t border-secondary-sand/60">
                <h3 className="text-xs font-bold text-brand-earth uppercase tracking-wider flex items-center gap-2">
                  🌿 Nội quy bảo tồn an yên
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-secondary-cream p-3 rounded-xl border border-secondary-sand space-y-1">
                    <span className="text-lg block">🌙</span>
                    <strong className="text-brand-earth block">Sau 22:00</strong>
                    <p className="text-[11px] text-brand-earth/70">Hạ âm lượng loa & sinh hoạt nhẹ nhàng để giữ trọn vẹn sự tĩnh lặng.</p>
                  </div>

                  <div className="bg-secondary-cream p-3 rounded-xl border border-secondary-sand space-y-1">
                    <span className="text-lg block">🚭</span>
                    <strong className="text-brand-earth block">Không hút thuốc</strong>
                    <p className="text-[11px] text-brand-earth/70">Tuyệt đối không hút trong phòng kín. Có góc sân vườn mở thoáng đẵng.</p>
                  </div>

                  <div className="bg-secondary-cream p-3 rounded-xl border border-secondary-sand space-y-1">
                    <span className="text-lg block">🍢</span>
                    <strong className="text-brand-earth block">Bếp BBQ sạch</strong>
                    <p className="text-[11px] text-brand-earth/70">Dọn dẹp than hồng sau khi nướng để đảm bảo phòng chống cháy nổ.</p>
                  </div>
                </div>
              </div>

              {/* Block 3: Equipment compensation */}
              <div className="space-y-3 pt-4 border-t border-secondary-sand/60">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-brand-earth uppercase tracking-wider flex items-center gap-2">
                    📋 Bảo vệ trang thiết bị & đền bù minh bạch
                  </h3>
                  <span className="text-[10px] text-brand-earth/60">Giá linh kiện chuẩn hãng</span>
                </div>

                <div className="bg-secondary-cream rounded-xl border border-secondary-sand divide-y divide-secondary-sand/50 text-xs">
                  <div className="p-3 flex justify-between">
                    <span>Loa Marshall Stanmore / Acton</span>
                    <strong className="text-brand-earth">Đền bù theo linh kiện bảo hành hãng</strong>
                  </div>
                  <div className="p-3 flex justify-between">
                    <span>Máy chiếu mini rạp phim 4K</span>
                    <strong className="text-brand-earth">Theo chi phí sửa chữa kỹ thuật</strong>
                  </div>
                  <div className="p-3 flex justify-between">
                    <span>Vấy bẩn chăn ga nệm cao cấp</span>
                    <strong className="text-brand-earth">Phí giặt sấy chuyên dụng hoặc đổi mới</strong>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: FAQ Accordion */}
            <section className="bg-white p-6 rounded-2xl border border-secondary-sand shadow-xs space-y-4">
              <h2 className="text-xl font-serif font-bold text-brand-earth border-b border-secondary-sand/60 pb-3">
                ❓ Câu Hỏi Thường Gặp (FAQ)
              </h2>

              <div className="space-y-3">
                <div className="border border-secondary-sand rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleFaq(1)}
                    className="w-full text-left p-4 bg-secondary-cream flex items-center justify-between text-xs font-bold text-brand-earth hover:bg-secondary-sand/40 transition-colors"
                  >
                    <span>1. Tôi nhận mã PIN Smart Lock mở cửa bằng cách nào?</span>
                    <span>{openFaq === 1 ? '−' : '+'}</span>
                  </button>
                  {openFaq === 1 && (
                    <div className="p-4 bg-white text-xs text-brand-earth/80 leading-relaxed border-t border-secondary-sand">
                      Mã PIN 6 số sẽ tự động được hệ thống gửi qua tin nhắn Zalo và SMS tới số điện thoại bạn đăng ký trước giờ nhận phòng 2 tiếng (khoảng 12:00 trưa ngày check-in).
                    </div>
                  )}
                </div>

                <div className="border border-secondary-sand rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleFaq(2)}
                    className="w-full text-left p-4 bg-secondary-cream flex items-center justify-between text-xs font-bold text-brand-earth hover:bg-secondary-sand/40 transition-colors"
                  >
                    <span>2. Nếu tôi đến muộn lúc 1-2h sáng thì có check-in được không?</span>
                    <span>{openFaq === 2 ? '−' : '+'}</span>
                  </button>
                  {openFaq === 2 && (
                    <div className="p-4 bg-white text-xs text-brand-earth/80 leading-relaxed border-t border-secondary-sand">
                      Hoàn toàn được! Nhờ hệ thống khóa số Smart Lock 24/7, bạn có thể tự do mở cổng và nhận phòng bất kỳ lúc nào mà không cần chờ đợi lễ tân.
                    </div>
                  )}
                </div>

                <div className="border border-secondary-sand rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleFaq(3)}
                    className="w-full text-left p-4 bg-secondary-cream flex items-center justify-between text-xs font-bold text-brand-earth hover:bg-secondary-sand/40 transition-colors"
                  >
                    <span>3. Chính sách hủy phòng và hoàn tiền cọc thế nào?</span>
                    <span>{openFaq === 3 ? '−' : '+'}</span>
                  </button>
                  {openFaq === 3 && (
                    <div className="p-4 bg-white text-xs text-brand-earth/80 leading-relaxed border-t border-secondary-sand">
                      Đồi Bông Gòn hỗ trợ đổi lịch lưu trú hoặc hoàn cọc 100% miễn phí nếu báo trước ít nhất 05 ngày so với ngày nhận phòng.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
