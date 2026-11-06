import React from 'react';
import { Button } from './Button';
import { Badge } from './Badge';

export interface RoomCardProps {
  id?: number;
  title?: string;
  area?: string;
  description?: string;
  branch?: string;
  badgeText?: string;
  imageUrl?: string;
  occupancy?: string;
  bedType?: string;
  breakfast?: string;
  oldPrice?: string;
  price?: string;
  onBookNow?: (id?: number) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  id = 1,
  title = 'Phòng Attic Sunset Balcony',
  area = '28m²',
  description = 'Gác lửng kính ngắm hoàng hôn Bãi Trước, bồn tắm gỗ tràm mộc mạc và minibar miễn phí.',
  branch = 'Chi nhánh Triển Núi',
  badgeText = 'View Biển & Núi',
  imageUrl = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
  occupancy = '2 Khách',
  bedType = 'Giường King',
  breakfast = 'Bữa sáng nhẹ',
  oldPrice = '950.000đ',
  price = '790.000đ',
  onBookNow,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-secondary-sand overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 grid grid-cols-1 md:grid-cols-12">
      {/* Cột trái: Hình ảnh phòng & Badge */}
      <div className="md:col-span-5 relative min-h-[220px] bg-brand-earth overflow-hidden flex flex-col justify-between p-4 text-white">
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover opacity-80 hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-earth/90 via-brand-earth/30 to-black/20 pointer-events-none" />

        {/* Top Badge */}
        <div className="relative z-10">
          <Badge variant="smartpin" icon="🌅">
            {badgeText}
          </Badge>
        </div>

        {/* Center overlay label */}
        <div className="relative z-10 text-center py-6">
          <span className="text-2xl font-serif font-bold text-white drop-shadow-md tracking-wide block">
            PHÒNG MÂY GẮC MÁI
          </span>
          <span className="text-xs font-sans text-secondary-sand/90 tracking-wider uppercase block mt-1">
            {branch}
          </span>
        </div>
      </div>

      {/* Cột phải: Thông tin chi tiết & Đặt phòng */}
      <div className="md:col-span-7 p-6 flex flex-col justify-between">
        <div>
          {/* Header & Đơn vị diện tích */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-heading-3 hover:text-brand-terracotta transition-colors">
              {title}
            </h3>
            <span className="text-xs font-bold font-sans text-brand-earth/60 bg-secondary-sand/50 px-2.5 py-1 rounded-md">
              {area}
            </span>
          </div>

          {/* Mô tả mộc mạc */}
          <p className="text-sm text-brand-earth/80 font-sans mb-4 leading-relaxed line-clamp-2">
            {description}
          </p>

          {/* Icon Tiện ích chính */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-brand-earth/80 mb-6 bg-secondary-cream p-3 rounded-xl border border-secondary-sand/60">
            <span className="inline-flex items-center gap-1.5">
              👥 {occupancy}
            </span>
            <span className="inline-flex items-center gap-1.5">
              🛏️ {bedType}
            </span>
            <span className="inline-flex items-center gap-1.5">
              ☕ {breakfast}
            </span>
          </div>
        </div>

        {/* Giá phòng & Nút CTA */}
        <div className="flex items-end justify-between gap-4 pt-4 border-t border-secondary-sand/50">
          <div>
            {oldPrice && (
              <span className="text-xs font-sans text-brand-earth/50 line-through block">
                {oldPrice}
              </span>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-sans font-bold text-brand-terracotta">
                {price}
              </span>
              <span className="text-xs font-sans text-brand-earth/70 font-medium">
                /đêm
              </span>
            </div>
          </div>

          <Button
            variant="dark"
            size="md"
            onClick={() => onBookNow && onBookNow(id)}
          >
            Giữ Phòng
          </Button>
        </div>
      </div>
    </div>
  );
};
