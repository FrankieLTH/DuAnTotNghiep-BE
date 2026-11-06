import React, { useState, useEffect } from 'react';
import { SearchBookingBar } from '../components/home/SearchBookingBar';
import {
  getRooms,
  getApartments,
  RoomItem,
  ApartmentItem,
  SearchParams,
  BookingDraft,
  BookingGuestSlot,
} from '../services/dataService';

interface RoomListPageProps {
  searchParams?: SearchParams;
  onGoHome: () => void;
  onSelectRoomType: (draft: BookingDraft) => void;
  onSelectRoomDetail?: (roomId: number) => void;
  onUpdateSearchParams?: (params: SearchParams) => void;
  onSearch?: (params: SearchParams) => void;
}

export const RoomListPage: React.FC<RoomListPageProps> = ({
  searchParams: initialSearchParams,
  onGoHome,
  onSelectRoomType,
  onSelectRoomDetail,
  onUpdateSearchParams,
  onSearch,
}) => {
  const [apartments, setApartments] = useState<ApartmentItem[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [holdingId, setHoldingId] = useState<number | null>(null);
  const [capacityError, setCapacityError] = useState<string | null>(null);

  // Bộ lọc dùng chung với trang chủ
  const [currentFilter, setCurrentFilter] = useState<SearchParams>(
    initialSearchParams || {
      branchId: 1,
      checkIn: new Date().toISOString().split('T')[0],
      checkOut: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      adults: 2,
      children: 0,
      childrenAges: [],
      rooms: 1,
    }
  );

  useEffect(() => {
    if (initialSearchParams) {
      setCurrentFilter(initialSearchParams);
    }
  }, [initialSearchParams]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [rData, aData] = await Promise.all([getRooms(), getApartments()]);
        setRooms(rData);
        setApartments(aData);
      } catch (err) {
        console.error('Error fetching rooms:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearchFromBar = (newParams: SearchParams) => {
    setCurrentFilter(newParams);
    if (onUpdateSearchParams) {
      onUpdateSearchParams(newParams);
    }
  };

  // Danh sách 6 hạng phòng chuẩn - KHÔNG DÙNG ICON EMOJI
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
      maxGuests: 3,
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
      maxGuests: 2,
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
      maxGuests: 2,
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
      maxGuests: 6,
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
      maxGuests: 2,
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
      maxGuests: 2,
      image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
    },
  ];

  // Gallery 5 ảnh chi nhánh
  const bentoGallery = [
    {
      id: 1,
      title: 'CN1: Hải Đăng',
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 2,
      title: 'CN1: Thiền Môn',
      image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 3,
      title: 'Boutique Sanctuary',
      isCenter: true,
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 4,
      title: 'CN2: Hải Đăng',
      image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 5,
      title: 'CN2: Retreat',
      image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=400&q=80',
    },
  ];

  const handleBookRoom = (room: any) => {
    // Quy tắc: Trẻ <= 15 tuổi miễn tính sức chứa, chỉ người lớn và trẻ > 15 tuổi tính là 1 khách
    const olderChildren = (currentFilter.childrenAges || []).filter((a) => a > 15).length;
    const countableGuests = (currentFilter.adults || 1) + olderChildren;
    const totalPeople = (currentFilter.adults || 1) + (currentFilter.children || 0);
    const roomCapacity = room.maxGuests || 2;
    if (countableGuests > roomCapacity) {
      const needed = Math.ceil(countableGuests / roomCapacity);
      const childNote = currentFilter.children > 0 ? `, ${currentFilter.children} trẻ em` : '';
      setCapacityError(
        `Phòng "${room.name}" sức chứa tối đa ${roomCapacity} khách. Đoàn bạn gồm ${totalPeople} người (${currentFilter.adults} người lớn${childNote}), cần ${countableGuests} chỗ tính theo sức chứa (trẻ ≤15t được miễn tính sức chứa). Cần đặt ít nhất ${needed} phòng loại này để đủ chỗ cho đoàn.`
      );
      setTimeout(() => setCapacityError(null), 8000);
    }
    setCapacityError(null);
    setHoldingId(room.id);
    setTimeout(() => {
      const slots: BookingGuestSlot[] = [
        {
          id: 'slot-1',
          slot_index: 1,
          guest_type: 'adult',
          is_booker: true,
          is_foreigner: false,
          full_name: '',
          date_of_birth: '',
          id_type: 'cccd',
          id_number: '',
          slot_status: 'empty',
          retry_count: 0,
        },
      ];

      for (let i = 2; i <= currentFilter.adults; i++) {
        slots.push({
          id: `slot-${i}`,
          slot_index: i,
          guest_type: 'adult',
          is_booker: false,
          is_foreigner: false,
          full_name: '',
          date_of_birth: '',
          id_type: 'cccd',
          id_number: '',
          slot_status: 'empty',
          retry_count: 0,
        });
      }

      // Sinh sẵn slot cho trẻ em theo số lượng đã chọn
      for (let c = 1; c <= (currentFilter.children || 0); c++) {
        const childAge = currentFilter.childrenAges?.[c - 1] ?? 5;
        slots.push({
          id: `slot-child-${c}`,
          slot_index: currentFilter.adults + c,
          guest_type: 'child',
          is_booker: false,
          is_foreigner: false,
          full_name: '',
          date_of_birth: '',
          age: childAge,
          id_type: 'cccd',
          id_number: '',
          slot_status: 'empty',
          retry_count: 0,
        });
      }

      const draft: BookingDraft = {
        id: `draft_${Date.now()}`,
        booking_code: `BK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        apartment_id: currentFilter.branchId || 1,
        apartment_name: `Đồi Bông Gòn (${room.branch})`,
        apartment_address: 'Đường Hải Đăng, Phường 2, TP. Vũng Tàu',
        room_type_id: room.id,
        room_type_name: room.name,
        room_type_image: room.image,
        num_rooms: currentFilter.rooms || 1,
        check_in_date: currentFilter.checkIn,
        check_out_date: currentFilter.checkOut,
        nights: 2,
        num_adults: currentFilter.adults,
        num_children: currentFilter.children,
        children_ages: currentFilter.childrenAges,
        price_breakdown: [
          {
            date: currentFilter.checkIn,
            dayOfWeek: 'Hôm nay',
            basePrice: room.price,
            extraFeePercent: 0,
            extraFeeAmount: 0,
            finalPricePerRoom: room.price,
          },
          {
            date: currentFilter.checkOut,
            dayOfWeek: 'Ngày mai',
            basePrice: room.price,
            extraFeePercent: 0,
            extraFeeAmount: 0,
            finalPricePerRoom: room.price,
          },
        ],
        room_subtotal: room.price * 2,
        extra_fee_total: 0,
        service_total: 0,
        discount_amount: 0,
        total_price: room.price * 2,
        hold_expires_at: Date.now() + 30 * 60 * 1000,
        status: 'pending_info',
        booker: {
          full_name: '',
          email: '',
          phone: '',
          is_staying: true,
          email_verified: false,
          consent_data_protection: false,
        },
        guests: slots,
      };

      setHoldingId(null);
      onSelectRoomType(draft);
    }, 400);
  };

    const handleSearchSubmit = (params: SearchParams) => {
    if (onSearch) {
      onSearch(params);
    }
  };

  return (
    <div className="bg-[#FAF6F0] min-h-screen pb-20 font-sans text-[#241C18]">
      {/* 1. Breadcrumb & Tiêu Đề Đầu Trang */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 text-center">
        <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-[#8C7A70] tracking-[0.2em] uppercase mb-2">
          <button onClick={onGoHome} className="hover:text-[#241C18] transition-colors cursor-pointer">
            Trang Chủ
          </button>
          <span>/</span>
          <span className="text-[#C4572E]">Danh Sách Phòng</span>
        </div>

        <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#241C18] tracking-tight mb-2">
          Danh Sách Phòng &amp; Căn Hộ
        </h1>
        <p className="text-xs sm:text-sm text-[#73665C] max-w-xl mx-auto font-normal">
          Không gian nghỉ dưỡng mộc mạc, riêng tư với hệ thống tự check-in 24/7
        </p>
      </div>

      {/* 2. BỘ LỌC TÌM KIẾM DÙNG CHUNG VỚI TRANG CHỦ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <SearchBookingBar
          initialParams={currentFilter}
          onSearch={handleSearchSubmit}
        />
        <div className="flex items-center justify-between mt-2.5 px-2 text-[11px] text-[#73665C]">
          <span className="font-medium text-[#73665C]">
            Đảm bảo giá trực tiếp tốt nhất khi đặt qua website
          </span>
          <span className="font-medium text-[#241C18]">6/6 hạng phòng sẵn sàng</span>
        </div>
      </div>

      {/* CAPACITY ERROR BANNER */}
      {capacityError && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="bg-[#FDF2F2] border border-[#E8A8A8] text-[#8C2020] rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-2">
            <span className="shrink-0 mt-0.5 font-bold">!</span>
            <span>{capacityError}</span>
          </div>
        </div>
      )}

      {/* 3. Bento / Gallery 5 Ảnh Chi Nhánh Thu Nhỏ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 items-center">
          {bentoGallery.map((item) => {
            if (item.isCenter) {
              return (
                <div
                  key={item.id}
                  className="col-span-2 md:col-span-1 md:row-span-1 relative rounded-2xl overflow-hidden aspect-4/3 md:aspect-auto md:h-52 shadow-md group border border-[#E8E2D8]"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30" />
                  
                  <div className="absolute top-2.5 left-2.5 bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] font-mono text-amber-200">
                    BOUTIQUE SANCTUARY
                  </div>

                  <div className="absolute bottom-2.5 left-2 right-2 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[10px] font-semibold text-[#241C18] shadow-xs">
                      <span>Tất cả cơ sở (6 phòng)</span>
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className="relative rounded-2xl overflow-hidden aspect-3/4 md:aspect-auto md:h-44 shadow-xs group border border-[#E8E2D8]"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <span className="text-[10px] font-medium text-white/90 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded truncate block">
                    {item.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Section Tiêu Đề Danh Sách */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-[#E8E2D8]">
          <div>
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#C4572E] block mb-1">
              BOUTIQUE SUITES &amp; HILLSIDE ROOMS
            </span>
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#241C18] tracking-tight">
              Bộ sưu tập 6 hạng phòng sẵn sàng đón khách
            </h2>
          </div>

          <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#EDF5F1] border border-[#C2DFD0] text-[11px] font-semibold text-[#2A694E] self-start sm:self-auto">
            <span>Tự check-in 24/7 • Giữ phòng 100%</span>
          </div>
        </div>
      </div>

      {/* 5. Grid 6 Hạng Phòng Đầy Đủ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {featuredRooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-2xl overflow-hidden border border-[#E8E2D8] hover:border-[#C4572E]/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Ảnh phòng - Click mở chi tiết */}
                <div
                  onClick={() => onSelectRoomDetail && onSelectRoomDetail(room.id)}
                  className="relative aspect-16/10 overflow-hidden bg-[#241C18] cursor-pointer"
                >
                  <img
                    src={room.image}
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />

                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none">
                    <span className="bg-white/95 backdrop-blur-xs text-[10px] font-mono font-bold text-[#241C18] px-2 py-0.5 rounded shadow-xs">
                      {room.badge}
                    </span>
                    <span className="bg-black/60 backdrop-blur-xs text-[9px] font-medium text-white px-2 py-0.5 rounded shadow-xs">
                      {room.subBadge}
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] text-white pointer-events-none">
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
                    <div className="flex items-center gap-1 font-semibold text-[#241C18]">
                      <span className="text-[#C4572E] font-bold">Điểm {room.rating}</span>
                      <span className="text-[#8C7A70] font-normal">({room.reviewCount} đánh giá)</span>
                    </div>
                    <span className="text-[10px] uppercase font-semibold text-white bg-[#241C18] px-2 py-0.5 rounded font-mono">
                      {room.branch}
                    </span>
                  </div>

                  <h3
                    onClick={() => onSelectRoomDetail && onSelectRoomDetail(room.id)}
                    className="font-serif font-bold text-lg text-[#241C18] group-hover:text-[#C4572E] transition-colors mb-2 line-clamp-1 cursor-pointer"
                  >
                    {room.name}
                  </h3>

                  <p className="text-xs text-[#73665C] mb-4 line-clamp-2 leading-relaxed">
                    {room.description}
                  </p>

                  {/* 4 Thông số text sạch sẽ - KHÔNG ICON */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#F2ECE1] text-xs text-[#73665C]">
                    <div className="truncate">
                      <span className="font-medium text-[#241C18]">Giường:</span> {room.bed}
                    </div>
                    <div className="truncate">
                      <span className="font-medium text-[#241C18]">Sức chứa:</span> {room.guests}
                    </div>
                    <div className="truncate">
                      <span className="font-medium text-[#241C18]">Đặc trưng:</span> {room.special}
                    </div>
                    <div className="truncate">
                      <span className="font-medium text-[#241C18]">Diện tích:</span> {room.area}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chân thẻ: Giá tiền & 2 Nút: CHI TIẾT và ĐẶT PHÒNG */}
              <div className="p-5 pt-0">
                <div className="pt-3 border-t border-[#E8E2D8] flex items-center justify-between gap-2">
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

                  <div className="flex flex-col gap-2">
                    {/* Badge canh bao suc chua (chi tinh nguoi lon & tre > 15t) */}
                    {(() => {
                      const olderChildren = (currentFilter.childrenAges || []).filter((a) => a > 15).length;
                      const countableGuests = (currentFilter.adults || 1) + olderChildren;
                      const roomCap = room.maxGuests || 2;
                      const roomNotEnough = countableGuests > roomCap;
                      return roomNotEnough ? (
                        <div className="text-[10px] text-[#8C5228] bg-[#FBF3E8] border border-[#ECD9C6] rounded-lg px-2 py-1 font-medium">
                          Sức chứa {roomCap} khách — Cần {countableGuests} chỗ cho đoàn (Trẻ ≤15t miễn tính sức chứa)
                        </div>
                      ) : null;
                    })()}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectRoomDetail && onSelectRoomDetail(room.id)}
                        className="bg-white hover:bg-[#FAF6F0] text-[#241C18] border border-[#DCD6CC] px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs hover:border-[#241C18]"
                      >
                        Xem chi tiết
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBookRoom(room)}
                        disabled={holdingId === room.id}
                        className="bg-[#C4572E] hover:bg-[#b04a24] text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all transform active:scale-95 cursor-pointer shadow-xs hover:shadow-md flex items-center gap-1"
                      >
                        {holdingId === room.id ? (
                          <span>Đang chọn...</span>
                        ) : (
                          <>
                            <span>Đặt phòng</span>
                            <span>→</span>
                          </>
                        )}
                      </button>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Banner Voucher Nền Ảnh Sang Trọng */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="relative rounded-2xl overflow-hidden shadow-lg border border-[#3E2B20]">
          <img
            src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1920&q=85"
            alt="Đồi Bông Gòn Voucher"
            className="absolute inset-0 w-full h-full object-cover filter brightness-45 contrast-110"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#241812]/95 via-[#2E1E16]/85 to-[#241812]/90" />

          <div className="relative z-10 p-6 sm:p-8 md:p-10 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#F4BE9B] block">
                ƯU ĐÃI ĐẶT PHÒNG TRỰC TIẾP
              </span>
              <h3 className="font-serif font-bold text-2xl sm:text-3xl text-white">
                Giảm 15% khi đặt từ 2 đêm
              </h3>
              <p className="text-xs text-white/80 leading-relaxed font-light">
                Áp dụng tự động cho mọi hạng phòng và chi nhánh khi đặt trực tiếp trên website hoặc Hotline.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-xs px-4 py-2 rounded-xl border border-white/20 text-center">
                <span className="text-[9px] uppercase tracking-wider text-[#F4BE9B] block font-mono">
                  MÃ ƯU ĐÃI CHÍNH THỨC
                </span>
                <span className="font-mono font-bold text-base text-white tracking-widest">
                  BONGGON15
                </span>
              </div>

              <button
                onClick={() => handleBookRoom(featuredRooms[0])}
                className="w-full sm:w-auto bg-[#C4572E] hover:bg-[#b04a24] text-white px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <span>Áp dụng mã &amp; Giữ phòng</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 7. 3 Khối Lợi Ích & Cam Kết */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-6 border border-[#E8E2D8] flex items-start gap-4 shadow-xs">
            <div>
              <h4 className="font-serif font-bold text-sm text-[#241C18] mb-1">
                Check-in Tự Động 24/7
              </h4>
              <p className="text-xs text-[#73665C] leading-relaxed">
                Nhận mã PIN cửa độc quyền qua SMS/Zalo. Riêng tư tuyệt đối, không chờ đợi lễ tân.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#E8E2D8] flex items-start gap-4 shadow-xs">
            <div>
              <h4 className="font-serif font-bold text-sm text-[#241C18] mb-1">
                Minh Bạch &amp; Không Phụ Phí
              </h4>
              <p className="text-xs text-[#73665C] leading-relaxed">
                Đã gồm tiện nghi bếp BBQ và trà hoa thảo mộc. Tuyệt đối không phát sinh phí ẩn.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#E8E2D8] flex items-start gap-4 shadow-xs">
            <div>
              <h4 className="font-serif font-bold text-sm text-[#241C18] mb-1">
                Đổi Lịch Trình Linh Hoạt
              </h4>
              <p className="text-xs text-[#73665C] leading-relaxed">
                Hỗ trợ bảo lưu, đổi ngày miễn phí trước 5 ngày check-in. Hỗ trợ khách hàng 24/7.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};





