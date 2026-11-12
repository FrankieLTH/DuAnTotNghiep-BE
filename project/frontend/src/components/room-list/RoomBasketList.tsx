import React, { useState, useEffect } from 'react';
import {
  Basket,
  SearchCriteria,
  getRoomBaskets,
} from '../../services/dataService';
import { calculateNights } from '@shared/helpers/pricing';

interface RoomBasketListProps {
  criteria: SearchCriteria;
  onSelectBasket: (basket: Basket) => void;
  onSwitchToIndividual?: () => void;
  onSelectRoomDetail?: (roomId: number, basket: Basket) => void;
}

export const RoomBasketList: React.FC<RoomBasketListProps> = ({
  criteria,
  onSelectBasket,
  onSwitchToIndividual,
  onSelectRoomDetail,
}) => {
  const [baskets, setBaskets] = useState<Basket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'default' | 'price_asc' | 'price_desc'>('default');
  const [visibleCount, setVisibleCount] = useState<number>(4);
  const [extraMattressMap, setExtraMattressMap] = useState<Record<string, boolean>>({});

  const nights = calculateNights(criteria.checkIn, criteria.checkOut);
  const EXTRA_MATTRESS_NIGHTLY_RATE = 150000;

  const toggleExtraMattress = (basketId: string, itemIdx: number) => {
    const key = `${basketId}_item_${itemIdx}`;
    setExtraMattressMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getEnrichedBasket = (basket: Basket): Basket => {
    let mattressTotal = 0;
    const enrichedItems = basket.items.map((item, idx) => {
      const key = `${basket.id}_item_${idx}`;
      const hasMattress = !!extraMattressMap[key];
      const mattressFee = hasMattress ? EXTRA_MATTRESS_NIGHTLY_RATE * nights : 0;
      mattressTotal += mattressFee;

      return {
        ...item,
        hasExtraMattress: hasMattress,
        extraMattressFee: mattressFee,
      };
    });

    return {
      ...basket,
      items: enrichedItems,
      extraMattressTotal: mattressTotal,
      totalPrice: basket.totalPrice + mattressTotal,
    };
  };

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    getRoomBaskets({
      ...criteria,
      sort: sortOption,
    })
      .then((data) => {
        if (!isCancelled) {
          setBaskets(data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Lỗi khi tải giỏ phòng:', err);
          setError('Không thể tải danh sách giỏ phòng. Bạn có thể chuyển sang chế độ chọn từng phòng.');
          setLoading(false);
        }
      });

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
          Bạn có thể nới lỏng ngày đặt hoặc chuyển sang chọn từng phòng riêng lẻ.
        </p>
        {onSwitchToIndividual && (
          <button
            type="button"
            onClick={onSwitchToIndividual}
            className="mt-2 bg-[#9E472A] hover:bg-[#853C23] text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Chuyển sang chọn từng loại phòng →
          </button>
        )}
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

      {/* DANH SÁCH GIỎ PHÒNG */}
      <div className="space-y-8">
        {baskets.slice(0, visibleCount).map((rawBasket, bIndex) => {
          const basket = getEnrichedBasket(rawBasket);
          const isBestFit = basket.tags.includes('exact_fit');
          const isCheapest = basket.tags.includes('cheapest');

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
                      🛏️ Kèm nệm phụ (+{(basket.extraMattressTotal).toLocaleString('vi-VN')}đ)
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
                  <span>Chi tiết {basket.totalRooms} phòng trong combo:</span>
                  <span className="text-[#9E472A] font-semibold lowercase">
                    Nhấp vào tên hoặc ảnh phòng để xem chi tiết
                  </span>
                </div>

                {basket.items.map((item, itemIdx) => {
                  return (
                    <div
                      key={`${item.roomTypeId}_${itemIdx}`}
                      className="bg-[#FBF9F6] border border-[#EBE6DE] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between transition-all hover:border-[#D0C8BC]"
                    >
                      {/* Hình ảnh & Thông số cốt lõi */}
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
                        <div
                          onClick={() => onSelectRoomDetail && onSelectRoomDetail(item.roomTypeId, basket)}
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
                              onClick={() => onSelectRoomDetail && onSelectRoomDetail(item.roomTypeId, basket)}
                              className="font-bold text-base text-[#1A1615] hover:text-[#9E472A] cursor-pointer transition-colors flex items-center gap-1.5"
                              title="Nhấp để xem chi tiết phòng này"
                            >
                              <span>{item.roomTypeName}</span>
                              <span className="text-[11px] text-[#9E472A] font-normal hover:underline inline-flex items-center">
                                ↗
                              </span>
                            </h4>
                          </div>

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
                              onClick={() => onSelectRoomDetail && onSelectRoomDetail(item.roomTypeId, basket)}
                              className="text-[11px] text-[#9E472A] font-bold hover:underline cursor-pointer ml-1"
                            >
                              👁️ Xem chi tiết &gt;
                            </button>
                          </div>

                          {/* TÙY CHỌN DỊCH VỤ THÊM NỆM PHỤ */}
                          <div className="pt-1">
                            <label className="inline-flex items-center gap-2 bg-[#F5F2EB] hover:bg-[#EFECE3] px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors border border-[#E2DDD5]">
                              <input
                                type="checkbox"
                                checked={!!item.hasExtraMattress}
                                onChange={() => toggleExtraMattress(basket.id, itemIdx)}
                                className="w-4 h-4 accent-[#9E472A] rounded cursor-pointer"
                              />
                              <span>
                                🛏️ <strong>Thêm nệm phụ 1m2</strong> (+{EXTRA_MATTRESS_NIGHTLY_RATE.toLocaleString('vi-VN')}đ/đêm · Thêm 1 người ở chung)
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
                            {Math.round(item.unitPrice / nights).toLocaleString('vi-VN')}đ{' '}
                            <span className="font-normal text-xs text-[#736B63]">/ đêm</span>
                          </span>
                          {item.hasExtraMattress && (
                            <span className="text-[10px] text-[#9E472A] font-semibold block">
                              +{(EXTRA_MATTRESS_NIGHTLY_RATE * nights).toLocaleString('vi-VN')}đ nệm phụ ({nights} đêm)
                            </span>
                          )}
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
                      Gồm đúng {basket.totalRooms} phòng theo tìm kiếm
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
                      Tổng tiền trọn gói <strong>{basket.totalRooms} phòng</strong> ({nights} đêm):
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-serif text-[#9E472A]">
                        {basket.totalPrice.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    {basket.extraMattressTotal && basket.extraMattressTotal > 0 ? (
                      <span className="text-[11px] text-[#9E472A] font-semibold block">
                        (Đã bao gồm +{(basket.extraMattressTotal).toLocaleString('vi-VN')}đ tiền nệm phụ)
                      </span>
                    ) : null}
                    <span className="text-[11px] text-[#2A694E] font-medium block">
                      ✓ Đã gồm VAT, phí dọn dẹp &amp; dịch vụ
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectBasket(basket)}
                    className="w-full sm:w-auto bg-[#9E472A] hover:bg-[#853C23] text-white font-bold py-3.5 px-8 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    <span>Đặt trọn giỏ này ({basket.totalRooms} phòng)</span>
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
