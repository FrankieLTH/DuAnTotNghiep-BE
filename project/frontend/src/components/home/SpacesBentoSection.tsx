import React from 'react';

interface SpacesBentoSectionProps {
  onExplore?: () => void;
}

export const SpacesBentoSection: React.FC<SpacesBentoSectionProps> = ({ onExplore }) => {
  return (
    <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans relative">
      {/* Ảnh nền texture kiến trúc nhẹ phía sau section */}
      <div className="absolute inset-0 -mx-4 sm:-mx-8 rounded-3xl overflow-hidden pointer-events-none opacity-40">
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80"
          alt="Cảm hứng kiến trúc Đồi Bông Gòn"
          className="w-full h-full object-cover filter blur-md"
        />
        <div className="absolute inset-0 bg-[#FAF6F0]/85" />
      </div>

      <div className="relative z-10">
        {/* Tiêu đề & Nút khám phá */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 md:mb-12 gap-4 pb-4 border-b border-[#E8E2D8]">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#C4572E] block mb-2">
              Cảm hứng kiến trúc & Không gian
            </span>
            <h2 className="font-serif font-bold text-2xl sm:text-3xl md:text-4xl text-[#241C18] tracking-tight">
              Nghệ thuật lưu trú giữa thiên nhiên
            </h2>
          </div>
          <button
            onClick={onExplore}
            className="inline-flex items-center gap-2 border border-[#241C18] text-[#241C18] hover:bg-[#241C18] hover:text-white px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider transition-colors self-start sm:self-auto cursor-pointer"
          >
            <span>Khám phá 6 hạng phòng</span>
            <span>→</span>
          </button>
        </div>

        {/* Bento Grid hình ảnh */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[500px]">
          {/* Khối lớn bên trái (md:col-span-7) */}
          <div
            onClick={onExplore}
            className="md:col-span-7 relative rounded-3xl overflow-hidden shadow-sm group cursor-pointer min-h-[360px] md:min-h-full border border-[#E8E2D8]"
          >
            <img
              src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80"
              alt="Studio Nghỉ Dưỡng Riêng Tư"
              className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-[#F4BE9B] font-mono font-semibold block">
                ★ BOUTIQUE SANCTUARY
              </span>
              <h3 className="font-serif font-bold text-xl sm:text-2xl text-white">
                Sunset Penthouse & Jacuzzi 270°
              </h3>
              <p className="text-xs text-white/80 max-w-lg font-light leading-relaxed">
                Tầng cao ngắm trọn hoàng hôn biển Vũng Tàu, trang bị bồn sục Jacuzzi ngoài trời và ban công mộc mạc.
              </p>
            </div>
          </div>

          {/* Khối bên phải (md:col-span-5) */}
          <div className="md:col-span-5 flex flex-col gap-5">
            {/* Thẻ trên */}
            <div
              onClick={onExplore}
              className="flex-1 relative rounded-3xl overflow-hidden shadow-sm group cursor-pointer min-h-[200px] border border-[#E8E2D8]"
            >
              <img
                src="https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80"
                alt="Hillside Studio & Workspace"
                className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 text-white space-y-1">
                <span className="text-[10px] uppercase tracking-widest text-[#F4BE9B] font-mono font-semibold block">
                  LÀM VIỆC & NGHỈ DƯỠNG
                </span>
                <h4 className="font-serif font-bold text-base sm:text-lg text-white">
                  Hillside Studio & Workspace
                </h4>
                <p className="text-[11px] text-white/80 font-light">
                  Bàn làm việc gỗ sồi nhìn ra triền núi, Wi-Fi 100Mbps cùng ánh sáng tự nhiên lý tưởng.
                </p>
              </div>
            </div>

            {/* Thẻ dưới */}
            <div
              onClick={onExplore}
              className="flex-1 relative rounded-3xl overflow-hidden shadow-sm group cursor-pointer min-h-[200px] border border-[#E8E2D8]"
            >
              <img
                src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80"
                alt="The Cotton Cloud Suite"
                className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 text-white space-y-1">
                <span className="text-[10px] uppercase tracking-widest text-[#F4BE9B] font-mono font-semibold block">
                  FAVORITE COUPLES
                </span>
                <h4 className="font-serif font-bold text-base sm:text-lg text-white">
                  The Cotton Cloud Suite
                </h4>
                <p className="text-[11px] text-white/80 font-light">
                  Bồn tắm ngâm thảo dược view ban công ngắm sao trời, giường nệm êm ái cho kỳ nghỉ ngọt ngào.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};