import React from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   QuoteStatsSection – CẢM HỨNG KIẾN TRÚC
   Bố cục: Tiêu đề serif nền + polaroid rải ngẫu hứng che nhẹ chữ tiêu đề.
   ──────────────────────────────────────────────────────────────────────────── */

export const QuoteStatsSection: React.FC = () => {
  return (
    <section
      className="relative overflow-hidden bg-[#EDE8DF] py-20 md:py-28 px-4 sm:px-6 lg:px-8 border-b border-[#D8D0C4]"
      style={{ minHeight: '600px' }}
    >
      {/* ── Grain texture overlay ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-6xl mx-auto">

        {/* ── HÀNG TRÊN: Label + CTA Button cùng dòng ── */}
        <div className="flex items-center justify-between mb-6 relative z-20">
          <p className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.25em] text-[#9C8C7E]">
            Cảm hứng kiến trúc &amp; không gian
          </p>
          <a
            href="/rooms"
            className="inline-flex items-center gap-2 text-[#241C18] border border-[#241C18]/30 hover:border-[#241C18] hover:bg-[#241C18] hover:text-white px-5 py-2.5 rounded-full text-xs font-semibold tracking-widest uppercase transition-all duration-300 active:scale-95"
          >
            Xem toàn bộ không gian
            <span className="text-base leading-none">→</span>
          </a>
        </div>

        {/* ── TIÊU ĐỀ SERIF (z-0) — giảm size hợp lý ── */}
        <div className="relative z-0 select-none pointer-events-none">
          <h2
            className="font-serif font-light leading-[1.05] uppercase text-[#241C18]"
            style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)', letterSpacing: '-0.01em' }}
          >
            <span className="block">KỲ NGHỈ SẼ</span>
            <span className="block text-[#C4572E]">ĐƯỢC GHI NHỚ</span>
            <span className="block">MÃI MÃI!</span>
          </h2>

          {/* mô tả nhỏ */}
          <p className="mt-6 sm:mt-8 text-sm sm:text-base text-[#6E6359] max-w-sm leading-relaxed font-normal pointer-events-auto">
            Từng góc nhỏ tại Đồi Bông Gòn được xây dựng bằng tay — chất liệu bản địa, hơi thở núi rừng Vũng Tàu.
          </p>
        </div>

        {/* ── KHUNG POLAROID RẢI NGẪ HỨNG — che nhẹ title ── */}

        {/* POLAROID 1: trên-phải, nghiêng -6°, che nhẹ dòng "KỲ NGHỈ SẼ" */}
        <div
          className="absolute"
          style={{
            top: '12%',
            right: '3%',
            width: 'clamp(200px, 20vw, 280px)',
            transform: 'rotate(-6deg)',
            zIndex: 12,
          }}
        >
          <div
            className="bg-white p-3 pb-8 shadow-2xl"
            style={{ boxShadow: '0 20px 60px -8px rgba(36,28,24,0.28), 0 4px 12px -2px rgba(0,0,0,0.1)' }}
          >
            <div className="w-full overflow-hidden" style={{ aspectRatio: '4/5' }}>
              <img
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=700&q=80"
                alt="Quá trình xây dựng Đồi Bông Gòn"
                className="w-full h-full object-cover filter contrast-[1.05] saturate-90"
                loading="lazy"
              />
            </div>
            <p className="mt-2 text-center text-[10px] text-[#5C4E43] tracking-widest uppercase font-mono">
              Xây dựng · Mộc bản địa
            </p>
          </div>
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C4572E] text-white text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rotate-1"
            style={{ zIndex: 13 }}
          >
            2022
          </div>
        </div>

        {/* POLAROID 2: giữa-phải, nghiêng +3°, che nhẹ dòng "ĐƯỢC GHI NHỚ" */}
        <div
          className="absolute"
          style={{
            top: '38%',
            right: '20%',
            width: 'clamp(170px, 16vw, 230px)',
            transform: 'rotate(3deg)',
            zIndex: 14,
          }}
        >
          <div
            className="bg-[#FAF8F5] p-3 pb-7 shadow-2xl"
            style={{ boxShadow: '0 16px 48px -6px rgba(36,28,24,0.22), 0 4px 10px -2px rgba(0,0,0,0.08)' }}
          >
            <div className="w-full overflow-hidden" style={{ aspectRatio: '1/1' }}>
              <img
                src="https://images.unsplash.com/photo-1609766857166-0e81b5a5e6c2?auto=format&fit=crop&w=600&q=80"
                alt="Không gian mộc mạc ngoài trời"
                className="w-full h-full object-cover filter saturate-[0.9]"
                loading="lazy"
              />
            </div>
            <div className="mt-2 px-1">
              <p className="text-[10px] italic text-[#241C18] leading-snug">
                "An yên không tìm đâu xa, chỉ cần tìm đúng chỗ."
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80"
                  alt="Hoàng Nam"
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="text-[9px] text-[#8C7A70] font-semibold font-mono uppercase tracking-wider">
                  Hoàng Nam · HCM
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* POLAROID 3: dưới-phải, nghiêng -3° */}
        <div
          className="absolute"
          style={{
            bottom: '10%',
            right: '5%',
            width: 'clamp(190px, 18vw, 260px)',
            transform: 'rotate(-3deg)',
            zIndex: 15,
          }}
        >
          <div
            className="bg-white p-3 pb-7 shadow-2xl"
            style={{ boxShadow: '0 20px 55px -8px rgba(36,28,24,0.30), 0 4px 12px -2px rgba(0,0,0,0.1)' }}
          >
            <div className="w-full overflow-hidden" style={{ aspectRatio: '5/4' }}>
              <img
                src="https://images.unsplash.com/photo-1562778612-e1e0cda9915c?auto=format&fit=crop&w=700&q=80"
                alt="Cảnh quan đồi núi hoang sơ"
                className="w-full h-full object-cover filter contrast-[1.02]"
                loading="lazy"
              />
            </div>
            <div className="mt-2 px-1">
              <p className="text-[10px] italic text-[#241C18] leading-snug">
                "View từ phòng nhìn ra triền đồi — đẹp không kém resort 5 sao."
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 border-t border-[#EEE8DF] pt-1.5">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"
                  alt="Minh Anh"
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="text-[9px] text-[#8C7A70] font-semibold font-mono uppercase tracking-wider">
                  Minh Anh · Hà Nội
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* POLAROID 4 (nhỏ, tạo chiều sâu): trên-giữa phải */}
        <div
          className="absolute hidden lg:block"
          style={{
            top: '5%',
            right: '24%',
            width: 'clamp(110px, 10vw, 150px)',
            transform: 'rotate(8deg)',
            zIndex: 11,
            opacity: 0.8,
          }}
        >
          <div
            className="bg-[#F5F0E8] p-2 pb-5"
            style={{ boxShadow: '0 8px 30px -4px rgba(36,28,24,0.18)' }}
          >
            <div className="w-full overflow-hidden" style={{ aspectRatio: '1/1' }}>
              <img
                src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=400&q=70"
                alt="Bầu trời và thiên nhiên"
                className="w-full h-full object-cover filter saturate-75 sepia-[0.15]"
                loading="lazy"
              />
            </div>
          </div>
        </div>

      </div>

      {/* ── Dây kẻ ngang trang trí ── */}
      <div className="absolute bottom-12 left-8 right-8 h-px bg-[#C9BFB2]/40 z-0 pointer-events-none hidden md:block" />

    </section>
  );
};
