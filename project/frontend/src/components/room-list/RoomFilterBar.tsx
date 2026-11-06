import React from 'react';

interface RoomFilterBarProps {
  selectedBookingType: string;
  setSelectedBookingType: (type: string) => void;
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  priceRange: string;
  setPriceRange: (range: string) => void;
}

export const RoomFilterBar: React.FC<RoomFilterBarProps> = ({
  selectedBookingType,
  setSelectedBookingType,
  selectedBranch,
  setSelectedBranch,
  priceRange,
  setPriceRange,
}) => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-secondary-sand shadow-xs mb-8 space-y-4 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-secondary-sand/50 pb-4">
        {/* Booking Type Selector */}
        <div className="flex items-center gap-2 bg-secondary-cream p-1.5 rounded-xl border border-secondary-sand">
          <button
            onClick={() => setSelectedBookingType('overnight')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              selectedBookingType === 'overnight'
                ? 'bg-brand-earth text-white shadow-xs'
                : 'text-brand-earth/80 hover:bg-white/60'
            }`}
          >
            🌙 Thuê Theo Đêm
          </button>
          <button
            onClick={() => setSelectedBookingType('hourly')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              selectedBookingType === 'hourly'
                ? 'bg-brand-earth text-white shadow-xs'
                : 'text-brand-earth/80 hover:bg-white/60'
            }`}
          >
            ⏱️ Thuê Theo Giờ (3h)
          </button>
          <button
            onClick={() => setSelectedBookingType('longstay')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              selectedBookingType === 'longstay'
                ? 'bg-brand-earth text-white shadow-xs'
                : 'text-brand-earth/80 hover:bg-white/60'
            }`}
          >
            🏡 Thuê Dài Hạn
          </button>
        </div>

        {/* Branch Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-brand-earth/70">Chi nhánh:</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-secondary-cream border border-secondary-sand text-brand-earth text-xs font-medium rounded-xl px-3 py-2 outline-none focus:border-brand-terracotta"
          >
            <option value="all">Tất cả chi nhánh</option>
            <option value="Triển Núi">CN 1 - Triển Núi Nhỏ</option>
            <option value="Hải Đăng">CN 2 - Lưng Chừng Biển Hải Đăng</option>
          </select>
        </div>
      </div>

      {/* Price Range Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-brand-earth/70 mr-2">Khoảng giá:</span>
        <button
          onClick={() => setPriceRange('all')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all ${
            priceRange === 'all'
              ? 'bg-brand-terracotta text-white shadow-xs font-semibold'
              : 'bg-secondary-cream border border-secondary-sand text-brand-earth hover:bg-secondary-sand'
          }`}
        >
          Tất cả mức giá
        </button>
        <button
          onClick={() => setPriceRange('under800')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all ${
            priceRange === 'under800'
              ? 'bg-brand-terracotta text-white shadow-xs font-semibold'
              : 'bg-secondary-cream border border-secondary-sand text-brand-earth hover:bg-secondary-sand'
          }`}
        >
          Dưới 800k / đêm
        </button>
        <button
          onClick={() => setPriceRange('800to1200')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all ${
            priceRange === '800to1200'
              ? 'bg-brand-terracotta text-white shadow-xs font-semibold'
              : 'bg-secondary-cream border border-secondary-sand text-brand-earth hover:bg-secondary-sand'
          }`}
        >
          800k - 1.2M / đêm
        </button>
        <button
          onClick={() => setPriceRange('over1200')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all ${
            priceRange === 'over1200'
              ? 'bg-brand-terracotta text-white shadow-xs font-semibold'
              : 'bg-secondary-cream border border-secondary-sand text-brand-earth hover:bg-secondary-sand'
          }`}
        >
          Trên 1.2M / đêm
        </button>
      </div>
    </div>
  );
};
