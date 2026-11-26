import React, { useState, useEffect } from 'react';
import {
  Basket,
  SearchCriteria,
  RoomTypeOption,
  getRoomTypeOptions,
  getRoomBaskets,
} from '../../services/dataService';
import { calculateNights } from '@shared/helpers/pricing';

interface RoomBasketListProps {
  criteria: SearchCriteria;
  onSelectBasket: (basket: Basket) => void;
  onSelectRoomDetail?: (roomId: number, basket: Basket) => void;
}

export const RoomBasketList: React.FC<RoomBasketListProps> = ({
  criteria,
  onSelectBasket,
  onSelectRoomDetail,
}) => {
  const [baskets, setBaskets] = useState<Basket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'default' | 'price_asc' | 'price_desc'>('default');
  const [visibleCount, setVisibleCount] = useState<number>(4);
  const [extraMattressMap, setExtraMattressMap] = useState<Record<string, boolean>>({});
  const [variantOptions, setVariantOptions] = useState<Record<string, RoomTypeOption[]>>({});

  const nights = criteria.stayType === 'daytime' ? 1 : calculateNights(criteria.checkIn, criteria.checkOut);
  const EXTRA_MATTRESS_NIGHTLY_RATE = 150000;

  const toggleExtraMattress = (basketId: string, itemIdx: number) => {
    const key = `${basketId}_item_${itemIdx}`;
    setExtraMattressMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const itemKey = (basketId: string, itemIdx: number) => `${basketId}_item_${itemIdx}`;

  const updateItemQuantity = (basketId: string, itemIdx: number, quantity: number) => {
    const options = variantOptions[itemKey(basketId, itemIdx)] || [];
    setBaskets(previous => previous.map(basket => {
      if (basket.id !== basketId) return basket;
      const item = basket.items[itemIdx];
      if (!item) return basket;
      const selected = options.find(option => option.roomTypeId === item.roomTypeId);
      const max = selected?.availableCount ?? 0;
      const nextQuantity = Math.max(0, Math.min(Math.floor(quantity), max));
      return { ...basket, items: basket.items.map((row, index) => index === itemIdx
        ? { ...row, quantity: nextQuantity, roomIds: (selected?.roomIds || row.roomIds || []).slice(0, nextQuantity) }
        : row) };
    }));
  };

  const updateItemVariant = (basketId: string, itemIdx: number, roomTypeId: number) => {
    const key = itemKey(basketId, itemIdx);
    const option = variantOptions[key]?.find(row => row.roomTypeId === roomTypeId);
    if (!option) return;
    setBaskets(previous => previous.map(basket => {
      if (basket.id !== basketId) return basket;
      const item = basket.items[itemIdx];
      if (!item) return basket;
      const quantity = Math.min(item.quantity, option.availableCount);
      return { ...basket, items: basket.items.map((row, index) => index === itemIdx ? {
        ...row,
        roomTypeId: option.roomTypeId,
        variantKey: option.variantKey || String(option.roomTypeId),
        roomTypeName: option.name,
        maxOccupancy: (option as any).maxOccupancy || row.maxOccupancy,
        basePrice: option.basePricePerNight,
        unitPrice: option.totalPrice,
        roomIds: (option.roomIds || []).slice(0, quantity),
        features: option.features || [],
        featurePricePerNight: option.featurePricePerNight || 0,
        quantity,
      } : row) };
    }));
    setExtraMattressMap(previous => ({ ...previous, [key]: false }));
  };

  const getEnrichedBasket = (basket: Basket): Basket => {
    let mattressTotal = 0;
    const enrichedItems = basket.items.map((item, idx) => {
      const key = itemKey(basket.id, idx);
      const hasMattress = !!extraMattressMap[key] && item.quantity > 0;
      const mattressFee = hasMattress ? EXTRA_MATTRESS_NIGHTLY_RATE * nights * item.quantity : 0;
      mattressTotal += mattressFee;

      return {
        ...item,
        hasExtraMattress: hasMattress,
        extraMattressFee: mattressFee,
      };
    });

    const totalRooms = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalCapacity = enrichedItems.reduce((sum, item) => sum + (item.maxOccupancy || 2) * item.quantity, 0);
    const subtotal = enrichedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) + mattressTotal;
    const discountAmount = Math.min(subtotal, Number(basket.discountAmount || 0));
    const spare = totalCapacity - criteria.adults;

    // Reassign the searched party to the customized room counts and capacities.
    const expanded = enrichedItems.flatMap((item, itemIndex) => Array.from({ length: item.quantity }, (_, roomIndex) => ({ itemIndex, roomIndex, capacity: item.maxOccupancy || 2, guests: { adults: 1, children: 0 } })));
    let remainingAdults = criteria.adults - expanded.length;
    let assignable = remainingAdults >= 0 && totalCapacity >= criteria.adults;
    while (assignable && remainingAdults > 0) {
      const target = expanded.map((room, index) => ({ index, remaining: room.capacity - room.guests.adults })).sort((a, b) => b.remaining - a.remaining)[0];
      if (!target || target.remaining <= 0) { assignable = false; break; }
      expanded[target.index].guests.adults += 1;
      remainingAdults -= 1;
    }
    if (assignable) for (let i = 0; i < criteria.children; i++) expanded[i % Math.max(1, expanded.length)].guests.children += 1;
    let slot = 0;
    const allocatedItems = enrichedItems.map(item => ({ ...item, guests: assignable ? Array.from({ length: item.quantity }, () => expanded[slot++].guests) : [] }));
    const tags: Basket['tags'] = basket.tags.filter(tag => tag !== 'exact_fit');
    if (totalRooms > 0 && spare === 0) tags.push('exact_fit');

    return {
      ...basket,
      items: allocatedItems,
      totalRooms,
      totalCapacity,
      spare,
      tags,
      discountAmount: discountAmount || undefined,
      extraMattressTotal: mattressTotal,
      nightlyPrice: nights > 0 ? Math.round(Math.max(0, subtotal - discountAmount) / nights) : 0,
      totalPrice: Math.max(0, subtotal - discountAmount),
    };
  };

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const data = await getRoomBaskets({ ...criteria, sort: sortOption });
        if (isCancelled) return;
        setBaskets(data || []);
        setLoading(false);
        const typeIds = [...new Set((data || []).flatMap(basket => basket.items.map(item => item.roomTypeId)))];
        const results = await Promise.all(typeIds.map(async id => {
          try {
            const options = await getRoomTypeOptions(id, criteria.checkIn, criteria.checkOut, 1, { stayType: criteria.stayType, children: criteria.children, rooms: criteria.rooms });
            return [id, options] as [number, RoomTypeOption[]];
          } catch { return [id, []] as [number, RoomTypeOption[]]; }
        }));
        if (isCancelled) return;
        const byType = new Map<number, RoomTypeOption[]>(results);
        const keyed: Record<string, RoomTypeOption[]> = {};
        for (const basket of data || []) basket.items.forEach((item, index) => { keyed[itemKey(basket.id, index)] = byType.get(item.roomTypeId) || []; });
        setVariantOptions(keyed);
      } catch (err) {
        if (!isCancelled) {
          console.error('Lỗi khi tải giỏ phòng:', err);
          setError('Không thể tải các giỏ phòng gợi ý. Vui lòng kiểm tra ngày lưu trú hoặc thử tìm kiếm lại.');
          setLoading(false);
        }
      }
    };
    load();

    return () => {
      isCancelled = true;
    };
  }, [
    criteria.apartmentId,
    criteria.checkIn,
    criteria.checkOut,
    criteria.stayType,
    criteria.adults,
    criteria.children,
    criteria.rooms,
    criteria.voucherCode,
    sortOption,
  ]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-[#E2DDD5] rounded-2xl p-6 space-y-4">
            <div className="h-6 bg-[#EAE6DE] rounded w-1/3"></div>
            <div className="h-28 bg-[#F5F2EB] rounded-xl"></div>
            <div className="h-28 bg-[#F5F2EB] rounded-xl"></div>
            <div className="h-10 bg-[#EAE6DE] rounded-xl w-1/4 ml-auto"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || baskets.length === 0) {
    return (
      <div className="bg-white border border-[#E2DDD5] rounded-2xl p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 bg-[#F7EDE8] text-[#9E472A] rounded-full flex items-center justify-center mx-auto text-xl font-bold">
          ℹ️
        </div>
        <h3 className="font-serif font-bold text-lg text-[#1A1615]">
          {error || 'Không tìm thấy giỏ phòng phù hợp chính xác'}
        </h3>
        <p className="text-xs text-[#736B63] max-w-md mx-auto leading-relaxed">
          Hiện tại không có tổ hợp {criteria.rooms} phòng nào vừa khít cho đoàn {criteria.adults} người lớn trong khung giờ này.
          Bạn có thể điều chỉnh ngày hoặc số khách rồi tìm lại.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* THANH ĐIỀU KHIỂN & SẮP XẾP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2DDD5]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#1A1615] uppercase tracking-wider">
            Gợi ý {baskets.length} giỏ phòng tối ưu
          </span>
          <span className="text-xs text-[#736B63]">
            (Đoàn {criteria.adults} người lớn · {criteria.children} trẻ em · {criteria.rooms} phòng)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#736B63]">Sắp xếp giỏ:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="bg-white border border-[#E2DDD5] rounded-xl px-3 py-1.5 font-semibold text-[#1A1615] focus:outline-none focus:border-[#9E472A] cursor-pointer"
          >
            <option value="default">Tối ưu nhất (Vừa vặn &amp; Giá tốt)</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
          </select>
        </div>
      </div>

      {/* DANH SÁCH GIỎ PHÒNG - CHỈ HIỂN THỊ CÁC GIỎ ĐÁP ỨNG ĐỦ PHÒNG TRỐNG */}
      <div className="space-y-8">
        {baskets
          .filter((rawBasket) => {
            const basket = getEnrichedBasket(rawBasket);
            return basket.items.every((item, itemIdx) => {
              const options = variantOptions[itemKey(basket.id, itemIdx)];
              if (!options || !options.length) return true;
              const option = options.find(o => o.roomTypeId === item.roomTypeId);
              return option && option.availableCount >= item.quantity;
            });
          })
          .slice(0, visibleCount)
          .map((rawBasket, bIndex) => {
            const basket = getEnrichedBasket(rawBasket);
          const isBestFit = basket.tags.includes('exact_fit');
          const isCheapest = basket.tags.includes('cheapest');
          const inventoryValid = basket.items.every((item, itemIdx) => {
            const available = variantOptions[itemKey(basket.id, itemIdx)]?.find(option => option.roomTypeId === item.roomTypeId)?.availableCount;
            return available !== undefined && item.quantity <= available;
          });
          const canBook = inventoryValid && basket.totalRooms > 0 && basket.totalCapacity >= criteria.adults;

          return (
            <div
              key={basket.id || bIndex}
              className={`bg-white rounded-2xl overflow-hidden shadow-xs transition-all hover:shadow-md ${
                isBestFit
                  ? 'border-2 border-[#9E472A]'
                  : 'border border-[#E2DDD5]'
              }`}
            >
              {/* 1. HEADER GIỎ HÀNG: GHI RÕ SỐ LƯỢNG PHÒNG TRONG COMBO */}
              <div
                className={`px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b ${
                  isBestFit
                    ? 'bg-[#F7EDE8]/70 border-[#EFE2D9]'
                    : 'bg-[#FAF8F5] border-[#EBE6DE]'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="font-serif font-bold text-lg text-[#1A1615]">
                    Giỏ {bIndex + 1}
                  </span>

                  {/* HUY HIỆU SỐ LƯỢNG PHÒNG RÕ RÀNG */}
                  <span className="bg-[#1A1615] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                    🏠 Combo gồm: <strong>{basket.totalRooms} phòng</strong>
                  </span>

                  {isBestFit && (
                    <span className="bg-[#2A694E] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                      ✓ Vừa vặn (0 chỗ thừa)
                    </span>
                  )}

                  {isCheapest && (
                    <span className="bg-[#D97706] text-white text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
                      🏷️ Giá tốt nhất
                    </span>
                  )}

                  {basket.spare > 0 && (
                    <span className="bg-[#E0EFFE] text-[#1E40AF] text-xs font-bold px-3 py-1 rounded-full">
                      Dư {basket.spare} chỗ nghỉ
                    </span>
                  )}

                  {basket.extraMattressTotal && basket.extraMattressTotal > 0 ? (
                    <span className="bg-[#FEF3C7] text-[#92400E] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#FDE68A]">
                      🛏️ Kèm nệm phụ
                    </span>
                  ) : null}

                  {basket.relaxed && (
                    <span className="bg-[#FEF3C7] text-[#92400E] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#FDE68A]">
                      Đề xuất linh hoạt
                    </span>
                  )}
                </div>

                <div className="text-xs text-[#736B63] bg-white px-3 py-1 rounded-xl border border-[#EBE6DE]">
                  Tổng sức chứa: <strong>{basket.totalCapacity} người lớn</strong>
                  {basket.spare === 0 ? ' (Vừa khít cả đoàn)' : ` (Dư ${basket.spare} chỗ)`}
                </div>
              </div>

              {/* THÔNG BÁO NẾU ĐÂY LÀ GIỎ RELAXED FALLBACK */}
              {basket.relaxed && (
                <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-6 py-2 text-xs text-[#92400E] font-medium flex items-center gap-2">
                  <span>ℹ️ {basket.relaxed.note}</span>
                </div>
              )}

              {/* 2. DANH SÁCH TỪNG PHÒNG (BỐ CỤC TỪ TRÊN XUỐNG, ĐẦY ĐỦ THÔNG SỐ CỤ THỂ) */}
              <div className="p-6 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[#736B63] flex items-center justify-between border-b border-[#F0EBE1] pb-2">
                  <span>Các loại phòng trong giỏ · {basket.totalRooms} phòng đang chọn:</span>
                  <span className="text-[#9E472A] font-semibold lowercase">
                    Nhấp vào tên hoặc ảnh phòng để xem chi tiết
                  </span>
                </div>

                {basket.items.map((item, itemIdx) => {
                  const key = itemKey(basket.id, itemIdx);
                  const options = variantOptions[key] || [];
                  const selectedOption = options.find(option => option.roomTypeId === item.roomTypeId);
                  const maxQuantity = selectedOption?.availableCount ?? 0;
                  return (
                    <div
                      key={`${item.roomTypeId}_${itemIdx}`}
                      className="bg-[#FBF9F6] border border-[#EBE6DE] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between transition-all hover:border-[#D0C8BC]"
                    >
                      {/* Hình ảnh & Thông số cốt lõi */}
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
                        <div
                          onClick={() => onSelectRoomDetail && onSelectRoomDetail(item.roomId || item.roomTypeId, basket)}
                          className="w-full sm:w-36 h-28 sm:h-24 rounded-xl overflow-hidden shrink-0 shadow-2xs cursor-pointer group relative"
                          title="Nhấp để xem chi tiết phòng này"
                        >
                          <img
                            src={
                              item.image ||
                              'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=400&q=80'
                            }
                            alt={item.roomTypeName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                            👁️ Xem ảnh
                          </span>
                        </div>

                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* NHÃN SỐ LƯỢNG PHÒNG BẮT BUỘC */}
                            <span className="bg-[#9E472A] text-white text-xs font-bold px-2.5 py-0.5 rounded-lg shadow-2xs">
                              Số lượng: {item.quantity} phòng
                            </span>

                            <h4
                              onClick={() => onSelectRoomDetail && onSelectRoomDetail(item.roomId || item.roomTypeId, basket)}
                              className="font-bold text-base text-[#1A1615] hover:text-[#9E472A] cursor-pointer transition-colors flex items-center gap-1.5"
                              title="Nhấp để xem chi tiết phòng này"
                            >
                              <span>{item.roomTypeName}</span>
                              <span className="text-[11px] text-[#9E472A] font-normal hover:underline inline-flex items-center">
                                ↗
                              </span>
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 max-w-xl">
                            <label className="block text-[11px] text-[#736B63]">
                              <span className="block font-semibold mb-1">Biến thể phòng</span>
                              <select
                                value={item.roomTypeId}
                                onChange={event => updateItemVariant(basket.id, itemIdx, Number(event.target.value))}
                                disabled={!options.length}
                                className="w-full rounded-lg border border-[#D8CFC3] bg-white px-3 py-2 text-xs text-[#241C18] disabled:opacity-60"
                              >
                                {!options.length && <option value={item.roomTypeId}>Đang tải biến thể…</option>}
                                {options.length > 0 && !selectedOption && <option value={item.roomTypeId} disabled>{item.roomTypeName} · hiện không còn trống</option>}
                                {options.map(option => (
                                  <option key={option.roomTypeId} value={option.roomTypeId}>
                                    {option.variantLabel} · {Math.round(option.totalPrice / Math.max(1, nights)).toLocaleString('vi-VN')}đ/đêm · còn {option.availableCount}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="text-[11px] text-[#736B63]">
                              <span className="block font-semibold mb-1">Số phòng (còn {maxQuantity})</span>
                              <div className="inline-flex items-center rounded-lg border border-[#D8CFC3] bg-white overflow-hidden">
                                <button type="button" aria-label="Giảm số phòng" disabled={item.quantity <= 0} onClick={() => updateItemQuantity(basket.id, itemIdx, item.quantity - 1)} className="px-3 py-2 font-bold disabled:opacity-40">−</button>
                                <span className="min-w-10 text-center font-bold text-[#241C18]">{item.quantity}</span>
                                <button type="button" aria-label="Tăng số phòng" disabled={!selectedOption || item.quantity >= maxQuantity} onClick={() => updateItemQuantity(basket.id, itemIdx, item.quantity + 1)} className="px-3 py-2 font-bold disabled:opacity-40">+</button>
                              </div>
                            </div>
                          </div>
                          {item.quantity === 0 && <p className="text-[11px] text-[#8B6B5B]">Dòng này vẫn nằm trong giỏ nhưng hiện chưa chọn phòng.</p>}

                          {/* Thông số cụ thể */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[#736B63]">
                            {item.area && (
                              <span className="flex items-center gap-1 font-medium text-[#1A1615]">
                                📐 <strong>{item.area}m²</strong>
                              </span>
                            )}
                            {item.area && item.bedConfig && <span>•</span>}
                            {item.bedConfig && (
                              <span className="flex items-center gap-1 font-medium text-[#1A1615]">
                                🛏️ <strong>{item.bedConfig}</strong>
                              </span>
                            )}
                          </div>

                          {/* Tiện ích nổi bật & Nút xem chi tiết */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="bg-white border border-[#E2DDD5] text-[#44403C] px-2 py-0.5 rounded-md">
                              Vệ sinh khép kín
                            </span>
                            <span className="bg-white border border-[#E2DDD5] text-[#44403C] px-2 py-0.5 rounded-md">
                              Smart TV &amp; Wifi
                            </span>
                            {item.specialFeatures && (
                              <span className="bg-[#EDF5F1] border border-[#CDE3D5] text-[#2A694E] px-2 py-0.5 rounded-md font-semibold">
                                ✦ {item.specialFeatures}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => onSelectRoomDetail && onSelectRoomDetail(item.roomId || item.roomTypeId, basket)}
                              className="text-[11px] text-[#9E472A] font-bold hover:underline cursor-pointer ml-1"
                            >
                              👁️ Xem chi tiết &gt;
                            </button>
                          </div>

                          {item.features?.length ? <div className="mt-2 space-y-1 text-[11px] text-[#736B63]" aria-label="Đặc điểm và phụ thu">{item.features.map(f=><div key={f.id}>{f.name}: <strong>{Number(f.extra_price_per_night)>0?`+${Number(f.extra_price_per_night).toLocaleString('vi-VN')}đ/đêm`:'Đã bao gồm'}</strong></div>)}</div>:null}
                          {/* TÙY CHỌN DỊCH VỤ THÊM NỆM PHỤ */}
                          <div className="pt-1">
                            <label className="inline-flex items-center gap-2 bg-[#F5F2EB] hover:bg-[#EFECE3] px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors border border-[#E2DDD5]">
                              <input
                                type="checkbox"
                                checked={!!item.hasExtraMattress}
                                onChange={() => toggleExtraMattress(basket.id, itemIdx)}
                                disabled={item.quantity === 0}
                                className="w-4 h-4 accent-[#9E472A] rounded cursor-pointer"
                              />
                              <span>
                                🛏️ <strong>Thêm nệm phụ 1m2</strong> (thêm 1 người ở chung)
                              </span>
                              {item.hasExtraMattress && (
                                <span className="bg-[#2A694E] text-white text-[10px] font-bold px-1.5 py-0.2 rounded">
                                  Đã thêm
                                </span>
                              )}
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Khối Phân bổ khách & Đơn giá */}
                      <div className="w-full md:w-auto flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-[#E2DDD5] pt-3 md:pt-0 md:pl-5 shrink-0 gap-2">
                        <div className="bg-[#EDF5F1] text-[#2A694E] px-3 py-1.5 rounded-xl text-xs font-bold border border-[#CDE3D5] flex items-center gap-1.5">
                          <span>👤 Phân bổ:</span>
                          <strong className="text-sm">
                            {item.guests.map((g, gIdx) => (
                              <span key={gIdx}>
                                {item.quantity > 1 ? `P${gIdx + 1}: ` : ''}
                                {g.adults} lớn{g.children > 0 ? ` + ${g.children} bé` : ''}
                                {item.hasExtraMattress ? ' (+1 nệm phụ)' : ''}
                                {gIdx < item.guests.length - 1 ? ' | ' : ''}
                              </span>
                            ))}
                          </strong>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-[#736B63] block">
                            Đơn giá {item.quantity > 1 ? 'mỗi phòng' : 'phòng này'}:
                          </span>
                          <span className="font-bold text-sm text-[#1A1615]">
                            {Math.round((item.unitPrice + (item.hasExtraMattress ? EXTRA_MATTRESS_NIGHTLY_RATE * nights : 0)) / nights).toLocaleString('vi-VN')}đ{' '}
                            <span className="font-normal text-xs text-[#736B63]">/ đêm</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 3. FOOTER CỦA GIỎ: TỔNG TIỀN, TỔNG SỐ PHÒNG & NÚT HÀNH ĐỘNG */}
              <div className="bg-[#FAF8F5] border-t border-[#EBE6DE] p-5 sm:p-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5">
                {/* Lý do đề xuất */}
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#44403C] uppercase tracking-wider">
                      Tóm tắt combo:
                    </span>
                    <span className="bg-[#EAE6DE] text-[#1A1615] text-xs font-bold px-2 py-0.5 rounded">
                      Đã cập nhật theo {basket.totalRooms} phòng bạn chọn
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {basket.reasons.map((reason, rIdx) => (
                      <span
                        key={rIdx}
                        className="bg-white border border-[#E2DDD5] text-[#1A1615] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
                      >
                        <span className="text-[#2A694E] font-bold">✓</span> {reason}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Cột Tổng tiền & Nút Đặt giỏ này */}
                <div className="flex flex-col sm:flex-row md:flex-col items-end justify-between md:justify-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs text-[#736B63] block">
                      Tổng tiền <strong>{basket.totalRooms} phòng đã chọn</strong> ({nights} đêm):
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-serif text-[#9E472A]">
                        {basket.totalPrice.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <span className="text-[11px] text-[#2A694E] font-medium block">
                      ✓ Đã gồm VAT, phí dọn dẹp &amp; dịch vụ
                    </span>
                  </div>

                  {!canBook && (
                    <p className="max-w-xs text-right text-xs text-[#A83232] font-semibold">
                      {!inventoryValid
                        ? '⚠️ Hết phòng hoặc không đủ phòng trống cho thời gian này.'
                        : basket.totalRooms === 0
                        ? 'Chọn ít nhất 1 phòng để tiếp tục.'
                        : `Sức chứa ${basket.totalCapacity} chưa đủ cho ${criteria.adults} người lớn.`}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectBasket(basket)}
                    disabled={!canBook}
                    className="w-full sm:w-auto bg-[#9E472A] hover:bg-[#853C23] text-white font-bold py-3.5 px-8 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Tiếp tục với giỏ này ({basket.totalRooms} phòng)</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* NÚT XEM THÊM GIỎ NẾU CÒN */}
      {visibleCount < baskets.length && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 4)}
            className="bg-white border border-[#D0C8BC] hover:border-[#9E472A] text-[#1A1615] text-xs font-bold px-6 py-2.5 rounded-xl shadow-2xs transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Xem thêm {baskets.length - visibleCount} gợi ý giỏ phòng khác</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
