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

  // 6 Hạng phòng mẫu chuẩn bộ nhận diện như trang danh sách phòng
  const featuredRooms = [
    {
      id: 1,
      name: 'Sunset Penthouse & Jacuzzi 270°',
      branch: 'CN1: Hải Đăng',
      rating: '5.0',
      reviewCount: 48,
      badge: 'SIGNATURE HOMESTAY',
      subBadge: 'View ngắm hoàng hôn',
      footerTag: 'Ưu đãi trực tiếp 10% khi đặt hôm nay',
      badgePhotos: '12 ảnh',
      description:
        'Tầng cao ngắm trọn hoàng hôn biển Vũng Tàu 270 độ, trang bị bồn sục Jacuzzi ngoài trời cao cấp và ban công mộc mạc ngát gió biển.',
      bed: '1 Queen Bed',
      guests: '2 - 3 Khách',
      special: 'Jacuzzi 270°',
      area: '55 m²',
      price: 1890000,
      oldPrice: null,
      image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 2,
      name: 'Sea View Balcony Room',
      branch: 'CN1: Hải Đăng',
      rating: '4.9',
      reviewCount: 52,
      badge: 'ĐẶT NHIỀU CUỐI TUẦN',
      subBadge: 'View ngắm hoàng hôn',
      footerTag: 'View ngắm trọn hoàng hôn biển',
      badgePhotos: 'Hút khách',
      description:
        'Ban công rộng nhìn thẳng ra biển Vũng Tàu, ngồi nhâm nhi trà buổi bình minh là một trải nghiệm khó quên cho bất kỳ ai tìm kiếm sự an yên.',
      bed: '1 King/Queen',
      guests: '2 Khách',
      special: 'Ban công biển',
      area: '42 m²',
      price: 850000,
      oldPrice: 1050000,
      image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 3,
      name: 'The Cotton Cloud Suite',
      branch: 'CN1: Hải Đăng',
      rating: '4.9',
      reviewCount: 41,
      badge: 'FAVORITE COUPLES',
      subBadge: 'Ngắm sao trời',
      footerTag: 'Bồn tắm lộ thiên ngoài trời & Tivi 4K',
      badgePhotos: 'Lãng mạn',
      description:
        'Không gian ngập tràn ánh sáng với giường bông êm ái, bồn tắm view ban công ngắm sao trời, dành riêng cho những cặp đôi tận hưởng kỳ nghỉ.',
      bed: '1 Giường King',
      guests: '2 Khách',
      special: 'Rạp mini 4K',
      area: '45 m²',
      price: 920000,
      oldPrice: null,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 4,
      name: 'The Family Attic & Terrace',
      branch: 'CN1: Hải Đăng',
      rating: '4.93',
      reviewCount: 32,
      badge: 'BEST SELLER GIA ĐÌNH',
      subBadge: 'Căn hộ gác mái',
      footerTag: 'Bếp nấu riêng biệt • Sân hiên BBQ',
      badgePhotos: '2 phòng ngủ',
      description:
        'Căn hộ 2 tầng lý tưởng cho gia đình, mang hơi thở mộc mạc đầy đủ nhà bếp riêng và ban công nướng BBQ rộng rãi ngắm view phố biển.',
      bed: '2 Phòng ngủ',
      guests: '4 - 6 Khách',
      special: 'Bếp BBQ riêng',
      area: '85 m²',
      price: 1250000,
      oldPrice: null,
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 5,
      name: 'The Garden Suite (Trệt & Sân Hiên Đá)',
      branch: 'CN1: Thiền Môn',
      rating: '4.96',
      reviewCount: 29,
      badge: 'GẦN GŨI THIÊN NHIÊN',
      subBadge: 'Sân hiên riêng đá',
      footerTag: 'Sân vườn riêng biệt mộc mạc',
      badgePhotos: 'Yên tĩnh',
      description:
        'Sân hiên vườn rợp bóng cây cỏ nhiệt đới, băng ghế bên ngoài hiên mộc mạc đón những làn gió tự nhiên lành lạnh của triền núi Vũng Tàu.',
      bed: '1 Giường King',
      guests: '2 Khách',
      special: 'Bồn tắm mộc',
      area: '50 m²',
      price: 950000,
      oldPrice: null,
      image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 6,
      name: 'Hillside Studio & Workspace',
      branch: 'CN2: Retreat',
      rating: '4.91',
      reviewCount: 37,
      badge: 'LÀM VIỆC & NGHỈ DƯỠNG',
      subBadge: 'Wifi 100Mbps',
      footerTag: 'Bàn làm việc sồi tự nhiên • Cửa sổ Panorama',
      badgePhotos: 'Yên tĩnh',
      description:
        'Bàn làm việc gỗ sồi rộng rãi nhìn ra hướng núi, điện thoả mãn nhu cầu làm việc tự do hay trốn phố tìm sự an tĩnh và năng lượng sáng tạo mới.',
      bed: '1 Giường Queen',
      guests: '2 Khách',
      special: 'Bàn sồi/Núi',
      area: '38 m²',
      price: 880000,
      oldPrice: null,
      image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
    },
  ];

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [roomsData, aptData] = await Promise.all([
          getRooms(),
          getApartments(),
        ]);
        setRooms(roomsData);
        setApartments(aptData);
      } catch (e) {
        console.error('Error loading rooms:', e);
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
            Bộ sưu tập phòng nghỉ sẵn sàng đón khách
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
          <button
            onClick={() => setSelectedApartmentId(1)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedApartmentId === 1
                ? 'bg-[#1E1B18] text-white shadow-xs'
                : 'bg-white text-[#73665C] border border-[#E8E2D8] hover:text-[#1E1B18]'
            }`}
          >
            CN1: Hải Đăng &amp; Thiền Môn
          </button>
          <button
            onClick={() => setSelectedApartmentId(2)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedApartmentId === 2
                ? 'bg-[#1E1B18] text-white shadow-xs'
                : 'bg-white text-[#73665C] border border-[#E8E2D8] hover:text-[#1E1B18]'
            }`}
          >
            CN2: Lưng Chừng Biển
          </button>
        </div>
      </div>

      {/* Grid 6 Hạng Phòng Y HỆT BOX PHÒNG TRANG DANH SÁCH PHÒNG - KHÔNG DÙNG ICON EMOJI */}
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
                  <div className="flex items-center gap-1 font-semibold text-[#1E1B18]">
                    <span className="text-[#C4572E] font-bold">Điểm {room.rating}</span>
                    <span className="text-[#8C7A70] font-normal">({room.reviewCount} đánh giá)</span>
                  </div>
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
                  {room.oldPrice && (
                    <span className="block text-[11px] text-[#A09388] line-through">
                      {room.oldPrice.toLocaleString('vi-VN')}đ
                    </span>
                  )}
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