import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface RoomBookingSidebarProps {
  roomId: number;
  roomTitle: string;
  branch: string;
  onProceedToCheckout: (bookingDetails: any) => void;
}

export const RoomBookingSidebar: React.FC<RoomBookingSidebarProps> = ({
  roomId,
  roomTitle,
  branch,
  onProceedToCheckout,
}) => {
  const [checkInDate, setCheckInDate] = useState('2024-11-15');
  const [checkOutDate, setCheckOutDate] = useState('2024-11-16');
  const [guests, setGuests] = useState('2 Khách');
  const [includeBBQ, setIncludeBBQ] = useState(true);
  const [includeVespa, setIncludeVespa] = useState(false);

  const basePrice = 1890000;
  const bbqPrice = includeBBQ ? 350000 : 0;
  const vespaPrice = includeVespa ? 150000 : 0;
  const discountAmount = 283500;
  const totalPrice = basePrice + bbqPrice + vespaPrice - discountAmount;

  return (
    <div className="bg-white p-6 rounded-2xl border border-secondary-sand shadow-md sticky top-6 space-y-6 font-sans">
      {/* Header price */}
      <div className="flex items-baseline justify-between border-b border-secondary-sand pb-4">
        <div>
          <span className="text-xs text-brand-earth/50 line-through block">2.100.000đ</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold font-serif text-brand-terracotta">
              1.890.000đ
            </span>
            <span className="text-xs font-sans text-brand-earth/70">/ đêm</span>
          </div>
        </div>
        <Badge variant="discount">Giảm 10% Trực Tiếp</Badge>
      </div>

      {/* Form Controls */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-brand-earth/80 block mb-1">
              Nhận phòng (Check-in)
            </label>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className="w-full bg-secondary-cream border border-secondary-sand rounded-xl px-3 py-2 text-xs font-sans outline-none focus:border-brand-terracotta"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brand-earth/80 block mb-1">
              Trả phòng (Check-out)
            </label>
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className="w-full bg-secondary-cream border border-secondary-sand rounded-xl px-3 py-2 text-xs font-sans outline-none focus:border-brand-terracotta"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-brand-earth/80 block mb-1">
            Số lượng khách
          </label>
          <select
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="w-full bg-secondary-cream border border-secondary-sand rounded-xl px-3 py-2 text-xs font-sans outline-none focus:border-brand-terracotta"
          >
            <option value="2 Khách">2 Người lớn (Tiêu chuẩn)</option>
            <option value="3 Khách">3 Người lớn (+Phụ thu)</option>
            <option value="4 Khách">4 Khách (Tối đa)</option>
          </select>
        </div>
      </div>

      {/* Add-on services */}
      <div className="space-y-2 pt-2 border-t border-secondary-sand/60">
        <span className="text-xs font-bold text-brand-earth block mb-2">
          🎁 Dịch vụ trải nghiệm đi kèm:
        </span>
        <label className="flex items-center gap-2.5 text-xs text-brand-earth cursor-pointer p-2 rounded-lg hover:bg-secondary-cream">
          <input type="checkbox" checked readOnly className="accent-brand-terracotta" />
          <span>Khay trà thảo mộc hoa cúc mừng khách</span>
          <span className="ml-auto font-semibold text-semantic-success">Miễn phí</span>
        </label>

        <label className="flex items-center gap-2.5 text-xs text-brand-earth cursor-pointer p-2 rounded-lg hover:bg-secondary-cream">
          <input
            type="checkbox"
            checked={includeBBQ}
            onChange={(e) => setIncludeBBQ(e.target.checked)}
            className="accent-brand-terracotta"
          />
          <span>Set BBQ hải sản tươi Vũng Tàu (2 người)</span>
          <span className="ml-auto font-semibold text-brand-earth/80">+350.000đ</span>
        </label>

        <label className="flex items-center gap-2.5 text-xs text-brand-earth cursor-pointer p-2 rounded-lg hover:bg-secondary-cream">
          <input
            type="checkbox"
            checked={includeVespa}
            onChange={(e) => setIncludeVespa(e.target.checked)}
            className="accent-brand-terracotta"
          />
          <span>Thuê xe Vespa / Sh vi vu hải đăng</span>
          <span className="ml-auto font-semibold text-brand-earth/80">+150.000đ</span>
        </label>
      </div>

      {/* Price Calculation Summary */}
      <div className="bg-secondary-cream p-4 rounded-xl border border-secondary-sand space-y-2 text-xs">
        <div className="flex justify-between text-brand-earth/80">
          <span>Giá phòng (1 đêm):</span>
          <span className="font-semibold">{basePrice.toLocaleString('vi-VN')}đ</span>
        </div>
        {includeBBQ && (
          <div className="flex justify-between text-brand-earth/80">
            <span>Set BBQ hải sản:</span>
            <span className="font-semibold">+350.000đ</span>
          </div>
        )}
        {includeVespa && (
          <div className="flex justify-between text-brand-earth/80">
            <span>Thuê xe Vespa:</span>
            <span className="font-semibold">+150.000đ</span>
          </div>
        )}
        <div className="flex justify-between text-brand-terracotta font-medium">
          <span>Mã giảm BONGGON15:</span>
          <span>-{discountAmount.toLocaleString('vi-VN')}đ</span>
        </div>

        <div className="flex justify-between text-sm font-bold text-brand-earth pt-2 border-t border-secondary-sand">
          <span>Tổng thanh toán:</span>
          <span className="text-lg font-serif text-brand-terracotta">
            {totalPrice.toLocaleString('vi-VN')}đ
          </span>
        </div>
      </div>

      {/* CTA Action */}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={() =>
          onProceedToCheckout({
            roomId,
            roomTitle,
            branch,
            checkInDate,
            checkOutDate,
            totalPrice,
          })
        }
      >
        🔒 Đặt Phòng & Nhận Mã PIN
      </Button>

      <div className="text-[11px] text-center text-brand-earth/60 space-y-1">
        <p>⚡ Xác nhận tức thì - Mã PIN gửi ngay sau thanh toán</p>
        <p>📞 Hotline quản gia 24/7: <strong>0908.868.888</strong></p>
      </div>
    </div>
  );
};
