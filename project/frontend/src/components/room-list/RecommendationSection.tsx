import React, { useState, useEffect } from 'react';
import {
  SearchCriteria,
  Recommendation,
  getRoomRecommendations,
} from '../../services/dataService';

// Inline SVG Icons (no external icon package required)
const IconSparkles = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);
const IconTag = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);
const IconMaximize = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);
const IconAlertCircle = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconArrowRight = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);
const IconCheck = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);
const IconBuilding = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);
const IconUsers = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

interface RecommendationSectionProps {
  criteria: SearchCriteria;
  onSelectRecommendation: (rec: Recommendation) => void;
}

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  criteria,
  onSelectRecommendation,
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(false);

    const timer = setTimeout(async () => {
      try {
        const results = await getRoomRecommendations(criteria);
        if (!isCancelled) {
          setRecommendations(results);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load recommendations:', err);
          setError(true);
          setLoading(false);
        }
      }
    }, 300); // Debounce 300ms

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [
    criteria.apartmentId,
    criteria.checkIn,
    criteria.checkOut,
    criteria.stayType,
    criteria.adults,
    criteria.children,
    criteria.rooms,
  ]);

  // Nếu lỗi hoặc rỗng thì ẩn cả khối, không cản trở danh sách chính
  if (!loading && (error || recommendations.length === 0)) {
    return null;
  }

  // Định dạng nhãn và huy hiệu
  const renderBadge = (label: Recommendation['label']) => {
    switch (label) {
      case 'best_match':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#B4532A] text-white shadow-xs">
            <IconSparkles className="w-3.5 h-3.5 text-amber-200" />
            Phù hợp nhất
          </span>
        );
      case 'cheapest':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-700 text-white shadow-xs">
            <IconTag className="w-3.5 h-3.5 text-emerald-200" />
            Tiết kiệm nhất
          </span>
        );
      case 'most_comfortable':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-700 text-white shadow-xs">
            <IconMaximize className="w-3.5 h-3.5 text-indigo-200" />
            Rộng rãi &amp; Thoải mái
          </span>
        );
      case 'alternative':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-700 text-white shadow-xs">
            <IconAlertCircle className="w-3.5 h-3.5 text-purple-200" />
            Gợi ý thay thế
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
      {/* Tiêu đề khối gợi ý */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 pb-3 border-b border-[#E8E2D8] gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F4EBE1] flex items-center justify-center text-[#B4532A]">
            <IconSparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#241C18]">
              Gợi ý tối ưu cho chuyến đi của bạn
            </h2>
            <p className="text-xs text-[#73665C]">
              Đề xuất thông minh theo tiêu chí đoàn ({criteria.adults} người lớn
              {criteria.children > 0 ? `, ${criteria.children} trẻ em` : ''} • {criteria.rooms} phòng)
            </p>
          </div>
        </div>

        {recommendations.length > 0 && !loading && (
          <span className="text-[11px] font-medium text-[#73665C] bg-white px-3 py-1 rounded-full border border-[#E8E2D8] self-start sm:self-auto">
            {recommendations.length} phương án được chọn lọc
          </span>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-4 border border-[#E8E2D8] shadow-xs animate-pulse space-y-4"
            >
              <div className="h-44 bg-neutral-200 rounded-xl" />
              <div className="h-5 bg-neutral-200 rounded-md w-3/4" />
              <div className="space-y-2">
                <div className="h-3.5 bg-neutral-100 rounded-md w-full" />
                <div className="h-3.5 bg-neutral-100 rounded-md w-5/6" />
              </div>
              <div className="h-10 bg-neutral-200 rounded-xl mt-4" />
            </div>
          ))}
        </div>
      ) : (
        /* Danh sách thẻ Recommendation */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recommendations.map((rec) => {
            const primaryItem = rec.items[0];
            const displayImage =
              primaryItem?.image ||
              'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80';

            return (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-[#E8E2D8] hover:border-[#B4532A] shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group"
              >
                {/* Ảnh chính & Badge góc trên */}
                <div className="relative h-48 w-full overflow-hidden bg-neutral-100">
                  <img
                    src={displayImage}
                    alt={primaryItem?.name || 'Phòng nghỉ'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 z-10">
                    {renderBadge(rec.label)}
                  </div>
                  {rec.score > 0 && (
                    <div className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                      ★ {rec.score} đ
                    </div>
                  )}

                  {/* Lớp phủ chân ảnh hiển thị số phòng & sức chứa */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-6 flex items-center justify-between text-white text-xs">
                    <span className="font-semibold flex items-center gap-1.5">
                      <IconBuilding className="w-3.5 h-3.5 text-amber-200" />
                      {rec.totalRooms} phòng
                    </span>
                    <span className="flex items-center gap-1 text-neutral-200">
                      <IconUsers className="w-3.5 h-3.5" />
                      Tối đa {rec.totalCapacity} khách
                    </span>
                  </div>
                </div>

                {/* Nội dung chi tiết */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Tên các loại phòng trong phương án */}
                    <div className="space-y-1">
                      {rec.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm font-bold text-[#241C18]"
                        >
                          <span className="truncate pr-2">{item.name}</span>
                          <span className="text-[#B4532A] whitespace-nowrap text-xs bg-[#FBF3E8] px-2 py-0.5 rounded-md font-mono">
                            × {item.quantity} phòng
                          </span>
                        </div>
                      ))}
                      {rec.items.some(item => item.features?.length) && <div className="text-xs text-[#795341] space-y-1">{rec.items.flatMap(item => item.features || []).map(feature => <div key={feature.id}>{feature.name}{feature.extra_price_per_night > 0 ? ` · +${Number(feature.extra_price_per_night).toLocaleString('vi-VN')}đ/đêm` : ' · Đã bao gồm'}</div>)}</div>}
                    </div>

                    {/* Ghi chú điều kiện nới lỏng (relaxed condition) */}
                    {rec.relaxed && (
                      <div className="bg-purple-50 border border-purple-200 text-purple-900 rounded-xl p-2.5 text-xs flex items-start gap-2">
                        <IconAlertCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">Điều kiện thay thế:</span>
                          <span className="text-purple-700">{rec.relaxed.note}</span>
                        </div>
                      </div>
                    )}

                    {/* Danh sách lý do thuyết phục từ sự thật */}
                    <div className="space-y-1.5 pt-1">
                      {rec.reasons.map((reason, rIdx) => (
                        <div
                          key={rIdx}
                          className="flex items-center gap-2 text-xs text-[#52443C]"
                        >
                          <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <IconCheck className="w-2.5 h-2.5 text-emerald-700" />
                          </div>
                          <span className="line-clamp-1">{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Giá & Nút Đặt ngay */}
                  <div className="pt-3 border-t border-[#F0EBE1] flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-[#73665C] block">
                        Tổng cộng {rec.totalRooms} phòng
                      </span>
                      <span className="text-lg font-bold text-[#B4532A]">
                        {rec.totalPrice.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectRecommendation(rec)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#241C18] hover:bg-[#B4532A] text-white text-xs font-bold transition-all shadow-xs cursor-pointer group-hover:bg-[#B4532A]"
                    >
                      Đặt ngay
                      <IconArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
