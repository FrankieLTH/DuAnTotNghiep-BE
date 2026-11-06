import React, { useState } from 'react';
import { SearchBookingBar } from '../components/home/SearchBookingBar';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import {
  SEED_APARTMENTS,
  SearchParams,
  BookingDraft,
  BookingGuestSlot,
} from '../services/dataService';

interface SearchResultPageProps {
  searchParams?: SearchParams;
  onGoHome: () => void;
  onGoRoomList: () => void;
  onSelectRoomType: (draft: BookingDraft) => void;
  onSelectRoomDetail?: (roomId: number) => void;
  onSearchAgain?: (params: SearchParams) => void;
}

interface RoomData {
  id: number;
  name: string;
  badge: string;
  badgePhotos: string;
  image: string;
  price: number;
  oldPrice: number | null;
  bed: string;
  guests: string;
  maxGuests: number;
  special: string;
  area: string;
  amenitiesList: string[];
  description: string;
  availableCount: number;
}

interface BranchData {
  id: number;
  tag: string;
  addressTag: string;
  mapTag: string;
  name: string;
  address: string;
  city: string;
  description: string;
  ratingText: string;
  ratingScore: string;
  rooms: RoomData[];
}

export const SearchResultPage: React.FC<SearchResultPageProps> = ({
  searchParams,
  onGoHome,
  onGoRoomList,
  onSelectRoomType,
  onSelectRoomDetail,
  onSearchAgain,
}) => {
  const currentParams: SearchParams = searchParams || {
    branchId: 0,
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    adults: 2,
    children: 0,
    childrenAges: [],
    rooms: 1,
  };

  // Tính số đêm
  const dIn = new Date(currentParams.checkIn);
  const dOut = new Date(currentParams.checkOut);
  const diffTime = dOut.getTime() - dIn.getTime();
  const calculatedNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1);
  // Tổng số người trong đoàn (người lớn + trẻ em)
  const totalPeople = (currentParams.adults || 1) + (currentParams.children || 0);

  // Quy tắc mới cho trẻ em:
  // - Dưới 10 tuổi: Không cần CCCD & Không tính 1 khách vào sức chứa
  // - 10 đến 15 tuổi: Cần CCCD & Không tính 1 khách vào sức chứa
  // - Trên 15 tuổi: Cần CCCD & Tính là 1 khách vào sức chứa
  const childrenAges = currentParams.childrenAges || [];
  let childrenOver15Count = 0;
  let children10To15Count = 0;
  let childrenUnder10Count = 0;

  for (let i = 0; i < (currentParams.children || 0); i++) {
    const age = childrenAges[i] !== undefined ? childrenAges[i] : 8;
    if (age > 15) {
      childrenOver15Count++;
    } else if (age >= 10) {
      children10To15Count++;
    } else {
      childrenUnder10Count++;
    }
  }

  // Số khách tính vào sức chứa phòng: chỉ người lớn và trẻ em trên 15 tuổi
  const countableGuests = (currentParams.adults || 1) + childrenOver15Count;
  const totalGuests = countableGuests; // Giữ biến tương thích

  // State lưu số lượng phòng được chọn: { [roomId]: count }
  const [selectedRoomCounts, setSelectedRoomCounts] = useState<Record<number, number>>({});
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(2); // Hiển thị 2 chi nhánh đầu tiên, có nút Xem thêm
  const [, setSyncKey] = useState<number>(0);

  // Lắng nghe sự kiện realtime từ Admin: cập nhật tình trạng phòng trống ngay khi Admin tạo / hủy đơn
  useRealtimeSync({
    eventTypes: ['availability.changed', 'catalog.changed'],
    onRefresh: () => {
      setSyncKey((prev) => prev + 1);
    },
  });

  const handleRoomCountChange = (roomId: number, count: number) => {
    setSelectedRoomCounts((prev) => ({
      ...prev,
      [roomId]: count,
    }));
    setErrorNotice(null);
  };

  // 3 Chi nhánh chuẩn Đồi Bông Gòn với danh sách phòng dạng thanh ngang (Horizontal Room List)
  const branchesData: BranchData[] = [
    {
      id: 1,
      tag: 'Cơ sở 1 - Núi Nhỏ',
      addressTag: 'Đường Hải Đăng, Phường 2, TP. Vũng Tàu',
      mapTag: 'Xem vị trí bản đồ',
      name: 'Đồi Bông Gòn 1: Triền Núi Nhỏ',
      address: 'Đường Hải Đăng, Phường 2, TP. Vũng Tàu',
      city: 'Vũng Tàu',
      description:
        'Không gian mộc mạc bên triền núi Hải Đăng. View trọn hoàng hôn biển và ngọn hải đăng Vũng Tàu. 4 hạng phòng phù hợp từ cặp đôi đến gia đình.',
      ratingText: 'Tuyệt vời (128 đánh giá)',
      ratingScore: '4.9',
      rooms: [
        {
          id: 1,
          name: 'Phòng Giường Đôi Single Studio',
          badge: 'SIGNATURE / VIEW BIỂN',
          badgePhotos: '12 ảnh',
          image:
            'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
          price: 550000,
          oldPrice: 750000,
          bed: '1 Queen Bed',
          guests: '2 Khách',
          maxGuests: 2,
          special: 'Ban công hướng biển',
          area: '28m²',
          amenitiesList: [
            'Smart TV 55" 4K',
            'Máy pha cà phê',
            'Bồn tắm gỗ ngâm',
            'Bếp nấu riêng',
          ],
          description:
            'Không gian ấm cúng, thiết kế mộc tự nhiên ngắm trọn cảnh bình minh và hoàng hôn biển Vũng Tàu.',
          availableCount: 2,
        },
        {
          id: 2,
          name: 'Sea View Balcony Room (Ban Công Biển)',
          badge: 'HÚT KHÁCH CUỐI TUẦN',
          badgePhotos: '10 ảnh',
          image:
            'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
          price: 850000,
          oldPrice: 1050000,
          bed: '1 King/Queen Bed',
          guests: '2 Khách',
          maxGuests: 2,
          special: 'Ban công biển 180°',
          area: '42m²',
          amenitiesList: [
            'Ban công biển 180°',
            'Smart TV 4K',
            'Bàn trà ban công',
            'Trà hoa thảo mộc',
          ],
          description:
            'Ban công rộng nhìn thẳng ra biển Vũng Tàu, ngồi nhâm nhi trà buổi sớm mai ngập tràn an yên.',
          availableCount: 3,
        },
        {
          id: 3,
          name: 'The Cotton Cloud Suite (Bồn Tắm Sao Trời)',
          badge: 'LÃNG MẠN / COUPLE',
          badgePhotos: '14 ảnh',
          image:
            'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
          price: 920000,
          oldPrice: 1100000,
          bed: '1 Giường King lớn',
          guests: '2 Khách',
          maxGuests: 2,
          special: 'Bồn tắm view trời',
          area: '45m²',
          amenitiesList: [
            'Bồn tắm ngắm sao trời',
            'Rạp chiếu mini 4K',
            'Giường bông siêu êm',
            'Bếp từ & dụng cụ',
          ],
          description:
            'Không gian lãng mạn dành riêng cho các cặp đôi tận hưởng kỳ nghỉ bên triền núi Vũng Tàu.',
          availableCount: 2,
        },
        {
          id: 4,
          name: 'The Family Attic & Terrace (Căn Hộ Gác Mái BBQ)',
          badge: 'DÀNH CHO GIA ĐÌNH',
          badgePhotos: '16 ảnh',
          image:
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
          price: 1250000,
          oldPrice: 1450000,
          bed: '2 Phòng ngủ (2 King Bed)',
          guests: '4 - 6 Khách',
          maxGuests: 6,
          special: 'Sân hiên nướng BBQ',
          area: '85m²',
          amenitiesList: [
            '2 Phòng ngủ riêng biệt',
            'Bếp gia đình đầy đủ',
            'Sân BBQ ngoài trời',
            'Bàn ăn tiệc 6 người',
          ],
          description:
            'Căn hộ 2 tầng lý tưởng cho gia đình, mang hơi thở mộc mạc và sân nướng BBQ ngắm phố biển.',
          availableCount: 1,
        },
      ],
    },
    {
      id: 2,
      tag: 'Cơ sở 2 - Lưng Chừng Biển',
      addressTag: 'Đường Trần Phú, Phường 5, TP. Vũng Tàu',
      mapTag: 'Xem vị trí bản đồ',
      name: 'Đồi Bông Gòn 2: Lưng Chừng Biển',
      address: 'Đường Trần Phú, Phường 5, TP. Vũng Tàu',
      city: 'Vũng Tàu',
      description:
        'Tọa lạc sát triền đá đường Trần Phú hướng biển Bãi Dâu. Lắng nghe tiếng sóng vỗ rì rào và thư giãn giữa khu vườn đá nhiệt đới mát lành.',
      ratingText: 'Xuất sắc (96 đánh giá)',
      ratingScore: '4.95',
      rooms: [
        {
          id: 5,
          name: 'The Garden Suite (Trệt & Sân Hiên Đá)',
          badge: 'GẦN GŨI THIÊN NHIÊN',
          badgePhotos: '12 ảnh',
          image:
            'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
          price: 950000,
          oldPrice: 1150000,
          bed: '1 Giường King',
          guests: '2 Khách',
          maxGuests: 2,
          special: 'Sân hiên đá riêng',
          area: '50m²',
          amenitiesList: [
            'Sân hiên vườn đá riêng',
            'Bồn tắm ngâm thảo mộc',
            'Ghế mây thư giãn',
            'Trà hoa & bánh ngọt',
          ],
          description:
            'Sân hiên vườn rợp bóng cây cỏ nhiệt đới, băng ghế mộc mạc đón làn gió biển tự nhiên trong lành.',
          availableCount: 2,
        },
      ],
    },
    {
      id: 3,
      tag: 'Cơ sở 3 - Retreat Triền Núi',
      addressTag: 'Đường Vi Ba, Núi Lớn, TP. Vũng Tàu',
      mapTag: 'Xem vị trí bản đồ',
      name: 'Đồi Bông Gòn 3: Retreat Triền Núi',
      address: 'Đường Vi Ba, Núi Lớn, TP. Vũng Tàu',
      city: 'Vũng Tàu',
      description:
        'Ẩn mình trên sườn Núi Lớn không gian thanh tĩnh và không khí mát lành quanh năm. Trải nghiệm làm việc từ xa và tái tạo năng lượng hoàn hảo.',
      ratingText: 'Yên tĩnh tuyệt đối (84 đánh giá)',
      ratingScore: '4.92',
      rooms: [
        {
          id: 6,
          name: 'Hillside Studio & Workspace (Làm Việc & Nghỉ Dưỡng)',
          badge: 'WIFI 100MBPS',
          badgePhotos: '11 ảnh',
          image:
            'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
          price: 880000,
          oldPrice: 1050000,
          bed: '1 Giường Queen',
          guests: '2 Khách',
          maxGuests: 2,
          special: 'Bàn sồi nhìn núi',
          area: '38m²',
          amenitiesList: [
            'Bàn làm việc sồi tự nhiên',
            'Wifi 100Mbps ổn định',
            'Cửa sổ Panorama núi',
            'Máy pha Espresso',
          ],
          description:
            'Bàn làm việc gỗ sồi rộng rãi nhìn ra hướng núi, thỏa mãn nhu cầu làm việc tự do hay trốn phố tìm sự an tĩnh.',
          availableCount: 2,
        },
      ],
    },
  ];

  // Lọc chi nhánh theo bộ lọc (nếu branchId === 0 hoặc không chọn thì hiện cả 3 cơ sở)
  const displayedBranches = branchesData.filter((branch) => {
    if (!currentParams.branchId || currentParams.branchId === 0) {
      return true;
    }
    return branch.id === currentParams.branchId;
  });

  // Xử lý nút "Tiếp tục đặt phòng - Cơ sở này"
  const handleProceedBranchBooking = (branch: BranchData) => {
    // Tìm các phòng đã được chọn trong cơ sở này
    const chosenRooms = branch.rooms.filter(
      (r) => (selectedRoomCounts[r.id] || 0) > 0
    );

    if (chosenRooms.length === 0) {
      setErrorNotice(
        `Vui lòng chọn số lượng phòng (tối thiểu 1 phòng) tại ${branch.name} trước khi tiếp tục.`
      );
      setTimeout(() => setErrorNotice(null), 4000);
      return;
    }

    // Tính tổng sức chứa tối đa của tất cả các phòng khách đã chọn (Khớp ERD Booking_rooms -> room_types.max_occupancy)
    const totalSelectedCapacity = chosenRooms.reduce(
      (sum, r) => sum + (r.maxGuests || 2) * (selectedRoomCounts[r.id] || 0),
      0
    );

    // QUY TẮC BẮT BUỘC:
    // Trẻ <= 15 tuổi miễn tính sức chứa, chỉ trẻ > 15 tuổi tính là 1 khách
    if (countableGuests > totalSelectedCapacity) {
      const childDetailStr =
        currentParams.children > 0
          ? `, ${currentParams.children} trẻ em (${childrenOver15Count} trẻ >15t tính sức chứa, ${childrenUnder10Count + children10To15Count} trẻ ≤15t miễn tính sức chứa)`
          : '';
      setErrorNotice(
        `Đoàn của bạn gồm ${totalPeople} người (${currentParams.adults} người lớn${childDetailStr}), cần ${countableGuests} chỗ tính theo sức chứa. Nhưng các phòng đã chọn chỉ có sức chứa tối đa ${totalSelectedCapacity} khách. Vui lòng chọn thêm phòng hoặc đổi sang loại phòng có sức chứa lớn hơn.`
      );
      setTimeout(() => setErrorNotice(null), 7000);
      return;
    }

    const firstRoom = chosenRooms[0];
    const totalCount = chosenRooms.reduce(
      (sum, r) => sum + (selectedRoomCounts[r.id] || 0),
      0
    );
    const totalSubtotal = chosenRooms.reduce(
      (sum, r) => sum + r.price * (selectedRoomCounts[r.id] || 0) * calculatedNights,
      0
    );

    // Danh sách chi tiết các phòng đã chọn khớp với Booking_rooms trong ERD
    const selectedBookingRooms = chosenRooms.map((r) => ({
      room_type_id: r.id,
      room_type_name: r.name,
      room_type_image: r.image,
      count: selectedRoomCounts[r.id] || 1,
      price: r.price,
      max_occupancy: r.maxGuests || 2,
    }));

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

    for (let i = 2; i <= currentParams.adults; i++) {
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
    for (let c = 1; c <= (currentParams.children || 0); c++) {
      const childAge = currentParams.childrenAges?.[c - 1] ?? 5;
      slots.push({
        id: `slot-child-${c}`,
        slot_index: currentParams.adults + c,
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
      apartment_id: branch.id,
      apartment_name: branch.name,
      apartment_address: branch.address,
      room_type_id: firstRoom.id,
      room_type_name: firstRoom.name,
      room_type_image: firstRoom.image,
      num_rooms: totalCount,
      booking_rooms: selectedBookingRooms,
      total_capacity: totalSelectedCapacity,
      check_in_date: currentParams.checkIn,
      check_out_date: currentParams.checkOut,
      nights: calculatedNights,
      num_adults: currentParams.adults,
      num_children: currentParams.children,
      children_ages: currentParams.childrenAges,
      price_breakdown: [
        {
          date: currentParams.checkIn,
          dayOfWeek: 'Ngày nhận phòng',
          basePrice: firstRoom.price,
          extraFeePercent: 0,
          extraFeeAmount: 0,
          finalPricePerRoom: firstRoom.price,
        },
      ],
      room_subtotal: totalSubtotal,
      extra_fee_total: 0,
      service_total: 0,
      discount_amount: 0,
      total_price: totalSubtotal,
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

    onSelectRoomType(draft);
  };

  return (
    <div className="bg-[#FAF6F0] min-h-screen pb-20 font-sans text-[#241C18]">
      {/* 1. Header Banner nền tối với Tiêu đề và Search Bar nổi (Y hệt ảnh 1) */}
      <div className="relative z-30 bg-[#1A1513] text-white pt-10 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Nền ảnh bờ biển đêm mộc mạc với lớp phủ gradient */}
        <div className="absolute inset-0 z-0 opacity-25 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80"
            alt="Đồi Bông Gòn Biển Đêm"
            className="w-full h-full object-cover filter brightness-75"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#191412]/80 via-[#191412]/90 to-[#191412] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto text-center space-y-3 mb-6">
          <h1 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl text-white tracking-wide">
            Danh Sách Phòng &amp; Căn Hộ
          </h1>
        </div>

        {/* Floating Search Bar - Đặt z-40 để popover không bị che bởi phần bên dưới */}
        <div className="relative z-40 max-w-6xl mx-auto -mb-12">
          <SearchBookingBar
            initialParams={currentParams}
            onSearch={(newP) => {
              if (onSearchAgain) {
                onSearchAgain(newP);
              }
            }}
          />
        </div>
      </div>

      {/* Thông báo lỗi nếu chưa chọn phòng hoặc thiếu sức chứa */}
      {errorNotice && (
        <>
          <div className="max-w-6xl mx-auto px-4 mt-16 mb-[-30px]">
            <div className="bg-[#FDF2F2] border border-[#F3CECE] text-[#A83232] text-xs font-semibold p-3.5 rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">⚠️</span>
                <span>{errorNotice}</span>
              </div>
              <button
                onClick={() => setErrorNotice(null)}
                className="text-[#A83232] font-bold ml-2 cursor-pointer hover:opacity-75"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Floating Toast ở góc dưới màn hình để người dùng luôn thấy ngay lập tức */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[90%] pointer-events-auto shadow-2xl">
            <div className="bg-[#241C18] border-2 border-[#C4572E] text-white p-4 rounded-2xl flex items-start justify-between gap-3 shadow-2xl animate-fade-in">
              <div className="flex items-start gap-2.5">
                <span className="text-xl leading-none">⚠️</span>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#F4BE9B] mb-0.5">
                    Sức chứa chưa đủ cho đoàn
                  </h4>
                  <p className="text-xs text-white/90 leading-relaxed font-medium">
                    {errorNotice}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setErrorNotice(null)}
                className="text-white/60 hover:text-white text-sm font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>
          </div>
        </>
      )}

      {/* 2. Thanh Sub-header tối giản, tiện ích trực quan */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E2D8]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#73665C]">
            <span className="w-2 h-2 rounded-full bg-[#C4572E]"></span>
            <span>Chi nhánh homestay tại Vũng Tàu</span>
            <span>•</span>
            <span className="text-[#C4572E] font-bold">{displayedBranches.length} cơ sở sẵn sàng</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-medium text-[#73665C]">
            <span className="bg-[#FAF6F0] border border-[#E8E2D8] px-2.5 py-1 rounded-lg">Smart PIN 24/7</span>
            <span className="bg-[#FAF6F0] border border-[#E8E2D8] px-2.5 py-1 rounded-lg">Bếp &amp; BBQ</span>
            <span className="bg-[#FAF6F0] border border-[#E8E2D8] px-2.5 py-1 rounded-lg">View biển &amp; núi</span>
          </div>
        </div>
      </div>

      {/* 3. Danh sách các Khối Chi Nhánh (Grouped by Branch Cards - Y hệt ảnh 1) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {displayedBranches.slice(0, visibleCount).map((branch) => {
          // Tính tổng tiền các phòng đã chọn trong cơ sở này
          const branchTotal = branch.rooms.reduce((sum, r) => {
            const count = selectedRoomCounts[r.id] || 0;
            return sum + count * r.price * calculatedNights;
          }, 0);

          const branchChosenCount = branch.rooms.reduce((sum, r) => {
            return sum + (selectedRoomCounts[r.id] || 0);
          }, 0);

          const branchChosenCapacity = branch.rooms.reduce((sum, r) => {
            return sum + (r.maxGuests || 2) * (selectedRoomCounts[r.id] || 0);
          }, 0);

          return (
            <div
              key={branch.id}
              className="bg-white rounded-3xl border border-[#E8E2D8] p-5 sm:p-7 md:p-8 shadow-sm space-y-6"
            >
              {/* Header chi nhánh cô đọng */}
              <div className="pb-4 border-b border-[#E8E2D8] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#FBF0EA] text-[#C4572E] px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                      {branch.tag}
                    </span>
                    <span className="text-xs text-[#73665C]">
                      {branch.address}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#241C18]">
                    {branch.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0 bg-[#FAF6F0] px-3 py-1.5 rounded-xl border border-[#E8E2D8]">
                  <span className="text-xs font-bold text-[#241C18]">Tuyệt vời</span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#2A694E] text-white text-xs font-bold font-mono">
                    {branch.ratingScore}
                  </span>
                </div>
              </div>

              {/* Danh sách các phòng dạng Card Nằm Ngang (Horizontal Layout) */}
              <div className="space-y-5">
                {branch.rooms.map((room) => {
                  const currentCount = selectedRoomCounts[room.id] || 0;

                  return (
                    <div
                      key={room.id}
                      className="bg-[#FCFAF7] rounded-2xl border border-[#E8E2D8] hover:border-[#C4572E]/40 hover:shadow-md transition-all p-4 sm:p-5 flex flex-col lg:flex-row gap-5 items-stretch"
                    >
                      {/* Cột 1: Ảnh phòng (Click xem chi tiết) */}
                      <div
                        onClick={() => onSelectRoomDetail && onSelectRoomDetail(room.id)}
                        className="w-full lg:w-72 xl:w-80 shrink-0 relative aspect-16/10 rounded-xl overflow-hidden bg-[#241C18] cursor-pointer group"
                      >
                        <img
                          src={room.image}
                          alt={room.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2.5 left-2.5 pointer-events-none">
                          <span className="bg-[#C4572E] text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow-xs">
                            {room.badge}
                          </span>
                        </div>
                        <div className="absolute bottom-2 left-2.5 pointer-events-none">
                          <span className="bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono px-2 py-0.5 rounded">
                            {room.badgePhotos}
                          </span>
                        </div>
                      </div>

                      {/* Cột 2: Thông tin phòng & Tiện ích (Ở giữa) */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3">
                        {/* Thanh cam vàng ưu đãi trực tiếp */}
                        <div className="bg-[#FDF9F2] border border-[#F5E6CC] rounded-lg px-3 py-1.5 text-[10px] sm:text-[11px] text-[#8C6239] flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>✓ Đặt trực tiếp: Miễn phí trà hoa &amp; bánh</span>
                          <span>•</span>
                          <span>✓ Tự nhận phòng Smart PIN 24/7</span>
                          <span>•</span>
                          <span>✓ Giữ phòng cọc 30% linh hoạt</span>
                        </div>

                        {/* Tiêu đề phòng */}
                        <div>
                          <h4
                            onClick={() => onSelectRoomDetail && onSelectRoomDetail(room.id)}
                            className="font-serif font-bold text-lg sm:text-xl text-[#241C18] hover:text-[#C4572E] transition-colors cursor-pointer"
                          >
                            {room.name}
                          </h4>

                          {/* Dòng thông số */}
                          <div className="text-xs text-[#73665C] flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 font-medium">
                            <span>Giường: <strong>{room.bed}</strong></span>
                            <span>•</span>
                            <span>Sức chứa: <strong>{room.guests}</strong></span>
                            <span>•</span>
                            <span>Đặc trưng: <strong>{room.special}</strong></span>
                            <span>•</span>
                            <span>Diện tích: <strong>{room.area}</strong></span>
                          </div>
                        </div>

                        {/* 4 Tiện ích 2 cột */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#5C4E43] pt-1">
                          {room.amenitiesList.map((am, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 truncate">
                              <span className="text-[#C4572E] font-bold">✓</span>
                              <span className="truncate">{am}</span>
                            </div>
                          ))}
                        </div>

                        {/* Nhận phòng tự động */}
                        <div className="text-[11px] text-[#2A694E] flex items-center gap-1 font-medium pt-1">
                          <span>✓ Nhận phòng tự động bằng Smart PIN qua SMS/Zalo</span>
                        </div>
                      </div>

                      {/* Cột 3: Giá tiền & Dropdown chọn số lượng phòng (Bên phải) */}
                      <div className="w-full lg:w-60 shrink-0 flex flex-col justify-between lg:items-end lg:text-right border-t lg:border-t-0 lg:border-l border-[#EFE8DD] pt-3 lg:pt-0 lg:pl-5 space-y-3">
                        {/* Giá tiền */}
                        <div>
                          {room.oldPrice && (
                            <div className="flex items-center lg:justify-end gap-1.5">
                              <span className="text-xs text-[#A09388] line-through">
                                {room.oldPrice.toLocaleString('vi-VN')}đ
                              </span>
                              <span className="text-[10px] bg-[#FDF2F2] text-[#A83232] font-bold px-1.5 py-0.2 rounded font-mono">
                                -{Math.round(((room.oldPrice - room.price) / room.oldPrice) * 100)}%
                              </span>
                            </div>
                          )}
                          <div className="flex items-baseline lg:justify-end gap-1">
                            <span className="font-bold text-2xl text-[#C4572E] font-serif">
                              {room.price.toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                          <span className="text-[10px] text-[#8C7A70] block">
                            / đêm (Chưa bao gồm VAT)
                          </span>
                        </div>

                        {/* Dropdown chọn số lượng phòng (Y hệt ảnh 1) */}
                        <div className="w-full">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#73665C] mb-1 lg:text-right">
                            Số lượng phòng (còn {room.availableCount} phòng)
                          </label>
                          <select
                            value={currentCount}
                            onChange={(e) =>
                              handleRoomCountChange(room.id, Number(e.target.value))
                            }
                            className={`w-full bg-white border text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none cursor-pointer transition-colors ${
                              currentCount > 0
                                ? 'border-[#C4572E] text-[#241C18] bg-[#FAF6F0]'
                                : 'border-[#D0C8BC] text-[#73665C]'
                            }`}
                          >
                            <option value={0}>0 phòng (Chưa chọn)</option>
                            {Array.from({ length: room.availableCount }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>
                                {n} phòng ({(room.price * n).toLocaleString('vi-VN')}đ)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Nút Xem chi tiết phòng & ảnh */}
                        <button
                          type="button"
                          onClick={() => onSelectRoomDetail && onSelectRoomDetail(room.id)}
                          className="text-[#2A694E] hover:text-[#1E4A37] text-xs font-bold transition-colors cursor-pointer hover:underline self-start lg:self-end"
                        >
                          Xem chi tiết phòng &amp; ảnh →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Thanh Tổng Tiền & Nút Tiếp Tục Đặt Phòng Của Chi Nhánh (Y hệt ảnh 1) */}
              <div className="bg-[#241C18] text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 shadow-md">
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="text-xs sm:text-sm text-white/90 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <span>
                      Đã chọn cho cơ sở: <strong className="text-[#F4BE9B]">{branch.name}</strong>
                    </span>
                    {branchChosenCount > 0 && (
                      <span className="text-xs text-emerald-400 font-bold">
                        ({branchChosenCount} phòng)
                      </span>
                    )}
                  </div>

                  {/* Hiển thị trực quan sức chứa phòng đã chọn (Chỉ tính người lớn & trẻ > 15t) */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                    <span className="text-white/70">Sức chứa phòng chọn:</span>
                    <strong
                      className={
                        branchChosenCapacity >= countableGuests
                          ? 'text-emerald-400'
                          : branchChosenCount > 0
                          ? 'text-amber-300'
                          : 'text-white/60'
                      }
                    >
                      {branchChosenCapacity} / {countableGuests} khách tính sức chứa
                    </strong>
                    {branchChosenCount > 0 &&
                      (branchChosenCapacity >= countableGuests ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">
                          ✓ Đủ sức chứa
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-semibold">
                          Thiếu {countableGuests - branchChosenCapacity} chỗ
                        </span>
                      ))}
                  </div>
                  {currentParams.children > 0 && (
                    <div className="text-[11px] text-[#D0C8BC]">
                      Đoàn {totalPeople} người • {childrenUnder10Count + children10To15Count > 0 ? `Miễn tính sức chứa cho ${childrenUnder10Count + children10To15Count} trẻ ≤ 15 tuổi` : ''}
                    </div>
                  )}

                  <div className="flex items-baseline justify-center sm:justify-start gap-2 pt-0.5">
                    <span className="text-xs text-white/70">Tổng tiền tạm tính:</span>
                    <span className="text-xl sm:text-2xl font-serif font-bold text-[#F4BE9B]">
                      {branchTotal.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <p className="text-[10px] text-white/60">
                    (Đã bao gồm thuế &amp; phí dịch vụ • Chưa áp dụng mã giảm giá)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleProceedBranchBooking(branch)}
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all transform active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-2 ${
                    branchChosenCount > 0
                      ? 'bg-[#C4572E] hover:bg-[#b04a24] text-white'
                      : 'bg-white/15 hover:bg-white/25 text-white/90 border border-white/20'
                  }`}
                >
                  <span>Tiếp tục đặt phòng - Cơ sở này</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Banner Voucher Sang Trọng Ở Cuối Trang (Y hệt ảnh 1) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
        <div className="relative rounded-2xl overflow-hidden shadow-lg border border-[#3E2B20] bg-[#241812] text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
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
              onClick={() => onGoRoomList()}
              className="w-full sm:w-auto bg-[#C4572E] hover:bg-[#b04a24] text-white px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <span>Áp dụng mã &amp; Giữ phòng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
