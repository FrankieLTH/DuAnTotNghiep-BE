import React, { useState } from 'react';

interface HighlightPlacesSectionProps {
  onExploreMore?: () => void;
}

export const HighlightPlacesSection: React.FC<HighlightPlacesSectionProps> = ({ onExploreMore }) => {
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'Tất cả' },
    { id: 'beach', label: 'Bãi biển' },
    { id: 'nature', label: 'Thiên nhiên' },
    { id: 'checkin', label: 'Điểm ngắm cảnh' },
    { id: 'culture', label: 'Văn hóa bản địa' },
  ];

  const places = [
    {
      id: 1,
      title: 'Bãi Trước',
      category: 'beach',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 2,
      title: 'Mũi Nghinh Phong',
      category: 'beach',
      image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 3,
      title: 'Bãi Sau',
      category: 'beach',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 4,
      title: 'Đảo Hòn Bà',
      category: 'nature',
      image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 5,
      title: 'Đồi Con Heo',
      category: 'nature',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 6,
      title: 'Hồ Mây Park',
      category: 'nature',
      image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 7,
      title: 'Rừng Nguyên Sinh',
      category: 'nature',
      image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 8,
      title: 'Bến Thuyền Marina',
      category: 'checkin',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 9,
      title: 'Bãi Rạng Ghềnh Đá',
      category: 'beach',
      image: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 10,
      title: 'Phòng Trà View Đồi',
      category: 'checkin',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 11,
      title: 'Ngắm Sao Núi Nhỏ',
      category: 'culture',
      image: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 12,
      title: 'Hoàng Hôn Biển Vàng',
      category: 'beach',
      image: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const filteredPlaces =
    activeCategory === 'all'
      ? places
      : places.filter((p) => p.category === activeCategory);

  return (
    <section className="py-20 md:py-28 px-4 max-w-7xl mx-auto font-sans">
      {/* Tiêu đề & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#9E472A] block mb-2">
            Hành trình khám phá
          </span>
          <h2 className="font-serif font-bold text-3xl sm:text-4xl text-[#1E1B18] tracking-wide">
            Địa điểm nổi bật quanh Homestay
          </h2>
        </div>
        <button
          onClick={onExploreMore}
          className="inline-flex items-center gap-2 border border-[#1E1B18] text-[#1E1B18] hover:bg-[#1E1B18] hover:text-white px-5 py-2 rounded-lg text-xs font-semibold tracking-wider transition-colors self-start sm:self-auto cursor-pointer"
        >
          <span>Xem bản đồ chi tiết</span>
          <span>→</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
              activeCategory === cat.id
                ? 'bg-[#1E1B18] text-white border-[#1E1B18]'
                : 'bg-white text-[#736B63] hover:text-[#1E1B18] border-[#E8E3DA]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid 12 ảnh */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredPlaces.map((place) => (
          <div
            key={place.id}
            className="group relative rounded-xl overflow-hidden aspect-[4/3] shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer"
          >
            <img
              src={place.image}
              alt={place.title}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent pointer-events-none" />

            <div className="absolute bottom-0 left-0 right-0 p-3.5 text-white">
              <h3 className="font-serif font-bold text-sm sm:text-base text-white group-hover:text-amber-200 transition-colors">
                {place.title}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
