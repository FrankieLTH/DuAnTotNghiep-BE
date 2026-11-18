import React, { useState, useEffect, useMemo } from 'react';
import { SearchBookingBar } from '../components/home/SearchBookingBar';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import {
  SEED_APARTMENTS, getApartments, getRooms,
  SearchParams,
  BookingDraft,
  BookingGuestSlot,
} from '../services/dataService';
import { suggestRoomTypes, SuggestedRoomType } from '../../../shared/helpers/roomSuggestion';
import { RoomBasketList } from '../components/room-list/RoomBasketList';
import type { Basket } from '@shared/index';

interface SearchResultPageProps {
  searchParams?: SearchParams;
  onGoHome: () => void;
  onGoRoomList: () => void;
  onSelectRoomType: (draft: BookingDraft) => void;
  onSelectRoomDetail?: (roomId: number, sourceBasket?: Basket) => void;
  onSearchAgain?: (params: SearchParams) => void;
}

interface RoomData {
  room_type_id?: number;
  features?: {id:number;name:string;extra_price_per_night:number}[];
  feature_price_per_night?: number;
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

  // Số phòng hiệu lực n: n = min(max(1, roomsWanted), tổng khách)
  const effectiveN = Math.min(
    Math.max(1, currentParams.rooms || 1),
    totalPeople
  );

