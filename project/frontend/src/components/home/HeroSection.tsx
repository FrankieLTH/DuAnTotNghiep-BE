import React from 'react';
import { SearchBookingBar } from './SearchBookingBar';
import { SearchParams } from '../../services/dataService';

interface HeroSectionProps {
  onSearch?: (params: SearchParams) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSearch }) => {
  return (
    <section className="relative w-full min-h-[90vh] flex flex-col justify-between pt-28 pb-12">
      {/* Background Image với lớp phủ kiến trúc ấm áp */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2000&q=85"
          alt="Không gian Đồi Bông Gòn Homestay"
          className="w-full h-full object-cover object-center filter brightness-[0.82]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-[#1A1615]/85 pointer-events-none" />
      </div>

      {/* Nội dung tiêu đề chính */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 text-center my-auto pt-6 pb-8">
        <div className="inline-flex items-center gap-2 mb-4 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/15 text-white/90 text-xs font-sans tracking-widest uppercase">
          <span>Khu Nghỉ Dưỡng Mộc & Tự Động Hóa 24/7</span>
        </div>

        <h1 className="font-serif font-bold text-4xl sm:text-6xl md:text-7xl text-white tracking-wide leading-tight drop-shadow-md">
          Đồi Bông Gòn
        </h1>

        <p className="mt-4 font-sans text-sm sm:text-base text-white/90 font-light max-w-xl mx-auto leading-relaxed">
          Không gian lưu trú thư thái giữa lòng phố thị. Tự do nhận phòng tự động với hệ thống khoá thông minh TTLock.
        </p>
      </div>

      {/* Thanh Tìm kiếm & Đặt phòng */}
      <div className="relative z-30 w-full">
        <SearchBookingBar onSearch={onSearch} />
      </div>
    </section>
  );
};
