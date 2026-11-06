import React from 'react';

interface ArtIntroSectionProps {
  onExploreRooms?: () => void;
}

export const ArtIntroSection: React.FC<ArtIntroSectionProps> = ({ onExploreRooms }) => {
  return (
    <section className="py-16 md:py-24 bg-[#FAF6F0] text-[#1E1B18] px-4 sm:px-6 lg:px-8 border-b border-[#E8E2D8] font-sans overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* CỘT TRÁI: TIÊU ĐỀ LỚN 2 SẮC THÁI & 2 NÚT PILL (lg:col-span-6) */}
          <div className="lg:col-span-6 space-y-6">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08]">
              <span className="text-[#1E1B18] block">Chốn an trú mộc mạc.</span>
              <span className="text-[#8C7A70] block">Tự do trọn vẹn.</span>
            </h2>

            <p className="text-sm sm:text-base text-[#6E6359] leading-relaxed max-w-xl font-normal">
              Tọa lạc bên triền đồi ngắm hoàng hôn Vũng Tàu, Đồi Bông Gòn kết hợp không gian lưu trú mộc bản địa và công nghệ tự check-in thông minh qua mã PIN 24/7. Trải nghiệm nghỉ dưỡng riêng tư, thư thái và hoàn toàn không vướng bận lễ tân.
            </p>

            {/* 2 Nút CTA bo tròn Pill */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={onExploreRooms}
                className="inline-flex items-center gap-2 bg-[#C4572E] hover:bg-[#A83D1E] text-white px-6 py-3 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span>Khám phá phòng nghỉ</span>
                <span>→</span>
              </button>

              <button
                onClick={onExploreRooms}
                className="inline-flex items-center gap-2 bg-white hover:bg-[#FAF6F0] text-[#1E1B18] border border-[#DCD6CC] px-6 py-3 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <span>Không gian lưu trú</span>
              </button>
            </div>
          </div>

          {/* CỘT PHẢI: KHÔNG GIAN 3D CÓ CHIỀU SÂU VỚI CÁC CỘT ẢNH GHÉP THỰC TẾ (lg:col-span-6) */}
          <div
            className="lg:col-span-6 relative flex items-center justify-center min-h-[420px] sm:min-h-[480px] select-none"
            style={{ perspective: '1200px' }}
          >
            {/* Lớp bóng đổ ambient nền */}
            <div className="absolute inset-0 bg-radial from-[#C4572E]/10 via-transparent to-transparent blur-3xl pointer-events-none" />

            {/* CỘT 1 (PHÍA SAU BÊN TRÁI): CARD 3D — CHỈ ẢNH */}
            <div
              className="absolute top-0 left-0 sm:left-4 w-60 sm:w-72 rounded-2xl overflow-hidden transition-transform duration-700 hover:scale-105"
              style={{
                transform: 'rotateY(-12deg) rotateX(6deg) rotateZ(-3deg) translateZ(-30px)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                aspectRatio: '4/3',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=700&q=80"
                alt="Không gian phòng mộc"
                className="w-full h-full object-cover"
              />
            </div>

            {/* CỘT 2 (PHÍA SAU BÊN PHẢI): CARD ĐỨNG 3D — CHỈ ẢNH */}
            <div
              className="absolute top-4 right-0 sm:right-4 w-52 sm:w-64 rounded-2xl overflow-hidden transition-transform duration-700 hover:scale-105"
              style={{
                transform: 'rotateY(14deg) rotateX(6deg) rotateZ(4deg) translateZ(-10px)',
                boxShadow: '0 25px 45px -10px rgba(0, 0, 0, 0.2)',
                aspectRatio: '3/4',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80"
                alt="Ban công ngắm biển"
                className="w-full h-full object-cover"
              />
            </div>

            {/* CARD 3 (GIỮA-TRƯỚC): ẢNH THUẦN NỔI 3D */}
            <div
              className="relative z-20 w-44 sm:w-52 rounded-2xl overflow-hidden transition-transform duration-500 hover:scale-105"
              style={{
                transform: 'translateZ(50px) rotateX(-2deg)',
                boxShadow: '0 30px 60px -15px rgba(36, 28, 24, 0.35)',
                aspectRatio: '3/4',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80"
                alt="Hammock thiên nhiên"
                className="w-full h-full object-cover"
              />
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};