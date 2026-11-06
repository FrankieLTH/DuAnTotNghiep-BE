import React, { useState, useEffect, useRef } from 'react';
import { SEED_APARTMENTS, ApartmentItem, SearchParams } from '../../services/dataService';

interface SearchBookingBarProps {
  initialParams?: Partial<SearchParams>;
  onSearch?: (params: SearchParams) => void;
  className?: string;
}

export const SearchBookingBar: React.FC<SearchBookingBarProps> = ({
  initialParams,
  onSearch,
  className = '',
}) => {
  const apartments: ApartmentItem[] = SEED_APARTMENTS;

  // Format YYYY-MM-DD safely
  const formatDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const todayStr = formatDateStr(today);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const defaultCheckOutStr = formatDateStr(tomorrow);

  // States
  const [branchId, setBranchId] = useState<number>(
    initialParams?.branchId || apartments[0]?.id || 1
  );
  const [checkIn, setCheckIn] = useState<string>(initialParams?.checkIn || todayStr);
  const [checkOut, setCheckOut] = useState<string>(
    initialParams?.checkOut || defaultCheckOutStr
  );
  const [adults, setAdults] = useState<number>(initialParams?.adults ?? 2);
  const [children, setChildren] = useState<number>(initialParams?.children ?? 0);
  const [childrenAges, setChildrenAges] = useState<number[]>(
    initialParams?.childrenAges || []
  );
  const [rooms, setRooms] = useState<number>(initialParams?.rooms ?? 1);

  // UI States
  const [showGuestDropdown, setShowGuestDropdown] = useState<boolean>(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [ruleNotice, setRuleNotice] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowGuestDropdown(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setShowBranchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate nights
  const dIn = new Date(checkIn);
  const dOut = new Date(checkOut);
  const diffTime = dOut.getTime() - dIn.getTime();
  const calculatedNights = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Sync children ages array when children count changes
  const handleChildrenChange = (newCount: number) => {
    if (newCount < 0) return;
    setChildren(newCount);
    setChildrenAges((prev) => {
      if (newCount > prev.length) {
        const added = Array(newCount - prev.length).fill(8);
        return [...prev, ...added];
      } else {
        return prev.slice(0, newCount);
      }
    });
  };

  const handleAgeChange = (index: number, age: number) => {
    const updated = [...childrenAges];
    updated[index] = Math.max(0, Math.min(17, age));
    setChildrenAges(updated);
  };

  // Rule: Số phòng không lớn hơn số người lớn
  const handleAdultsChange = (newAdults: number) => {
    if (newAdults < 1) return;
    setAdults(newAdults);
    if (rooms > newAdults) {
      setRooms(newAdults);
      setRuleNotice(`Đã cân bằng lại ${newAdults} phòng (Mỗi phòng cần tối thiểu 1 người lớn).`);
      setTimeout(() => setRuleNotice(null), 4000);
    }
  };

  const handleRoomsChange = (newRooms: number) => {
    if (newRooms < 1) return;
    if (newRooms > adults) {
      setRuleNotice(`Không thể chọn ${newRooms} phòng: Mỗi phòng yêu cầu tối thiểu 1 người lớn (đoàn hiện có ${adults} người lớn).`);
      setTimeout(() => setRuleNotice(null), 4000);
      return;
    }
    setRooms(newRooms);
    setRuleNotice(null);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (branchId === undefined || branchId === null) {
      setValidationError('Vui lòng chọn chi nhánh homestay.');
      return;
    }

    if (checkOut <= checkIn) {
      setValidationError('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');
      return;
    }

    if (adults < 1) {
      setValidationError('Đoàn cần ít nhất 1 người lớn.');
      return;
    }

    if (rooms > adults) {
      setValidationError('Số phòng không được vượt quá số người lớn.');
      return;
    }

    const maxCapacityPerRoom = 4;
    // Quy tắc: Trẻ em <= 15 tuổi miễn tính sức chứa, chỉ trẻ > 15 tuổi tính là 1 khách
    const olderChildrenCount = childrenAges.filter((a) => a > 15).length;
    const countableGuests = adults + olderChildrenCount;
    if (countableGuests > maxCapacityPerRoom * rooms) {
      setValidationError(
        `Đoàn cần ${countableGuests} chỗ tính theo sức chứa (${adults} người lớn${olderChildrenCount > 0 ? ` + ${olderChildrenCount} trẻ trên 15 tuổi` : ''}; trẻ em ≤15 tuổi được miễn tính sức chứa), vượt quá sức chứa tối đa của ${rooms} phòng. Vui lòng tăng số phòng.`
      );
      return;
    }

    if (onSearch) {
      onSearch({
        branchId,
        checkIn,
        checkOut,
        adults,
        children,
        childrenAges,
        rooms,
      });
    }
    setShowGuestDropdown(false);
  };

  return (
    <div className={`w-full max-w-5xl mx-auto ${className}`}>
      {/* Alert Banner */}
      {validationError && (
        <div className="mb-3 px-4 py-2.5 bg-[#FDF2F2] border border-[#F3CECE] text-[#A83232] text-xs rounded-xl flex items-center justify-between shadow-xs">
          <span className="font-medium">{validationError}</span>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="text-[#A83232] hover:opacity-75 font-bold ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {ruleNotice && (
        <div className="mb-3 px-4 py-2 bg-[#FDF7EE] border border-[#F6E1C5] text-[#B86A1B] text-xs rounded-xl flex items-center justify-between shadow-xs">
          <span>{ruleNotice}</span>
          <button
            type="button"
            onClick={() => setRuleNotice(null)}
            className="text-[#B86A1B] hover:opacity-75 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Search Bar Form - THIẾT KẾ SẠCH SẼ, TUYỆT ĐỐI KHÔNG DÙNG ICON EMOJI */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-white rounded-2xl shadow-xl border border-[#E8E2D8] p-2 sm:p-2.5 flex flex-col lg:flex-row items-stretch lg:items-center gap-1.5 transition-shadow font-sans relative z-30"
      >
        {/* CỘT 1: CƠ SỞ LƯU TRÚ (CHI NHÁNH) */}
        <div className="flex-1 px-4 py-2 rounded-xl hover:bg-[#FAF6F0] transition-colors border-b lg:border-b-0 lg:border-r border-[#EFE8DD] relative" ref={branchDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setShowBranchDropdown(!showBranchDropdown);
              setShowGuestDropdown(false);
            }}
            className="w-full text-left focus:outline-none cursor-pointer"
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#73665C] mb-0.5">
              Cơ sở lưu trú
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-[#241C18] truncate">
                {branchId === 0
                  ? 'Tất cả cơ sở (Vũng Tàu)'
                  : (apartments.find((a) => a.id === branchId)?.name ?? 'Chọn cơ sở')}
              </span>
              <span className="text-xs text-[#73665C] ml-1">▾</span>
            </div>
          </button>

          {/* Popover chọn chi nhánh đồng bộ với Khách & Phòng */}
          {showBranchDropdown && (
            <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-[#E8E2D8] p-5 z-50 text-xs space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-[#EBE6DE] pb-3">
                <span className="font-bold text-[#241C18] text-sm">Chọn cơ sở lưu trú</span>
                <span className="text-[11px] text-[#73665C]">Tiêu chuẩn Đồi Bông Gòn</span>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {/* Lựa chọn Tất cả cơ sở */}
                <button
                  type="button"
                  onClick={() => {
                    setBranchId(0);
                    setValidationError(null);
                    setShowBranchDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between border ${
                    branchId === 0
                      ? 'bg-[#FAF6F0] border-[#C4572E] text-[#241C18] shadow-2xs'
                      : 'border-transparent hover:bg-[#FAF6F0] hover:border-[#E8E2D8] text-[#241C18]'
                  }`}
                >
                  <div>
                    <span className="font-bold text-xs block">Tất cả cơ sở (Vũng Tàu)</span>
                    <span className="text-[11px] text-[#73665C] block mt-0.5">Hệ thống 3 cơ sở tại Vũng Tàu</span>
                  </div>
                  {branchId === 0 && <span className="text-[#C4572E] font-bold text-xs">✓ Đang chọn</span>}
                </button>

                {/* Danh sách từng cơ sở */}
                {apartments.map((apt) => {
                  const isActive = apt.id === branchId;
                  return (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => {
                        setBranchId(apt.id);
                        setValidationError(null);
                        setShowBranchDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between border ${
                        isActive
                          ? 'bg-[#FAF6F0] border-[#C4572E] text-[#241C18] shadow-2xs'
                          : 'border-transparent hover:bg-[#FAF6F0] hover:border-[#E8E2D8] text-[#241C18]'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-xs block truncate">{apt.name}</span>
                        <span className="text-[11px] text-[#73665C] block truncate mt-0.5">{apt.address}</span>
                      </div>
                      {isActive && <span className="text-[#C4572E] font-bold text-xs shrink-0">✓ Đang chọn</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* CỘT 2: NGÀY ĐẾN */}
        <div className="w-full lg:w-44 px-4 py-2 rounded-xl hover:bg-[#FAF6F0] transition-colors border-b lg:border-b-0 lg:border-r border-[#EFE8DD]">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#73665C] mb-0.5">
            Nhận phòng
          </label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => {
              setCheckIn(e.target.value);
              setValidationError(null);
            }}
            className="w-full text-xs sm:text-sm font-semibold text-[#241C18] bg-transparent focus:outline-none cursor-pointer p-0"
          />
        </div>

        {/* CỘT 3: NGÀY ĐI */}
        <div className="w-full lg:w-48 px-4 py-2 rounded-xl hover:bg-[#FAF6F0] transition-colors border-b lg:border-b-0 lg:border-r border-[#EFE8DD]">
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#73665C]">
              Trả phòng
            </label>
            {calculatedNights > 0 && (
              <span className="text-[10px] font-bold text-[#C4572E] bg-[#F7EDE8] px-1.5 py-0.2 rounded font-mono">
                {calculatedNights} đêm
              </span>
            )}
          </div>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => {
              setCheckOut(e.target.value);
              setValidationError(null);
            }}
            className="w-full text-xs sm:text-sm font-semibold text-[#241C18] bg-transparent focus:outline-none cursor-pointer p-0"
          />
        </div>

        {/* CỘT 4: KHÁCH & PHÒNG */}
        <div className="w-full lg:w-64 px-4 py-2 rounded-xl hover:bg-[#FAF6F0] transition-colors relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => { setShowGuestDropdown(!showGuestDropdown); setShowBranchDropdown(false); }}
            className="w-full text-left focus:outline-none cursor-pointer"
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#73665C] mb-0.5">
              Khách &amp; Phòng
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-[#241C18] truncate">
                {adults} lớn{children > 0 ? `, ${children} trẻ` : ''} • {rooms} phòng
              </span>
              <span className="text-xs text-[#73665C] ml-1">▾</span>
            </div>
          </button>

          {/* Popover chọn khách & số phòng */}
          {showGuestDropdown && (
            <div className="absolute left-0 lg:left-auto lg:right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-[#E8E2D8] p-5 z-50 text-xs space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-[#EBE6DE] pb-3">
                <span className="font-bold text-[#241C18] text-sm">Số lượng khách &amp; phòng</span>
                <span className="text-[11px] text-[#73665C]">Tiêu chuẩn Đồi Bông Gòn</span>
              </div>

              {/* Người lớn */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#241C18] text-sm block">Người lớn</span>
                  <span className="text-[11px] text-[#73665C]">Từ 18 tuổi trở lên (Tối thiểu 1)</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleAdultsChange(adults - 1)}
                    disabled={adults <= 1}
                    className="w-8 h-8 rounded-full border border-[#D0C8BC] flex items-center justify-center font-bold text-[#241C18] hover:bg-[#FAF6F0] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    –
                  </button>
                  <span className="w-5 text-center font-bold text-sm text-[#241C18]">{adults}</span>
                  <button
                    type="button"
                    onClick={() => handleAdultsChange(adults + 1)}
                    className="w-8 h-8 rounded-full border border-[#D0C8BC] flex items-center justify-center font-bold text-[#241C18] hover:bg-[#FAF6F0] cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Trẻ em */}
              <div className="space-y-3 pt-3 border-t border-[#EBE6DE]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#241C18] text-sm block">Trẻ em</span>
                    <span className="text-[11px] text-[#73665C]">Dưới 18 tuổi</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleChildrenChange(children - 1)}
                      disabled={children <= 0}
                      className="w-8 h-8 rounded-full border border-[#D0C8BC] flex items-center justify-center font-bold text-[#241C18] hover:bg-[#FAF6F0] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      –
                    </button>
                    <span className="w-5 text-center font-bold text-sm text-[#241C18]">{children}</span>
                    <button
                      type="button"
                      onClick={() => handleChildrenChange(children + 1)}
                      className="w-8 h-8 rounded-full border border-[#D0C8BC] flex items-center justify-center font-bold text-[#241C18] hover:bg-[#FAF6F0] cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Danh sách ô nhập tuổi cho từng trẻ */}
                {children > 0 && (
                  <div className="bg-[#FAF6F0] p-3 rounded-xl border border-[#E8E2D8] space-y-2">
                    <div className="text-[10px] sm:text-[11px] font-semibold text-[#8C5228] bg-[#FBF3E8] p-2 rounded-lg border border-[#ECD9C6] leading-tight space-y-0.5">
                      <div>• <strong>Dưới 10 tuổi:</strong> Miễn CCCD &amp; không tính vào sức chứa.</div>
                      <div>• <strong>10 – 15 tuổi:</strong> Cần CCCD &amp; không tính vào sức chứa.</div>
                      <div>• <strong>Trên 15 tuổi:</strong> Cần CCCD &amp; tính là 1 khách.</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {childrenAges.map((age, idx) => (
                        <div key={idx} className="bg-white p-2 rounded-lg border border-[#E8E2D8]">
                          <div className="flex items-center justify-between text-[11px] font-medium text-[#73665C] mb-1">
                            <span>Trẻ {idx + 1}</span>
                            {age > 15 ? (
                              <span className="text-[8px] bg-[#FDF2F2] text-[#A83232] px-1 py-0.2 rounded font-bold" title="Cần CCCD và tính là 1 khách">
                                &gt;15t • Tính 1 khách
                              </span>
                            ) : age >= 10 ? (
                              <span className="text-[8px] bg-[#EEF4FF] text-[#2452A6] px-1 py-0.2 rounded font-bold" title="Cần CCCD nhưng miễn tính sức chứa">
                                10-15t • Cần CCCD
                              </span>
                            ) : (
                              <span className="text-[8px] bg-[#EDF5F1] text-[#2A694E] px-1 py-0.2 rounded font-bold" title="Miễn CCCD và miễn tính sức chứa">
                                &lt;10t • Miễn CCCD
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={17}
                              value={age}
                              onChange={(e) => handleAgeChange(idx, Number(e.target.value))}
                              className="w-full border border-[#D0C8BC] rounded px-2 py-1 text-xs font-bold text-center text-[#241C18]"
                            />
                            <span className="text-[10px] text-[#73665C]">tuổi</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Số phòng */}
              <div className="flex items-center justify-between pt-3 border-t border-[#EBE6DE]">
                <div>
                  <span className="font-bold text-[#241C18] text-sm block">Số phòng</span>
                  <span className="text-[11px] text-[#73665C]">Mỗi phòng cần ít nhất 1 người lớn</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleRoomsChange(rooms - 1)}
                    disabled={rooms <= 1}
                    className="w-8 h-8 rounded-full border border-[#D0C8BC] flex items-center justify-center font-bold text-[#241C18] hover:bg-[#FAF6F0] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    –
                  </button>
                  <span className="w-5 text-center font-bold text-sm text-[#241C18]">{rooms}</span>
                  <button
                    type="button"
                    onClick={() => handleRoomsChange(rooms + 1)}
                    disabled={rooms >= adults}
                    className="w-8 h-8 rounded-full border border-[#D0C8BC] flex items-center justify-center font-bold text-[#241C18] hover:bg-[#FAF6F0] cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Áp dụng */}
              <div className="pt-3 border-t border-[#EBE6DE] flex items-center justify-between">
                <span className="text-[11px] text-[#73665C]">
                  Tổng: <strong>{adults + children} người</strong> • {rooms} phòng
                </span>
                <button
                  type="button"
                  onClick={() => setShowGuestDropdown(false)}
                  className="bg-[#C4572E] text-white px-4 py-1.5 rounded-lg font-bold text-xs hover:bg-[#b04a24] transition-colors cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          )}
        </div>

        {/* NÚT TÌM PHÒNG CAM GẠCH NỔI BẬT */}
        <div className="p-1 shrink-0">
          <button
            type="submit"
            className="w-full lg:w-auto bg-[#C4572E] hover:bg-[#b04a24] text-white px-7 py-3 rounded-xl font-semibold text-xs uppercase tracking-wider transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <span>Tìm phòng</span>
            <span>→</span>
          </button>
        </div>
      </form>
    </div>
  );
};