  const handleRoomCountChange = (
    branchRooms: RoomData[],
    roomId: number,
    targetCount: number
  ) => {
    const targetRoom = branchRooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    // Giới hạn trong khoảng [0, min(availableCount, effectiveN)]
    const newCount = Math.max(
      0,
      Math.min(targetCount, targetRoom.availableCount, effectiveN)
    );
    const currentCount = selectedRoomCounts[roomId] || 0;

    if (newCount === currentCount) return;

    setSelectedRoomCounts((prev) => {
      const nextCounts = { ...prev };

      // Giảm phòng: cho phép giảm tự do (tổng có thể <= n theo rule 4.5)
      if (newCount < currentCount) {
        nextCounts[roomId] = newCount;
        return nextCounts;
      }

      // Tăng phòng:
      const otherRooms = branchRooms.filter((r) => r.id !== roomId);
      const otherTotal = otherRooms.reduce(
        (sum, r) => sum + (nextCounts[r.id] || 0),
        0
      );
      const newTotal = otherTotal + newCount;

      // Nếu tổng mới <= effectiveN: cập nhật bình thường
      if (newTotal <= effectiveN) {
        nextCounts[roomId] = newCount;
        return nextCounts;
      }

      // Nếu tổng mới > effectiveN: Tự cân bằng (Auto-balance)
      let excess = newTotal - effectiveN;

      // Ưu tiên giảm card có số phòng lớn nhất; nếu hòa thì card đứng cao hơn trong danh sách
      const sortedOthers = otherRooms
        .map((r, idx) => ({ room: r, count: nextCounts[r.id] || 0, index: idx }))
        .filter((item) => item.count > 0)
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return a.index - b.index;
        });

      for (const item of sortedOthers) {
        if (excess <= 0) break;
        const deduct = Math.min(item.count, excess);
        nextCounts[item.room.id] -= deduct;
        excess -= deduct;
      }

      // Cắt lại nếu không còn phòng khác để giảm
      const finalCount = newCount - excess;
      nextCounts[roomId] = Math.max(0, finalCount);

      return nextCounts;
    });

    setErrorNotice(null);
  };

  // 3 Chi nhánh chuẩn Đồi Bông Gòn với danh sách phòng dạng thanh ngang (Horizontal Room List)
  const seedBranches: BranchData[] = [
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

  // Tự động điền số phòng theo suggestedQty khi bộ lọc thay đổi
  useEffect(() => {
    const initialCounts: Record<number, number> = {};
    branches.forEach((branch) => {
      const suggested = suggestRoomTypes(branch.rooms, {
        adults: currentParams.adults,
        children: currentParams.children,
        roomsWanted: currentParams.rooms || 1,
        childrenAges: currentParams.childrenAges,
        countableGuests,
      });
      suggested.forEach((item) => {
        initialCounts[item.room.id] = item.suggestedQty;
      });
    });
    setSelectedRoomCounts(initialCounts);
  }, [
    currentParams.adults,
    currentParams.children,
    currentParams.childrenAges,
    currentParams.rooms,
    currentParams.checkIn,
    currentParams.checkOut,
    currentParams.branchId,
    countableGuests,
  ]);

  // Lọc chi nhánh theo bộ lọc (nếu branchId === 0 hoặc không chọn thì hiện cả 3 cơ sở)
  const [liveBranches, setLiveBranches] = useState<BranchData[] | null>(null);
  const [liveError, setLiveError] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([getApartments(), getRooms()])
      .then(([apts, rooms]) => {
        if (!active) return;
        setLiveBranches(apts.map(apt => ({
          ...seedBranches[0],
          id: apt.id,
          name: apt.name,
          address: apt.address,
          rooms: rooms.filter(r => r.apartment_id === apt.id && r.status !== 'maintenance' && r.status !== 'inactive')
            .map(r => ({
              ...seedBranches[0].rooms[0],
              id: r.id,
              room_type_id: r.room_type_id,
              name: r.room_type_name,
              price: r.base_price,
              maxGuests: r.max_occupancy,
              guests: r.max_occupancy + ' kh?ch',
              image: r.images[0] || '',
              bed: r.bed_type || 'Gi??ng ti?u chu?n',
              description: r.description || '',
              area: r.area,
              availableCount: 1,
              features: r.features || [],
              feature_price_per_night: r.feature_surcharge_per_night || 0,
            })),
        })));
      })
      .catch(() => { if (active) setLiveError(true); });
    return () => { active = false; };
  }, []);
  const branches = liveBranches || [];
  const displayedBranches = branches.filter((branch) => {
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
      room_type_id: r.room_type_id||r.id,
      room_ids:[r.id],features:r.features||[],feature_price_per_night:r.feature_price_per_night||0,
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
      room_type_id: firstRoom.room_type_id||firstRoom.id,
      room_type_name: firstRoom.name,
      room_type_image: firstRoom.image,
      num_rooms: totalCount,
      booking_rooms: selectedBookingRooms,
      total_capacity: totalSelectedCapacity,
      check_in_date: currentParams.checkIn,
      check_out_date: currentParams.checkOut,
        stay_type: currentParams.stayType || 'fullday',
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

  const handleSelectBasket = (basket: Basket) => {
    const branch = displayedBranches[0] || {
      id: 1,
      name: 'Đồi Bông Gòn - CN1: Hải Đăng',
      address: 'Đường Hải Đăng, Phường 2, TP. Vũng Tàu',
    };

    const selectedItems = basket.items.filter((item) => item.quantity > 0);
    if (!selectedItems.length) return;
    const firstItem = selectedItems[0];
    const selectedBookingRooms = selectedItems.map((it) => ({
      room_type_id: it.roomTypeId,
      room_ids:it.roomIds,features:it.features||[],feature_price_per_night:it.featurePricePerNight||0,
      room_type_name: it.roomTypeName,
      room_type_image: it.image || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      count: it.quantity,
      price: Math.round(it.unitPrice / calculatedNights),
      max_occupancy: it.maxOccupancy || 2,
      has_extra_bed: !!it.hasExtraMattress,
    }));

    const slots: BookingGuestSlot[] = [];
    let slotIdx = 1;
    for (let i = 0; i < currentParams.adults; i++) {
      slots.push({
        id: `slot-${slotIdx}`,
        slot_index: slotIdx,
        guest_type: 'adult',
        is_booker: slotIdx === 1,
        is_foreigner: false,
        full_name: '',
        date_of_birth: '',
        id_type: 'cccd',
        id_number: '',
        slot_status: 'empty',
        retry_count: 0,
      });
      slotIdx++;
    }
    for (let i = 0; i < currentParams.children; i++) {
      slots.push({
        id: `slot-${slotIdx}`,
        slot_index: slotIdx,
        guest_type: 'child',
        is_booker: false,
        is_foreigner: false,
        full_name: '',
        date_of_birth: '',
        id_type: 'cccd',
        id_number: '',
        slot_status: 'empty',
        retry_count: 0,
      });
      slotIdx++;
    }

    const draft: BookingDraft = {
      id: `draft_${Date.now()}`,
      booking_code: `BK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      apartment_id: basket.apartmentId || branch.id,
      apartment_name: basket.apartmentName || branch.name,
      apartment_address: branch.address,
      room_type_id: firstItem.roomTypeId,
      room_type_name: firstItem.roomTypeName,
      room_type_image: firstItem.image || '',
      num_rooms: basket.totalRooms,
      booking_rooms: selectedBookingRooms,
      total_capacity: basket.totalCapacity,
      has_extra_bed: !!basket.extraMattressTotal,
      extra_bed_fee: basket.extraMattressTotal || 0,
      stay_type: (currentParams.stayType || 'fullday') as BookingDraft['stay_type'],
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
          basePrice: firstItem.basePrice || Math.round(firstItem.unitPrice / calculatedNights),
          extraFeePercent: 0,
          extraFeeAmount: 0,
          finalPricePerRoom: firstItem.basePrice || Math.round(firstItem.unitPrice / calculatedNights),
        },
      ],
      room_subtotal: basket.totalPrice - (basket.extraMattressTotal || 0),
      extra_fee_total: basket.extraMattressTotal || 0,
      service_total: 0,
      discount_amount: basket.discountAmount || 0,
      total_price: basket.totalPrice,
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E2D8]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#73665C]">
            <span className="w-2 h-2 rounded-full bg-[#C4572E]"></span>
            <span>Các cơ sở lưu trú</span>
            <span>•</span>
            <span className="text-[#C4572E] font-bold">{displayedBranches.length} cơ sở sẵn sàng</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-medium text-[#73665C]">
            <span className="bg-[#FAF6F0] border border-[#E8E2D8] px-2.5 py-1 rounded-lg">Smart PIN 24/7</span>
            <span className="bg-[#FAF6F0] border border-[#E8E2D8] px-2.5 py-1 rounded-lg">Chọn phòng theo ngày</span>
          </div>
        </div>
      </div>

      {!liveBranches && <p className="max-w-6xl mx-auto px-4 text-sm text-[#73665C]">{liveError ? 'Chưa tải được danh sách phòng từ hệ thống. Vui lòng tải lại trang.' : 'Đang tải phòng và giá hiện tại…'}</p>}

      {/* CÔNG TẮC CHẾ ĐỘ HIỂN THỊ: THEO GIỎ PHÒNG (MẶC ĐỊNH) HOẶC XEM TỪNG LOẠI PHÒNG */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <RoomBasketList
          criteria={{
            apartmentId: currentParams.branchId > 0 ? currentParams.branchId : undefined,
            checkIn: currentParams.checkIn,
            checkOut: currentParams.checkOut,
            stayType: currentParams.stayType || 'fullday',
            adults: currentParams.adults,
            children: currentParams.children,
            rooms: currentParams.rooms,
          }}
          onSelectBasket={handleSelectBasket}
          onSelectRoomDetail={onSelectRoomDetail}
        />
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
