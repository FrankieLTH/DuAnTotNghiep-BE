import api from './api';

export interface AmenityItem {
  id: number;
  name: string;
  category?: string;
  icon?: string;
}

export interface ApartmentItem {
  id: number;
  name: string;
  address: string;
  city: string;
  status: string;
}

export interface RoomItem {
  id: number;
  apartment_id: number;
  apartment_name: string;
  address: string;
  city: string;
  room_type_id: number;
  room_type_name: string;
  room_number: string;
  status: 'available' | 'occupied' | 'maintenance' | 'inactive';
  base_price: number;
  max_occupancy: number;
  area: string;
  bed_type: string;
  last_maintenance_date?: string;
  images: string[];
  amenities: AmenityItem[];
  lock?: {
    id: number;
    cloud_lock_id: string;
    lock_name: string;
    lock_type: string;
    status: string;
  };
  description: string;
  badge?: string;
}

export interface ServiceItem {
  id: number;
  name: string;
  description: string;
  price: number;
  is_compensation?: boolean;
  is_active?: boolean;
}

export interface VoucherItem {
  id: number;
  code: string;
  title: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_discount_amount: number;
  min_order_value: number;
  description: string;
}

// 1. DỮ LIỆU TỪ BẢNG APARTMENTS (seed_data.sql & datn1.sql)
export const SEED_APARTMENTS: ApartmentItem[] = [
  {
    id: 1,
    name: 'Đồi Bông Gòn - CN1: Hải Đăng',
    address: 'Đường Hải Đăng, Phường 2, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    status: 'active',
  },
  {
    id: 2,
    name: 'Đồi Bông Gòn - CN1: Thiền Môn',
    address: 'Đường Trần Phú, Phường 5, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    status: 'active',
  },
  {
    id: 3,
    name: 'Đồi Bông Gòn - CN2: Retreat Triền Núi',
    address: 'Đường Vi Ba, Núi Lớn, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    status: 'active',
  },
];

// 2. DỮ LIỆU TỪ BẢNG AMENITIES (seed_data.sql & datn1.sql)
export const SEED_AMENITIES: Record<number, AmenityItem> = {
  1: { id: 1, name: 'Wi-Fi 5G tốc độ cao', category: 'Công nghệ', icon: '📶' },
  2: { id: 2, name: 'Điều hòa 2 chiều', category: 'Thiết bị', icon: '❄️' },
  3: { id: 3, name: 'Smart Lock tự động (TTLock)', category: 'An ninh', icon: '🔑' },
  4: { id: 4, name: 'Smart TV 55 inch 4K', category: 'Giải trí', icon: '📺' },
  5: { id: 5, name: 'Tủ lạnh Mini & Nước miễn phí', category: 'Ẩm thực', icon: '🧊' },
  6: { id: 6, name: 'Bếp điện & Dụng cụ nấu ăn', category: 'Nội thất', icon: '🍳' },
  7: { id: 7, name: 'Bồn tắm ngâm thư giãn', category: 'Phòng tắm', icon: '🛁' },
  8: { id: 8, name: 'Ban công ngắm thành phố', category: 'Tầm nhìn', icon: '🌇' },
  9: { id: 9, name: 'Máy sấy tóc & Bàn ủi', category: 'Cá nhân', icon: '👔' },
  10: { id: 10, name: 'Máy pha Cà phê Espresso', category: 'Ẩm thực', icon: '☕' },
};

