import React, { useState } from 'react';

interface LocationsPageProps {
  onGoHome: () => void;
  onSelectBranchRooms?: (branch: string) => void;
}

const LOCATIONS_DATA = [
  {
    id: 1,
    branchKey: 'hai-dang',
    title: 'Ngọn Hải Đăng Vũng Tàu',
    branch: 'CN1 · Hải Đăng',
    distance: 'Gần homestay',
    tag: 'NGẮM TOÀN CẢNH BIỂN',
    imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    branchKey: 'hai-dang',
    title: 'Tượng Chúa Kitô Vua · Núi Nhỏ',
    branch: 'CN1 · Hải Đăng',
    distance: 'Khu vực Núi Nhỏ',
    tag: 'ĐIỂM THAM QUAN',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    branchKey: 'thien-mon',
    title: 'Bãi Trước · Công viên Bãi Trước',
    branch: 'CN1 · Thiền Môn',
    distance: 'Khu vực Bãi Trước',
    tag: 'DẠO BIỂN & NGẮM HOÀNG HÔN',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 4,
    branchKey: 'thien-mon',
    title: 'Bãi Dâu & Thích Ca Phật Đài',
    branch: 'CN1 · Thiền Môn',
    distance: 'Khu vực Bãi Dâu',
    tag: 'VĂN HÓA & BIỂN',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 5,
    branchKey: 'retreat',
    title: 'Bạch Dinh',
    branch: 'CN2 · Triền Núi',
    distance: 'Khu vực Núi Lớn',
    tag: 'DI TÍCH & KIẾN TRÚC',
    imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 6,
    branchKey: 'retreat',
    title: 'Đường Vi Ba · cung đường Núi Lớn',
    branch: 'CN2 · Triền Núi',
    distance: 'Khu vực Núi Lớn',
    tag: 'KHÁM PHÁ THIÊN NHIÊN',
    imageUrl: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80',
  },
];

export const LocationsPage: React.FC<LocationsPageProps> = ({ onGoHome, onSelectBranchRooms }) => {
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');

  const filteredLocations = LOCATIONS_DATA.filter((item) => {
    if (selectedBranchFilter !== 'all' && item.branchKey !== selectedBranchFilter) return false;
    return true;
  });

  return (
    <div className="bg-[#FAF7F2] min-h-screen pb-16 font-sans">
      {/* Header section */}
      <div className="bg-[#FAF7F2] border-b border-secondary-sand/70 pt-6 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center text-xs font-sans text-brand-earth/60 space-x-2 mb-4">
            <button onClick={onGoHome} className="hover:text-brand-terracotta">Trang chủ</button>
            <span>/</span>
            <span className="text-brand-earth font-semibold">Địa điểm nổi bật</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold tracking-widest uppercase text-brand-terracotta bg-brand-tint px-3 py-1 rounded-full inline-block mb-2">
                ĐỒI BÔNG GÒN · VŨNG TÀU
              </span>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-brand-earth">
                Khám Phá Địa Điểm Nổi Bật Quanh Homestay
              </h1>
              <p className="text-sm font-sans text-brand-earth/80 mt-2 max-w-2xl leading-relaxed">
                Gợi ý các điểm tham quan, bãi biển và cung đường khám phá quanh các cơ sở Đồi Bông Gòn tại Vũng Tàu.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-secondary-sand shrink-0">
              <button
                onClick={() => setSelectedBranchFilter('all')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  selectedBranchFilter === 'all'
                    ? 'bg-brand-earth text-white shadow-xs'
                    : 'text-brand-earth/80 hover:bg-secondary-cream'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setSelectedBranchFilter('hai-dang')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  selectedBranchFilter === 'hai-dang'
                    ? 'bg-brand-earth text-white shadow-xs'
                    : 'text-brand-earth/80 hover:bg-secondary-cream'
                }`}
              >
                CN1 · Hải Đăng
              </button>
              <button
                onClick={() => setSelectedBranchFilter('thien-mon')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  selectedBranchFilter === 'thien-mon'
                    ? 'bg-brand-earth text-white shadow-xs'
                    : 'text-brand-earth/80 hover:bg-secondary-cream'
                }`}
              >
                CN1 · Thiền Môn
              </button>
              <button
                onClick={() => setSelectedBranchFilter('retreat')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  selectedBranchFilter === 'retreat'
                    ? 'bg-brand-earth text-white shadow-xs'
                    : 'text-brand-earth/80 hover:bg-secondary-cream'
                }`}
              >
                CN2 · Triền Núi
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredLocations.map((loc) => (
            <div
              key={loc.id}
              className="bg-white rounded-2xl border border-secondary-sand overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 group flex flex-col justify-between"
            >
              <div className="relative h-56 bg-brand-earth overflow-hidden">
                <img
                  src={loc.imageUrl}
                  alt={loc.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-earth/90 via-black/20 to-transparent" />

                <div className="absolute top-3 left-3">
                  <span className="text-[10px] font-bold text-brand-amber bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-md tracking-wider">
                    {loc.tag}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[10px] font-sans text-secondary-sand/90 block">
                    📍 {loc.branch}
                  </span>
                  <h3 className="text-base font-serif font-bold text-white mt-0.5 group-hover:text-brand-amber transition-colors">
                    {loc.title}
                  </h3>
                </div>
              </div>

              <div className="p-3 bg-secondary-cream/50 flex items-center justify-between text-xs text-brand-earth/80">
                <span>Cách homestay:</span>
                <strong className="text-brand-terracotta font-mono font-bold">{loc.distance}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
