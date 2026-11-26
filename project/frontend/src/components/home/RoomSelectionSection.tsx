import React, { useEffect, useState } from 'react';
import { getRooms, getApartments, RoomItem, ApartmentItem } from '../../services/dataService';

interface RoomSelectionSectionProps {
  onSelectRoom?: (roomId: number) => void;
}

export const RoomSelectionSection: React.FC<RoomSelectionSectionProps> = ({ onSelectRoom }) => {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [apartments, setApartments] = useState<ApartmentItem[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState(false);

  // 6 Hạng phòng mẫu chuẩn bộ nhận diện như trang danh sách phòng
  // Mỗi thẻ đại diện cho một loại phòng đang có trong database.
  const visibleRooms = rooms.filter(room =>
    room.status !== 'inactive' &&
    (selectedApartmentId === 'all' || room.apartment_id === selectedApartmentId)
  );
  const featuredRooms = [...new Map(visibleRooms.sort((a,b)=>b.base_price-a.base_price).map(room => [`${room.apartment_id}:${room.room_type_parent_id || room.room_type_id}`, room])).values()]
    .sort((a, b) => a.apartment_id - b.apartment_id || a.room_type_id - b.room_type_id)
    .map(room => ({
      id: room.id,
      name: room.room_type_parent_name || room.room_type_name,
      branch: room.apartment_name,
      badge: 'LOẠI PHÒNG',
      subBadge: room.bed_type,
      footerTag: 'Chọn ngày và biến thể ở trang chi tiết',
      badgePhotos: 'Ảnh minh họa',
      description: room.description,
      bed: room.bed_type,
      guests: 'Tối đa ' + room.max_occupancy + ' khách',
      special: 'Xem biến thể và ngày trống',
      area: room.area,
      price: Number(room.base_type_price ?? room.base_price),
      image: room.images[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    }));

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setLoadError(false);
        const [roomsData, aptData] = await Promise.all([
          getRooms(),
          getApartments(),
        ]);
        setRooms(roomsData);
        setApartments(aptData);
      } catch (e) {
        console.error('Error loading rooms:', e);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans" id="room-selection">
      {/* Tiêu đề & Giới thiệu */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b border-[#E8E2D8] gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#C4572E] block mb-1">
            BOUTIQUE SUITES &amp; HILLSIDE ROOMS
          </span>
          <h2 className="font-serif font-bold text-2xl sm:text-3xl md:text-4xl text-[#1E1B18] tracking-tight">
            Các loại phòng đang nhận đặt
          </h2>
          <p className="text-xs sm:text-sm text-[#73665C] max-w-xl mt-1.5 leading-relaxed font-normal">
            Không gian nghỉ dưỡng mộc mạc, riêng tư với hệ thống tự check-in bằng khóa thông minh TTLock 24/7.
          </p>
        </div>

        {/* Bộ lọc chi nhánh dạng tab text thanh lịch, không icon vụn vặt */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedApartmentId('all')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedApartmentId === 'all'
                ? 'bg-[#1E1B18] text-white shadow-xs'
                : 'bg-white text-[#73665C] border border-[#E8E2D8] hover:text-[#1E1B18]'
            }`}
          >
            Tất cả cơ sở
          </button>
          {apartments.map(apartment => <button
            key={apartment.id}
            onClick={() => setSelectedApartmentId(apartment.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedApartmentId === apartment.id
                ? 'bg-[#1E1B18] text-white shadow-xs'
                : 'bg-white text-[#73665C] border border-[#E8E2D8] hover:text-[#1E1B18]'
            }`}
          >{apartment.name}</button>)}
        </div>
      </div>

      {loading && <p className="text-center text-sm text-[#73665C]">Đang tải các loại phòng…</p>}
      {loadError && <p className="text-center text-sm text-[#A83232]">Chưa tải được giá phòng từ hệ thống. Vui lòng tải lại trang.</p>}
      {!loading && !loadError && !featuredRooms.length && <p className="text-center text-sm text-[#73665C]">Chưa có loại phòng ở cơ sở này.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
        {featuredRooms.map((room) => (
          <div
            key={room.id}
            className="bg-white rounded-2xl overflow-hidden border border-[#E8E2D8] hover:border-[#C4572E]/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
          >
            <div>
              {/* Ảnh phòng & Badges Text thuần túy */}
              <div onClick={() => onSelectRoom && onSelectRoom(room.id)} className="relative aspect-16/10 overflow-hidden bg-[#1E1B18] cursor-pointer">
                <img
                  src={room.image}
                  alt={room.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />

                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                  <span className="bg-white/95 backdrop-blur-xs text-[10px] font-mono font-bold text-[#1E1B18] px-2 py-0.5 rounded shadow-xs">
                    {room.badge}
                  </span>
                  <span className="bg-black/60 backdrop-blur-xs text-[9px] font-medium text-white px-2 py-0.5 rounded shadow-xs">
                    {room.subBadge}
                  </span>
                </div>

                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] text-white">
                  <span className="bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded truncate max-w-[75%] font-medium">
                    {room.footerTag}
                  </span>
                  <span className="bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded font-mono">
                    {room.badgePhotos}
                  </span>
                </div>
              </div>

              {/* Nội dung thông tin phòng */}
              <div className="p-5">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[#C4572E] font-semibold">Loại phòng</span>
                  <span className="text-[10px] uppercase font-semibold text-white bg-[#1E1B18] px-2 py-0.5 rounded font-mono">
                    {room.branch}
                  </span>
                </div>

                <h3
                  onClick={() => onSelectRoom && onSelectRoom(room.id)}
                  className="font-serif font-bold text-lg text-[#1E1B18] group-hover:text-[#C4572E] transition-colors mb-2 line-clamp-1 cursor-pointer"
                >
                  {room.name}
                </h3>

                <p className="text-xs text-[#73665C] mb-4 line-clamp-2 leading-relaxed">
                  {room.description}
                </p>

                {/* 4 Thông số tiện ích dạng text sạch sẽ - KHÔNG ICON */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#F2ECE1] text-xs text-[#73665C]">
                  <div className="truncate">
                    <span className="font-medium text-[#1E1B18]">Giường:</span> {room.bed}
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-[#1E1B18]">Sức chứa:</span> {room.guests}
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-[#1E1B18]">Đặc trưng:</span> {room.special}
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-[#1E1B18]">Diện tích:</span> {room.area}
                  </div>
                </div>
              </div>
            </div>

            {/* Chân thẻ: Giá tiền & Nút CHI TIẾT & ĐẶT */}
            <div className="p-5 pt-0">
              <div className="pt-3 border-t border-[#E8E2D8] flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-[#73665C]">Giá niêm yết</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-lg text-[#C4572E]">
                      {room.price.toLocaleString('vi-VN')}đ
                    </span>
                    <span className="text-[11px] text-[#73665C]">/đêm</span>
                  </div>
                  <span className="block text-[9px] text-[#5A7566] font-mono font-medium">
                    Mã PIN Smart Lock 24/7
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectRoom && onSelectRoom(room.id)}
                    className="bg-white hover:bg-[#FAF6F0] text-[#1E1B18] border border-[#DCD6CC] px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs hover:border-[#1E1B18]"
                  >
                    Xem chi tiết
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectRoom && onSelectRoom(room.id)}
                    className="bg-[#C4572E] hover:bg-[#b04a24] text-white px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all transform active:scale-95 cursor-pointer shadow-xs hover:shadow-md flex items-center gap-1"
                  >
                    <span>Đặt phòng</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
