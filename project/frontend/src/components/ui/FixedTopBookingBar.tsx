import React, { useState, useEffect } from 'react';
import { BookingDraft } from '../../services/dataService';

interface FixedTopBookingBarProps {
  draft: BookingDraft;
  onEditSearch: () => void;
  onHoldExpired?: () => void;
}

export const FixedTopBookingBar: React.FC<FixedTopBookingBarProps> = ({
  draft,
  onEditSearch,
  onHoldExpired,
}) => {
  const calculateSecondsLeft = () => {
    const diff = Math.max(0, Math.floor((draft.hold_expires_at - Date.now()) / 1000));
    return diff;
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(calculateSecondsLeft());

  useEffect(() => {
    setSecondsLeft(calculateSecondsLeft());
    const interval = setInterval(() => {
      const remaining = calculateSecondsLeft();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        if (onHoldExpired) {
          onHoldExpired();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [draft.hold_expires_at]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isUrgent = secondsLeft < 300;

  return (
    <div className="sticky top-0 z-40 bg-[#1A1615] text-[#F8F6F0] border-b border-white/10 shadow-md transition-all font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Cụm thông tin tóm tắt */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-white/80">
          <div className="font-semibold text-white">
            {draft.apartment_name}
          </div>

          <span className="text-white/30 hidden sm:inline">•</span>

          <div>
            {draft.check_in_date} — {draft.check_out_date} ({draft.nights} đêm)
          </div>

          <span className="text-white/30 hidden sm:inline">•</span>

          <div className="text-amber-200/90 font-medium">
            {draft.room_type_name} × {draft.num_rooms} phòng
          </div>

          <span className="text-white/30 hidden sm:inline">•</span>

          <div className="bg-white/10 px-2.5 py-0.5 rounded text-white font-medium">
            Đoàn của bạn: {draft.num_adults} người lớn
            {draft.num_children > 0 && `, ${draft.num_children} trẻ em`}
          </div>
        </div>

        {/* Cụm giá & đếm ngược giữ chỗ */}
        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-white/10">
          <div className="text-right">
            <span className="text-[10px] text-white/60 block uppercase tracking-wider">
              Tổng tiền
            </span>
            <span className="font-serif font-bold text-base sm:text-lg text-[#E49074]">
              {draft.total_price.toLocaleString('vi-VN')}đ
            </span>
          </div>

          {/* Đồng hồ giữ chỗ */}
          <div
            className={`px-3 py-1 rounded border text-[11px] font-mono font-bold ${
              isUrgent
                ? 'bg-red-950/60 border-red-500 text-red-300'
                : 'bg-white/5 border-white/20 text-amber-200'
            }`}
            title="Thời gian giữ phòng còn lại"
          >
            Thời gian giữ chỗ: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>

          {/* Sửa tìm kiếm */}
          <button
            type="button"
            onClick={onEditSearch}
            className="border border-white/30 hover:border-white hover:bg-white/10 text-white px-3 py-1 rounded text-xs transition-colors cursor-pointer"
          >
            Sửa tìm kiếm
          </button>
        </div>
      </div>
    </div>
  );
};