// 3. DỮ LIỆU TỪ BẢNG ROOMS, ROOM_TYPES, ROOM_IMAGES, ROOM_AMENITIES, LOCKS (seed_data.sql & datn1.sql)
export const SEED_ROOMS: RoomItem[] = [
  {
    id: 1,
    apartment_id: 1,
    apartment_name: 'Đồi Bông Gòn - CN1: Hải Đăng',
    address: 'Đường Hải Đăng, Phường 2, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    room_type_id: 1,
    room_type_name: 'Sunset Penthouse & Jacuzzi 270°',
    room_number: 'P501 (Tầng Thượng)',
    status: 'available',
    base_price: 1890000,
    max_occupancy: 3,
    area: '55 m²',
    bed_type: '1 Queen Bed + Sofa Bed',
    last_maintenance_date: '2026-09-01',
    images: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: [
      SEED_AMENITIES[1],
      SEED_AMENITIES[2],
      SEED_AMENITIES[3],
      SEED_AMENITIES[4],
      SEED_AMENITIES[7],
      SEED_AMENITIES[8],
      SEED_AMENITIES[10],
    ],
    lock: {
      id: 1,
      cloud_lock_id: 'TTLOCK_BG_P501',
      lock_name: 'Smart Lock P501',
      lock_type: 'ttlock',
      status: 'online',
    },
    description: 'Tầng cao ngắm trọn hoàng hôn biển Vũng Tàu 270 độ, trang bị bồn sục Jacuzzi ngoài trời cao cấp và ban công mộc mạc ngát gió biển. Hệ thống tự động nhận phòng bằng mã PIN TTLock 24/7.',
    badge: 'SIGNATURE HOMESTAY',
  },
  {
    id: 2,
    apartment_id: 1,
    apartment_name: 'Đồi Bông Gòn - CN1: Hải Đăng',
    address: 'Đường Hải Đăng, Phường 2, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    room_type_id: 2,
    room_type_name: 'Sea View Balcony Room',
    room_number: 'P302',
    status: 'available',
    base_price: 850000,
    max_occupancy: 2,
    area: '42 m²',
    bed_type: '1 Giường King/Queen',
    last_maintenance_date: '2026-09-02',
    images: [
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: [
      SEED_AMENITIES[1],
      SEED_AMENITIES[2],
      SEED_AMENITIES[3],
      SEED_AMENITIES[4],
      SEED_AMENITIES[8],
    ],
    lock: {
      id: 2,
      cloud_lock_id: 'TTLOCK_BG_P302',
      lock_name: 'Smart Lock P302',
      lock_type: 'ttlock',
      status: 'online',
    },
    description: 'Ban công rộng nhìn thẳng ra biển Vũng Tàu, ngồi nhâm nhi trà buổi bình minh là một trải nghiệm khó quên cho bất kỳ ai tìm kiếm sự an yên.',
    badge: 'ĐẶT NHIỀU CUỐI TUẦN',
  },
  {
    id: 3,
    apartment_id: 1,
    apartment_name: 'Đồi Bông Gòn - CN1: Hải Đăng',
    address: 'Đường Hải Đăng, Phường 2, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    room_type_id: 3,
    room_type_name: 'The Cotton Cloud Suite',
    room_number: 'P201',
    status: 'available',
    base_price: 920000,
    max_occupancy: 2,
    area: '45 m²',
    bed_type: '1 Giường King',
    last_maintenance_date: '2026-08-25',
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: [
      SEED_AMENITIES[1],
      SEED_AMENITIES[2],
      SEED_AMENITIES[3],
      SEED_AMENITIES[4],
      SEED_AMENITIES[7],
      SEED_AMENITIES[8],
    ],
    lock: {
      id: 3,
      cloud_lock_id: 'TTLOCK_BG_P201',
      lock_name: 'Smart Lock P201',
      lock_type: 'ttlock',
      status: 'online',
    },
    description: 'Không gian ngập tràn ánh sáng với giường bông êm ái, bồn tắm view ban công ngắm sao trời, dành riêng cho những cặp đôi tận hưởng kỳ nghỉ.',
    badge: 'FAVORITE COUPLES',
  },
  {
    id: 4,
    apartment_id: 1,
    apartment_name: 'Đồi Bông Gòn - CN1: Hải Đăng',
    address: 'Đường Hải Đăng, Phường 2, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    room_type_id: 4,
    room_type_name: 'The Family Attic & Terrace',
    room_number: 'P401',
    status: 'available',
    base_price: 1250000,
    max_occupancy: 6,
    area: '85 m²',
    bed_type: '2 Phòng ngủ (2 King Bed)',
    last_maintenance_date: '2026-09-05',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: [
      SEED_AMENITIES[1],
      SEED_AMENITIES[2],
      SEED_AMENITIES[3],
      SEED_AMENITIES[4],
      SEED_AMENITIES[6],
      SEED_AMENITIES[8],
    ],
    lock: {
      id: 4,
      cloud_lock_id: 'TTLOCK_BG_P401',
      lock_name: 'Smart Lock P401',
      lock_type: 'ttlock',
      status: 'online',
    },
    description: 'Căn hộ 2 tầng lý tưởng cho gia đình, mang hơi thở mộc mạc đầy đủ nhà bếp riêng và ban công nướng BBQ rộng rãi ngắm view phố biển.',
    badge: 'BEST SELLER GIA ĐÌNH',
  },
  {
    id: 5,
    apartment_id: 2,
    apartment_name: 'Đồi Bông Gòn - CN1: Thiền Môn',
    address: 'Đường Trần Phú, Phường 5, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    room_type_id: 5,
    room_type_name: 'The Garden Suite (Trệt & Sân Hiên Đá)',
    room_number: 'P101 (Tầng Trệt)',
    status: 'available',
    base_price: 950000,
    max_occupancy: 2,
    area: '50 m²',
    bed_type: '1 Giường King',
    last_maintenance_date: '2026-09-10',
    images: [
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: [
      SEED_AMENITIES[1],
      SEED_AMENITIES[2],
      SEED_AMENITIES[3],
      SEED_AMENITIES[4],
      SEED_AMENITIES[7],
    ],
    lock: {
      id: 5,
      cloud_lock_id: 'TTLOCK_BG_P101',
      lock_name: 'Smart Lock P101',
      lock_type: 'ttlock',
      status: 'online',
    },
    description: 'Sân hiên vườn rợp bóng cây cỏ nhiệt đới, băng ghế bên ngoài hiên mộc mạc đón những làn gió tự nhiên lành lạnh của triền núi Vũng Tàu.',
    badge: 'GẦN GŨI THIÊN NHIÊN',
  },
  {
    id: 6,
    apartment_id: 3,
    apartment_name: 'Đồi Bông Gòn - CN2: Retreat Triền Núi',
    address: 'Đường Vi Ba, Núi Lớn, TP. Vũng Tàu',
    city: 'Vũng Tàu',
    room_type_id: 6,
    room_type_name: 'Hillside Studio & Workspace',
    room_number: 'P202',
    status: 'available',
    base_price: 880000,
    max_occupancy: 2,
    area: '38 m²',
    bed_type: '1 Giường Queen',
    last_maintenance_date: '2026-09-08',
    images: [
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: [
      SEED_AMENITIES[1],
      SEED_AMENITIES[2],
      SEED_AMENITIES[3],
      SEED_AMENITIES[4],
      SEED_AMENITIES[8],
    ],
    lock: {
      id: 6,
      cloud_lock_id: 'TTLOCK_BG_P202',
      lock_name: 'Smart Lock P202',
      lock_type: 'ttlock',
      status: 'online',
    },
    description: 'Bàn làm việc gỗ sồi rộng rãi nhìn ra hướng núi, thỏa mãn nhu cầu làm việc tự do hay trốn phố tìm sự an tĩnh và năng lượng sáng tạo mới.',
    badge: 'LÀM VIỆC & NGHỈ DƯỠNG',
  },
];

// 4. DỮ LIỆU TỪ BẢNG SERVICES (seed_data.sql & datn1.sql)
export const SEED_SERVICES: ServiceItem[] = [
  {
    id: 1,
    name: 'Thuê xe máy tay ga (1 ngày)',
    description: 'Xe Honda Vision/AirBlade đời mới đầy bình xăng',
    price: 150000,
    is_active: true,
  },
  {
    id: 2,
    name: 'Đưa đón sân bay (4 chỗ)',
    description: 'Đưa tiễn sân bay Nội Bài / Đà Nẵng / Liên Khương tận nơi',
    price: 300000,
    is_active: true,
  },
  {
    id: 3,
    name: 'Set tiệc nướng BBQ ngoài trời',
    description: 'Bao gồm bếp nướng, than & dụng cụ ướp thịt',
    price: 450000,
    is_active: true,
  },
  {
    id: 4,
    name: 'Dịch vụ giặt ủi sấy lấy ngay',
    description: 'Giặt sạch sấy khô thơm tho trong 4 tiếng',
    price: 60000,
    is_active: true,
  },
];

// 5. DỮ LIỆU TỪ BẢNG VOUCHERS (seed_data.sql & datn1.sql)
export const SEED_VOUCHERS: VoucherItem[] = [
  {
    id: 1,
    code: 'WELCOME2026',
    title: 'Giảm 10% cho khách hàng mới',
    discount_type: 'percentage',
    discount_value: 10,
    max_discount_amount: 100000,
    min_order_value: 500000,
    description: 'Áp dụng cho mọi đơn đặt phòng trực tiếp đầu tiên trên hệ thống.',
  },
  {
    id: 2,
    code: 'SUMMERVIP',
    title: 'Giảm ngay 200K đơn từ 1.5 triệu',
    discount_type: 'fixed_amount',
    discount_value: 200000,
    max_discount_amount: 200000,
    min_order_value: 1500000,
    description: 'Áp dụng cho đơn đặt phòng gia đình hoặc nhóm từ 1.500.000đ.',
  },
];

/**
 * Service lấy danh sách phòng (kết nối API Backend hoặc dự phòng seed_data chuẩn DB)
 */
export async function getRooms(params?: {
  apartment_id?: number;
  status?: string;
  min_price?: number;
  max_price?: number;
}): Promise<RoomItem[]> {
  try {
    const res = await api.get('/rooms', { params, timeout: 3000 });
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      // Map API result with seed enhancements
      return res.data.map((r: any) => {
        const seedMatch = SEED_ROOMS.find((sr) => sr.id === r.id);
        return {
          id: r.id,
          apartment_id: r.apartment_id || seedMatch?.apartment_id || 1,
          apartment_name: r.apartment_name || seedMatch?.apartment_name || 'Homestay',
          address: r.address || seedMatch?.address || '',
          city: seedMatch?.city || 'Việt Nam',
          room_type_id: r.room_type_id || seedMatch?.room_type_id || 1,
          room_type_name: r.room_type_name || seedMatch?.room_type_name || 'Studio',
          room_number: r.room_number || seedMatch?.room_number || 'P101',
          status: r.status || seedMatch?.status || 'available',
          base_price: Number(r.base_price) || seedMatch?.base_price || 550000,
          max_occupancy: r.max_occupancy || seedMatch?.max_occupancy || 2,
          area: seedMatch?.area || '30m²',
          bed_type: seedMatch?.bed_type || '1 Giường đôi King',
          last_maintenance_date: r.last_maintenance_date || seedMatch?.last_maintenance_date,
          images: (r.images && r.images.length > 0) ? r.images : (seedMatch?.images || []),
          amenities: (r.amenities && r.amenities.length > 0) ? r.amenities : (seedMatch?.amenities || []),
          lock: seedMatch?.lock,
          description: seedMatch?.description || 'Phòng nghỉ tiện nghi hiện đại.',
          badge: seedMatch?.badge,
        };
      });
    }
  } catch (err) {
    // Backend offline / connecting error: fallback seamlessly to seed data
  }

  // Fallback lọc từ dữ liệu seed của database
  let list = [...SEED_ROOMS];
  if (params?.apartment_id) {
    list = list.filter((r) => r.apartment_id === params.apartment_id);
  }
  if (params?.status) {
    list = list.filter((r) => r.status === params.status);
  }
  if (params?.min_price) {
    list = list.filter((r) => r.base_price >= params.min_price!);
  }
  if (params?.max_price) {
    list = list.filter((r) => r.base_price <= params.max_price!);
  }
  return list;
}

/**
 * Service lấy chi tiết 1 phòng theo ID
 */
export async function getRoomById(id: number): Promise<RoomItem> {
  const seedFallback = SEED_ROOMS.find((r) => r.id === id) || SEED_ROOMS[0];

  try {
    const res = await api.get(`/rooms/${id}`, { timeout: 500 });
    if (res.data) {
      const r = res.data;
      return {
        id: r.id,
        apartment_id: r.apartment_id || seedFallback.apartment_id,
        apartment_name: r.apartment_name || seedFallback.apartment_name,
        address: r.address || seedFallback.address,
        city: seedFallback.city,
        room_type_id: r.room_type_id || seedFallback.room_type_id,
        room_type_name: r.room_type_name || seedFallback.room_type_name,
        room_number: r.room_number || seedFallback.room_number,
        status: r.status || seedFallback.status,
        base_price: Number(r.base_price) || seedFallback.base_price,
        max_occupancy: r.max_occupancy || seedFallback.max_occupancy,
        area: seedFallback.area,
        bed_type: seedFallback.bed_type,
        last_maintenance_date: r.last_maintenance_date || seedFallback.last_maintenance_date,
        images: (r.images && r.images.length > 0) ? r.images : seedFallback.images,
        amenities: (r.amenities && r.amenities.length > 0) ? r.amenities : seedFallback.amenities,
        lock: seedFallback.lock,
        description: seedFallback.description,
        badge: seedFallback.badge,
      };
    }
  } catch (err) {
    // Fallback to seed data
  }

  return seedFallback;
}

/**
 * Service lấy danh sách chi nhánh (apartments)
 */
export async function getApartments(): Promise<ApartmentItem[]> {
  try {
    const res = await api.get('/apartments', { timeout: 500 });
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data.map((item: any) => {
        const match = SEED_APARTMENTS.find((sa) => sa.id === item.id);
        return {
          id: item.id,
          name: item.name,
          address: item.address,
          city: match?.city || 'Việt Nam',
          status: item.status || 'active',
        };
      });
    }
  } catch (err) {
    // Fallback
  }
  return SEED_APARTMENTS;
}

/**
 * Service lấy danh sách dịch vụ (services)
 */
export async function getServices(): Promise<ServiceItem[]> {
  try {
    const res = await api.get('/services', { timeout: 500 });
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    // Fallback
  }
  return SEED_SERVICES;
}

/**
 * Service lấy danh sách vouchers
 */
export async function getVouchers(): Promise<VoucherItem[]> {
  try {
    const res = await api.get('/vouchers', { timeout: 500 });
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    // Fallback
  }
  return SEED_VOUCHERS;
}


// ========================================================
// PHẦN 1: CÁC MODEL & TIỆN ÍCH CHO LUỒNG ĐẶT PHÒNG VÀ GIỮ CHỖ
// ========================================================

export interface SearchParams {
  branchId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  childrenAges: number[];
  rooms: number;
  promoCode?: string;
}

export interface NightPriceDetail {
  date: string;
  dayOfWeek: string;
  basePrice: number;
  extraFeePercent: number;
  extraFeeAmount: number;
  finalPricePerRoom: number;
}

export interface RoomTypeAvailability {
  room_type_id: number;
  name: string;
  max_occupancy: number;
  base_price: number;
  avg_price_per_night: number;
  total_nights_price: number; // cho số đêm x số phòng
  available_rooms: number;
  images: string[];
  amenities: AmenityItem[];
  description: string;
  area: string;
  bed_type: string;
  price_breakdown: NightPriceDetail[];
}

export type SlotStatus =
  | 'empty'
  | 'ocr_processing'
  | 'ocr_done'
  | 'confirmed'
  | 'error'
  | 'pending_admin';

export interface BookingGuestSlot {
  id: string;
  slot_index: number;
  guest_type: 'adult' | 'child';
  age?: number;
  is_booker: boolean;
  is_foreigner: boolean;
  full_name: string;
  date_of_birth: string;
  id_type: 'cccd' | 'passport';
  id_number: string;
  doc_front_path?: string;
  doc_back_path?: string;
  slot_status: SlotStatus;
  ocr_confidence?: number;
  retry_count: number;
  error_message?: string;
  warning_message?: string;
}

export interface SelectedRoomDetail {
  room_type_id: number;
  room_type_name: string;
  room_type_image: string;
  count: number;
  price: number;
  max_occupancy: number;
}

export interface BookingDraft {
  id: string;
  booking_code: string;
  apartment_id: number;
  apartment_name: string;
  apartment_address: string;
  room_type_id: number;
  room_type_name: string;
  room_type_image: string;
  num_rooms: number;
  booking_rooms?: SelectedRoomDetail[]; // Danh sách các phòng đã chọn khớp Booking_rooms trong ERD
  total_capacity?: number; // Tổng sức chứa của tất cả các phòng đã chọn
  check_in_date: string;
  check_out_date: string;
  nights: number;
  num_adults: number;
  num_children: number;
  children_ages: number[];
  price_breakdown: NightPriceDetail[];
  room_subtotal: number;
  extra_fee_total: number;
  service_total: number;
  voucher_code?: string;
  discount_amount: number;
  total_price: number;
  hold_expires_at: number; // timestamp ms
  status:
    | 'pending_info'
    | 'pending_payment'
    | 'confirmed'
    | 'checked_in'
    | 'checked_out'
    | 'cancelled';
  booker: {
    full_name: string;
    email: string;
    phone: string;
    is_staying: boolean;
    lock_email?: string;
    email_verified: boolean;
    consent_data_protection: boolean;
  };
  guests: BookingGuestSlot[];
}

// 4. MOCK DATA QUẢN TRỊ (ADMIN & SALE) - MỤC 1.7
export interface PriceRuleItem {
  id: number;
  room_type_id: number;
  room_type_name: string;
  price_type: 'base' | 'special';
  name: string;
  price: number;
  valid_from: string;
  valid_to: string;
  priority: number;
  status: 'active' | 'inactive';
}

export const SEED_PRICE_RULES: PriceRuleItem[] = [
  {
    id: 1,
    room_type_id: 1,
    room_type_name: 'Studio Cozy Standard',
    price_type: 'base',
    name: 'Giá chuẩn ngày thường',
    price: 550000,
    valid_from: '2026-01-01',
    valid_to: '2026-12-31',
    priority: 1,
    status: 'active',
  },
  {
    id: 2,
    room_type_id: 1,
    room_type_name: 'Studio Cozy Standard',
    price_type: 'special',
    name: 'Mùa du lịch lễ hội cao điểm',
    price: 750000,
    valid_from: '2026-11-15',
    valid_to: '2026-12-31',
    priority: 10,
    status: 'active',
  },
  {
    id: 3,
    room_type_id: 2,
    room_type_name: 'Deluxe Ocean View Balcony',
    price_type: 'base',
    name: 'Giá chuẩn View Biển',
    price: 950000,
    valid_from: '2026-01-01',
    valid_to: '2026-12-31',
    priority: 1,
    status: 'active',
  },
  {
    id: 4,
    room_type_id: 3,
    room_type_name: 'Family Suite 2 Bedrooms',
    price_type: 'base',
    name: 'Giá tiêu chuẩn Căn hộ Gia đình',
    price: 1650000,
    valid_from: '2026-01-01',
    valid_to: '2026-12-31',
    priority: 1,
    status: 'active',
  },
];

export interface ExtraFeeRuleItem {
  id: number;
  name: string;
  percentage: number;
  type: 'day_of_week' | 'date_range';
  daysOfWeek?: number[]; // [5, 6] = T6, T7
  date_start?: string;
  date_end?: string;
  is_recurring: boolean;
  status: 'active' | 'inactive';
}

export const SEED_EXTRA_FEES: ExtraFeeRuleItem[] = [
  {
    id: 1,
    name: 'Phụ thu cuối tuần (Thứ 6 & Thứ 7)',
    percentage: 15,
    type: 'day_of_week',
    daysOfWeek: [5, 6],
    is_recurring: true,
    status: 'active',
  },
  {
    id: 2,
    name: 'Phụ thu dịp Lễ Quốc Khánh & Tết',
    percentage: 25,
    type: 'date_range',
    date_start: '2026-12-24',
    date_end: '2027-01-02',
    is_recurring: false,
    status: 'active',
  },
];

export interface RoomBlockItem {
  id: number;
  room_id: number;
  room_number: string;
  apartment_name: string;
  start_date: string;
  end_date: string;
  reason: string;
}

export const SEED_ROOM_BLOCKS: RoomBlockItem[] = [
  {
    id: 1,
    room_id: 3,
    room_number: 'P103',
    apartment_name: 'Sunshine Villa Phố Cổ',
    start_date: '2026-11-10',
    end_date: '2026-11-12',
    reason: 'Bảo trì hệ thống khóa thông minh TTLock & sơn lại ban công',
  },
];

export interface VerificationQueueItem {
  id: string;
  booking_code: string;
  slot_index: number;
  guest_name: string;
  guest_type: 'adult' | 'child';
  id_number: string;
  doc_front_path: string;
  doc_back_path: string;
  failure_reason: string;
  created_at: string;
  audit_logs: { timestamp: string; staff_name: string; action: string }[];
  status: 'pending' | 'approved' | 'rejected';
}

export const SEED_VERIFICATION_QUEUE: VerificationQueueItem[] = [
  {
    id: 'VQ-01',
    booking_code: 'BK-202611-1002',
    slot_index: 2,
    guest_name: 'Trần Thị Mai',
    guest_type: 'adult',
    id_number: '034199008877',
    doc_front_path: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
    doc_back_path: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
    failure_reason: 'Ảnh chụp mặt trước bị chói đèn flash, OCR độ tin cậy thấp (62%)',
    created_at: '2026-11-02 10:15:00',
    audit_logs: [
      { timestamp: '2026-11-02 10:16:00', staff_name: 'Admin_Huy', action: 'Mở xem chi tiết ảnh căn cước' },
    ],
    status: 'pending',
  },
  {
    id: 'VQ-02',
    booking_code: 'BK-202611-1004',
    slot_index: 3,
    guest_name: 'Lê Hoàng Long',
    guest_type: 'child',
    id_number: '001209012345',
    doc_front_path: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    doc_back_path: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    failure_reason: 'Khách trẻ em 12 tuổi nhưng OCR nhầm năm sinh thành 2005',
    created_at: '2026-11-02 11:30:00',
    audit_logs: [],
    status: 'pending',
  },
];


export const PAYMENT_METHODS = [
  { id: 'vietqr', name: 'Chuyển khoản VietQR tức thì (PayOS)', isDefault: true },
  { id: 'atm', name: 'Thẻ ATM Nội địa (Napas)', isDefault: false },
  { id: 'card', name: 'Thẻ Quốc Tế (Visa / Mastercard / JCB)', isDefault: false },
  { id: 'ewallet', name: 'Ví Điện Tử (MoMo / ZaloPay)', isDefault: false },
];
