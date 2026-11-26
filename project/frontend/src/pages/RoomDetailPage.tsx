import { computeStayWindow } from '@shared/recommendation';
import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  getRoomById,
  getRoomTypeOptions,
  getRoomVariants,
  getVariantCalendar,
  RoomVariant,
  VariantCalendar,
  RoomTypeOption,
  getServices,
  getVouchers,
  RoomItem,
  ServiceItem,
  VoucherItem,
  SearchParams,
  BookingDraft,
  BookingGuestSlot,
} from '../services/dataService';
import type { Basket } from '@shared/index';

interface RoomDetailPageProps {
  roomId?: number;
  searchParams?: SearchParams;
  sourceBasket?: Basket | null;
  onGoBack: () => void;
  onProceedToCheckout: (bookingDetails: any) => void;
}

export const RoomDetailPage: React.FC<RoomDetailPageProps> = ({
  roomId = 1,
  searchParams,
  sourceBasket,
  onGoBack,
  onProceedToCheckout,
}) => {
  const [room, setRoom] = useState<RoomItem | null>(null);
  const [variantRoom,setVariantRoom] = useState<RoomItem|null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [availability, setAvailability] = useState<'checking' | 'available' | 'unavailable' | 'invalid'>('checking');
  const [options, setOptions] = useState<RoomTypeOption[]>([]);
  const [variants,setVariants] = useState<RoomVariant[]>([]);
  const [calendar,setCalendar] = useState<VariantCalendar|null>(null);
  const [calendarMonth,setCalendarMonth] = useState(new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Bangkok'}).slice(0,7));
  const [calendarNights,setCalendarNights] = useState(2);
  const [selectedOptionKey, setSelectedOptionKey] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(!searchParams?.checkIn);
  const [rangeAnchor, setRangeAnchor] = useState('');
  const [extraMattress, setExtraMattress] = useState(false);

  // Gallery active photo
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  // Booking parameters - Sử dụng thông tin từ searchParams nếu có
  // A direct visit to a room type has no booking dates until the guest chooses them.
  // Preserve dates only when the guest arrived with an explicit search/selected basket.
  const [checkInDate, setCheckInDate] = useState(searchParams?.checkIn || '');
  const [checkOutDate, setCheckOutDate] = useState(searchParams?.checkOut || '');
  const [guestCount, setGuestCount] = useState<number>(
    searchParams ? (searchParams.adults || 1) + (searchParams.children || 0) : 2
  );

  useEffect(()=>{
    if(!checkInDate||!checkOutDate)return;
    const days=Math.round((Date.parse(`${checkOutDate}T00:00:00Z`)-Date.parse(`${checkInDate}T00:00:00Z`))/86400000);
    if(days>=1&&days<=30)setCalendarNights(days);
  },[checkInDate,checkOutDate]);

  const [selectedServiceIds] = useState<Record<number, boolean>>({});
  const [appliedVoucherCode] = useState('');
  const [voucherInput] = useState('');
  const [voucherMsg] = useState<{text:string;isError:boolean}|null>(null);

  useEffect(() => {
    async function loadRoom() {
      try {
        setLoading(true);
        const rData = await getRoomById(roomId);
        setRoom(rData);
        setSelectedOptionKey(String(rData.room_type_id));
        getRoomVariants(rData.room_type_id).then(setVariants).catch(()=>setVariants([]));

        setActivePhotoIdx(0);
        setGuestCount(searchParams?.adults || Math.min(2, rData.max_occupancy));
      } catch (err) {
        console.error('Error fetching room detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRoom();
  }, [roomId]);

  useEffect(() => {
    if (!room) return;
    const todayLocal = new Date();
    const todayText = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;
    if (!checkInDate || !checkOutDate || checkInDate < todayText || checkOutDate <= checkInDate || guestCount < 1 || guestCount > Math.max(room.max_occupancy,...variants.map(v=>v.maxOccupancy))) {
      setAvailability('invalid'); return;
    }
    let active = true;
    setAvailability('checking');
    getRoomTypeOptions(room.room_type_id, checkInDate, checkOutDate, Math.max(1, guestCount - (searchParams?.children || 0)), { stayType: searchParams?.stayType, children: searchParams?.children || 0, rooms: searchParams?.rooms || 1 })
      .then(rows => { if (active) { setOptions(rows); setAvailability(rows.some(row=>row.variantKey===selectedOptionKey) ? 'available' : 'unavailable'); } })
      .catch(() => { if (active) setAvailability('unavailable'); });
    return () => { active = false; };
  }, [room, checkInDate, checkOutDate, guestCount, searchParams?.stayType, searchParams?.children, searchParams?.rooms, selectedOptionKey, variants]);

  useEffect(()=>{
    if(!room)return;
    let active=true;
    setCalendar(null);
    getVariantCalendar(Number(selectedOptionKey)||room.room_type_id,calendarMonth,1).then(value=>{if(active)setCalendar(value);}).catch(()=>{if(active)setCalendar(null);});
    return ()=>{active=false;};
  },[room,selectedOptionKey,calendarMonth,calendarNights]);

  useEffect(()=>{
    const selected=variants.find(v=>String(v.roomTypeId)===selectedOptionKey);
    if(!selected?.roomId){setVariantRoom(null);return;}
    let active=true;
    getRoomById(selected.roomId).then(value=>{if(active)setVariantRoom(value);}).catch(()=>{if(active)setVariantRoom(null);});
    return ()=>{active=false;};
  },[variants,selectedOptionKey]);

  // Calculate nights
  const dIn = new Date(checkInDate);
  const dOut = new Date(checkOutDate);
  const diffTime = dOut.getTime() - dIn.getTime();
  const stayWindow = computeStayWindow(checkInDate,checkOutDate,searchParams?.stayType||'fullday');
  const nights = stayWindow.nightsOrDays;

  const chosenOption = options.find(option => option.variantKey === selectedOptionKey);
  const selectedVariant = variants.find(v=>String(v.roomTypeId)===selectedOptionKey);
  const displayRoom=variantRoom?.room_type_id===selectedVariant?.roomTypeId?variantRoom:room;
  const listedPricePerNight = selectedVariant?.basePrice ?? Number(room?.base_type_price ?? room?.base_price ?? 0);
  const basePricePerNight = chosenOption ? chosenOption.basePricePerNight : 0;
  const roomPriceTotal = chosenOption?.totalPrice || 0;

  const servicesTotal = extraMattress ? 150000 * nights : 0;
  const discountAmount = 0;
  const totalPrice = roomPriceTotal + servicesTotal;

  const handleProceedWithBasket = () => {
    if (!sourceBasket || !room) return;

    const selectedBookingRooms = sourceBasket.items.map((it) => ({
      room_type_id: it.roomTypeId,
      room_ids:it.roomIds,features:it.features||[],feature_price_per_night:it.featurePricePerNight||0,
      room_type_name: it.roomTypeName,
      room_type_image: it.image || room.images[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      count: it.quantity,
      price: Math.round(it.unitPrice / nights),
      max_occupancy: it.maxOccupancy || 2,
      has_extra_bed: it.hasExtraMattress,
    }));

    const numAdults = searchParams?.adults || 2;
    const numChildren = searchParams?.children || 0;
    const slots: BookingGuestSlot[] = [];
    let slotIdx = 1;
    for (let i = 0; i < numAdults; i++) {
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
    for (let i = 0; i < numChildren; i++) {
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
      apartment_id: room.apartment_id,
      apartment_name: room.apartment_name,
      apartment_address: room.address,
      room_type_id: room.room_type_id || room.id,
      room_type_name: room.room_type_name,
      room_type_image: room.images[0] || '',
      num_rooms: sourceBasket.totalRooms,
      booking_rooms: selectedBookingRooms,
      total_capacity: sourceBasket.totalCapacity + (sourceBasket.extraMattressTotal ? 1 : 0),
      has_extra_bed: !!sourceBasket.extraMattressTotal,
      extra_bed_fee: sourceBasket.extraMattressTotal || 0,
      stay_type: (searchParams?.stayType || 'fullday') as BookingDraft['stay_type'],
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      nights,
      num_adults: numAdults,
      num_children: numChildren,
      children_ages: [],
      price_breakdown: [
        {
          date: checkInDate,
          dayOfWeek: 'Ngày nhận phòng',
          basePrice: room.base_price,
          extraFeePercent: 0,
          extraFeeAmount: 0,
          finalPricePerRoom: room.base_price,
        },
      ],
      room_subtotal: sourceBasket.totalPrice - (sourceBasket.extraMattressTotal || 0),
      extra_fee_total: sourceBasket.extraMattressTotal || 0,
      service_total: 0,
      discount_amount: sourceBasket.discountAmount || 0,
      total_price: sourceBasket.totalPrice,
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

    onProceedToCheckout(draft);
  };

  const handleProceedSingleRoom = (optionOverride?: RoomTypeOption) => {
    const option = optionOverride || chosenOption;
    const variant = optionOverride ? variants.find(v => v.roomTypeId === optionOverride.roomTypeId) : selectedVariant;
    if (!room || !option?.roomIds?.length) return;
    const nightly = option.basePricePerNight;
    const roomTotal = option.totalPrice;
    const stayNights = option.nights;
    const hasExtraMattress = extraMattress;
    const extraMattressFee = hasExtraMattress ? 150000 * stayNights : 0;
    const finalRoomPrice = roomTotal + extraMattressFee;

    const draft: BookingDraft = {
      id: `draft_${Date.now()}`,
      booking_code: `BK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      apartment_id: room.apartment_id,
      apartment_name: room.apartment_name,
      apartment_address: room.address,
      room_type_id: option.roomTypeId,
      room_type_name: option.name,
      room_type_image: displayRoom?.images[0] || room.images[0] || '',
      num_rooms: 1,
      booking_rooms: [
        {
          room_type_id: option.roomTypeId,
          room_ids:[option.roomIds[0]],features:[],feature_price_per_night:0,
          room_type_name: option.name,
          room_type_image: displayRoom?.images[0] || room.images[0] || '',
          count: 1,
          price: nightly,
          max_occupancy: (variant?.maxOccupancy||room.max_occupancy) + (hasExtraMattress ? 1 : 0),
          has_extra_bed: hasExtraMattress,
        },
      ],
      total_capacity: (variant?.maxOccupancy||room.max_occupancy) + (hasExtraMattress ? 1 : 0),
      has_extra_bed: hasExtraMattress,
      extra_bed_fee: extraMattressFee,
      stay_type: (searchParams?.stayType || 'fullday') as BookingDraft['stay_type'],
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      nights: stayNights,
      num_adults: guestCount,
      num_children: 0,
      children_ages: searchParams?.childrenAges || [],
      price_breakdown: [
        {
          date: checkInDate,
          dayOfWeek: 'Ngày nhận phòng',
          basePrice: nightly,
          extraFeePercent: 0,
          extraFeeAmount: 0,
          finalPricePerRoom: nightly,
        },
      ],
      room_subtotal: roomTotal,
      extra_fee_total: extraMattressFee,
      service_total: 0,
      discount_amount: discountAmount,
      total_price: finalRoomPrice,
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
      guests: [
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
      ],
    };

    onProceedToCheckout(draft);
  };

  if (loading) {
    return (
      <div className="bg-[#FAF7F2] min-h-screen py-24 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#C85A32] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#3E2C23] font-semibold text-sm">Đang tải dữ liệu chi tiết phòng từ hệ thống...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="bg-[#FAF7F2] min-h-screen py-24 text-center">
        <p className="text-lg font-bold text-[#3E2C23]">Không tìm thấy thông tin phòng yêu cầu.</p>
        <Button variant="primary" className="mt-4" onClick={onGoBack}>
          Quay lại danh sách phòng
        </Button>
      </div>
    );
  }

  const roomTitle = room.room_type_parent_name || room.room_type_name;
  const galleryPhotos = (displayRoom?.images||room.images).length > 0 ? (displayRoom?.images||room.images) : [
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
  ];

  const statusBadgeVariant = availability === 'available' ? 'feature-green' : 'warning';
  const statusLabel = availability === 'available' ? 'Có phương án còn trống theo ngày đã chọn' : availability === 'invalid' ? 'Khoảng ngày hoặc số khách không hợp lệ (ngày nhận phải từ hôm nay). Chọn ngày xanh trên lịch.' : availability === 'unavailable' ? 'Hết phòng trong khoảng ngày đã chọn. Xem ngày còn trống gợi ý bên dưới.' : 'Chọn ngày để xem phòng trống';

  return (
    <div className="bg-[#FAF7F2] min-h-screen pb-16 font-sans">
      {/* Header / Breadcrumb */}
      <div className="bg-[#FAF7F2] border-b border-[#E8DFD1]/70 pt-6 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center text-xs font-sans text-[#3E2C23]/60 space-x-2 mb-4">
            <button onClick={onGoBack} className="hover:text-[#C85A32] transition-colors">
              Trang chủ
            </button>
            <span>/</span>
            <button onClick={onGoBack} className="hover:text-[#C85A32] transition-colors">
              Danh sách phòng
            </button>
            <span>/</span>
            <span className="text-[#3E2C23] font-semibold">{roomTitle}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="signature">📍 {room.apartment_name}</Badge>
                <Badge variant={statusBadgeVariant}>● {statusLabel}</Badge>

              </div>
              <h1 className="text-3xl lg:text-4xl font-serif font-bold text-[#3E2C23]">
                {roomTitle}
              </h1>
              <p className="text-xs lg:text-sm font-sans text-[#7A6B63] mt-1">
                📍 {room.address} • ({room.city})
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onGoBack}>
              ← Quay lại danh sách
            </Button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Photo Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 rounded-3xl overflow-hidden shadow-md border border-[#E8DFD1] mb-10 bg-white p-3">
          {/* Main Large Photo */}
          <div className="md:col-span-8 relative h-[360px] md:h-[480px] rounded-2xl overflow-hidden">
            <img
              src={galleryPhotos[activePhotoIdx] || galleryPhotos[0]}
              alt={roomTitle}
              className="w-full h-full object-cover transition-all duration-500"
            />
            <span className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg font-medium">
              📷 {roomTitle} ({activePhotoIdx + 1}/{galleryPhotos.length})
            </span>
          </div>

          {/* Side Photo List / Thumbnails */}
          <div className="md:col-span-4 flex flex-col gap-3 h-[360px] md:h-[480px]">
            {galleryPhotos.map((photo, idx) => (
              <div
                key={idx}
                onClick={() => setActivePhotoIdx(idx)}
                className={`relative flex-1 rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-200 ${
                  activePhotoIdx === idx ? 'border-[#C85A32] shadow-md scale-[1.01]' : 'border-transparent opacity-85 hover:opacity-100'
                }`}
              >
                <img
                  src={photo}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Content Layout Grid (Left: Details, Right: Sticky Booking Form) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column - Details */}
          <div className="lg:col-span-7 space-y-8">
            {/* 1. Tổng Quan Không Gian */}
            <section className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E8DFD1] space-y-4 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-[#3E2C23] flex items-center gap-2">
                🏡 Tổng Quan Loại Phòng
              </h2>
              <p className="text-sm font-sans text-[#7A6B63] leading-relaxed">
                {displayRoom?.description||room.description}
              </p>

              {/* 4 Box thông số */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#F2ECE1] text-center">
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8DFD1]">
                  <span className="text-[11px] text-[#8C7A70] block uppercase font-bold">Diện tích</span>
                  <span className="text-sm font-bold text-[#3E2C23]">{displayRoom?.area||room.area}</span>
                </div>
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8DFD1]">
                  <span className="text-[11px] text-[#8C7A70] block uppercase font-bold">Sức chứa</span>
                  <span className="text-sm font-bold text-[#3E2C23]">{selectedVariant?.maxOccupancy||room.max_occupancy} Khách</span>
                </div>
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8DFD1]">
                  <span className="text-[11px] text-[#8C7A70] block uppercase font-bold">Giường ngủ</span>
                  <span className="text-xs font-bold text-[#3E2C23] truncate block">{displayRoom?.bed_type||room.bed_type}</span>
                </div>
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8DFD1]">
                  <span className="text-[11px] text-[#8C7A70] block uppercase font-bold">Khóa cửa</span>
                  <span className="text-xs font-bold text-[#C85A32] block">TTLock Smart PIN</span>
                </div>
              </div>
            </section>

            {/* 2. Tiện Nghi Thực Tế (Tải từ DB Seed Data: amenities & room_amenities) */}
            <section className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E8DFD1] space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-bold text-[#3E2C23]">
                  ✨ Tiện Nghi Có Sẵn Trong Phòng
                </h2>
                <span className="text-xs text-[#C85A32] font-semibold bg-[#C85A32]/10 px-3 py-1 rounded-full">
                  {(displayRoom?.amenities||room.amenities).length} Tiện ích đã gồm
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {(displayRoom?.amenities||room.amenities).map((amenity) => (
                  <div
                    key={amenity.id}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8DFD1]/80 hover:border-[#C85A32]/50 transition-colors"
                  >
                    <span className="text-xl shrink-0">{amenity.icon || '✓'}</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#3E2C23]">{amenity.name}</h4>
                      <p className="text-[11px] text-[#8C7A70]">
                        Phân loại: {amenity.category || 'Tiện ích nghỉ dưỡng'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {!(displayRoom?.amenities||room.amenities).length && <p className="text-sm text-[#7A6B63]">Loại phòng này chưa được gán tiện ích trong quản trị. Vui lòng liên hệ homestay để xác nhận trước khi đặt.</p>}
            </section>

            <section className="bg-[#2D1D16] text-white p-6 rounded-3xl">
              <h2 className="font-serif text-xl">Nhận phòng tự động</h2>
              <p className="text-sm mt-2 text-white/80">Số phòng và mã vào cửa được thông báo khi đơn đã thanh toán, xác nhận phân phòng và đến thời gian nhận phòng.</p>
            </section>
          </div>

          {/* Right Column - Booking Sidebar */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E8DFD1] shadow-xl sticky top-24 space-y-6">
              {/* Header Price */}
              <div className="flex items-baseline justify-between border-b border-[#F2ECE1] pb-4">
                <div>
                  <span className="text-xs text-[#8C7A70] uppercase font-bold tracking-wider block">
                    Giá niêm yết
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-serif text-[#C85A32]">
                      {listedPricePerNight.toLocaleString('vi-VN')}đ
                    </span>
                    <span className="text-xs font-sans text-[#7A6B63]">/ đêm</span>
                  </div>
                </div>
                <Badge variant="signature">Loại phòng</Badge>
              </div>

                            {/* Date-range bar (Booking.com style): pick check-in then check-out on a range calendar */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setCalendarOpen(o => !o)} className={`text-left bg-[#FAF7F2] border rounded-xl px-3 py-2.5 ${!checkInDate ? 'border-[#C85A32] ring-1 ring-[#C85A32]' : 'border-[#E8DFD1]'}`}>
                    <span className="block text-[10px] uppercase font-bold text-[#8C7A70]">Nhận phòng</span>
                    <span className="block text-sm font-semibold text-[#3E2C23]">{checkInDate ? checkInDate.split('-').reverse().join('/') : 'Chọn ngày'}</span>
                  </button>
                  <button type="button" onClick={() => setCalendarOpen(o => !o)} className={`text-left bg-[#FAF7F2] border rounded-xl px-3 py-2.5 ${checkInDate && !checkOutDate ? 'border-[#C85A32] ring-1 ring-[#C85A32]' : 'border-[#E8DFD1]'}`}>
                    <span className="block text-[10px] uppercase font-bold text-[#8C7A70]">Trả phòng</span>
                    <span className="block text-sm font-semibold text-[#3E2C23]">{checkOutDate ? checkOutDate.split('-').reverse().join('/') : 'Chọn ngày'}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-[#3E2C23]">Số khách</label>
                  <select value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} className="flex-1 bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl px-3 py-2 text-xs">
                    {Array.from({ length: Math.max(room.max_occupancy, ...variants.map(v => v.maxOccupancy)) }, (_, i) => i + 1).map(n => (<option key={n} value={n}>{n} khách</option>))}
                  </select>
                </div>
                {(!checkInDate || !checkOutDate) && <p className="text-xs bg-[#FFF4E8] border border-[#E8C9A8] text-[#8A5A2B] rounded-lg px-3 py-2">Chọn ngày nhận rồi ngày trả trên lịch để xem giá trọn kỳ và phòng trống.</p>}
                {calendarOpen && (
                  <div className="border border-[#E8DFD1] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={() => setCalendarMonth(m => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })} className="px-2 py-1 text-xs border rounded">‹</button>
                      <span className="text-xs font-semibold">{calendarMonth}</span>
                      <button type="button" onClick={() => setCalendarMonth(m => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })} className="px-2 py-1 text-xs border rounded">›</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#8C7A70]">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <span key={d}>{d}</span>)}</div>
                    <div className="grid grid-cols-7 gap-1">
                      {calendar?.days.map(day => {
                        const inRange = checkInDate && checkOutDate && day.date >= checkInDate && day.date <= checkOutDate;
                        const isEdge = day.date === checkInDate || day.date === checkOutDate;
                        const disabled = day.status !== 'available';
                        return <button key={day.date} type="button" disabled={disabled} title={disabled ? 'Hết phòng' : `Còn ${day.availableCount} phòng`} onClick={() => { if (!rangeAnchor || day.date <= rangeAnchor) { setRangeAnchor(day.date); setCheckInDate(day.date); setCheckOutDate(''); } else { setCheckOutDate(day.date); setRangeAnchor(''); } }} className={`rounded p-1 text-xs ${disabled ? 'bg-stone-100 text-stone-400' : isEdge ? 'bg-[#C85A32] text-white' : inRange ? 'bg-[#F3D9C4] text-[#7A4A22]' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-200'}`}>{Number(day.date.slice(-2))}</button>;
                      })}
                    </div>
                    <p className="text-[11px] text-[#795341]">Bấm ngày nhận, rồi bấm ngày trả. Ngày xám = hết phòng.</p>
                  </div>
                )}
              </div>

              {/* Offer rows: whole-stay price + conditions + scarcity + per-row Reserve (Booking.com room table) */}
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-semibold text-sm">Chọn hạng phòng &amp; giá trọn kỳ</h3>
                {variants.map(variant => {
                  const offer = options.find(o => o.roomTypeId === variant.roomTypeId);
                  const canReserve = !!offer?.roomIds?.length;
                  return (
                    <div key={variant.roomTypeId} className={`border rounded-xl p-3 space-y-2 ${selectedOptionKey === String(variant.roomTypeId) ? 'border-[#C85A32] ring-1 ring-[#C85A32]' : 'border-[#E8DFD1]'} ${!checkInDate || !checkOutDate ? 'opacity-70' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-sm text-[#3E2C23]">{variant.variantLabel}</strong>
                          <span className="block text-[11px] text-[#795341]">{variant.maxOccupancy} khách · {variant.basePrice.toLocaleString('vi-VN')}đ/đêm</span>
                          {(variant.amenities || []).length > 0 && (<span className="flex flex-wrap gap-1 mt-1">{(variant.amenities || []).map(a => (<span key={a.id} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F2ECE1] text-[#5C534B]">{a.name}</span>))}</span>)}
                          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Hủy trước nhận phòng · hoàn 50% (duyệt)</span>
                        </div>
                        <div className="text-right">
                          {offer ? (<><span className="block text-lg font-serif font-bold text-[#C85A32]">{offer.totalPrice.toLocaleString('vi-VN')}đ</span><span className="block text-[10px] text-[#795341]">{offer.nights} đêm · {offer.basePricePerNight.toLocaleString('vi-VN')}đ/đêm</span></>) : (<span className="block text-xs text-[#795341]">{!checkInDate || !checkOutDate ? 'Chọn ngày để xem giá' : 'Hết phòng khoảng ngày này'}</span>)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[#B4532A] font-semibold">{offer ? (offer.availableCount === 1 ? 'Chỉ còn 1 phòng ở mức giá này' : `Còn ${offer.availableCount} phòng`) : ''}</span>
                        <button type="button" disabled={!canReserve} onClick={() => { setSelectedOptionKey(String(variant.roomTypeId)); handleProceedSingleRoom(offer); }} className={`px-4 py-2 rounded-xl text-xs font-bold ${canReserve ? 'bg-[#C85A32] text-white hover:bg-[#A8481F]' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}>Đặt</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <label className="flex items-center gap-2 text-sm border-t pt-3"><input type="checkbox" checked={extraMattress} onChange={e => setExtraMattress(e.target.checked)} /> Nệm phụ</label>

              {sourceBasket && (
                <Button variant="primary" size="lg" className="w-full font-bold uppercase tracking-wider" disabled={room.status !== 'available'} onClick={handleProceedWithBasket}>
                  <span>Tiếp tục đặt trọn Giỏ này ({sourceBasket.totalRooms} phòng) →</span>
                </Button>
              )}<div className="text-[11px] text-center text-[#8C7A70] space-y-1">
                <p>⚡ Nhận phòng tự động 24/7 với Smart Lock TTLock</p>
                <p>📞 Hotline quản gia 24/7: <strong>0901.234.567</strong></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
