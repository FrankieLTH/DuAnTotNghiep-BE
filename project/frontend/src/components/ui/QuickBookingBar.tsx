import React, { useState } from 'react';
import { Button } from './Button';

interface QuickBookingBarProps {
  onApplyVoucher?: (code: string) => void;
  onSelectBranch?: (branch: string) => void;
}

export const QuickBookingBar: React.FC<QuickBookingBarProps> = ({
  onApplyVoucher,
  onSelectBranch,
}) => {
  const [branch, setBranch] = useState('Đồi Bông Gòn 1 - 42/6 Hải Đăng');
  const [voucher, setVoucher] = useState('BONGGON15');

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setBranch(val);
    if (onSelectBranch) onSelectBranch(val);
  };

  const handleVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onApplyVoucher && voucher.trim()) {
      onApplyVoucher(voucher.trim());
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-secondary-sand shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-6">
      {/* Lựa chọn chi nhánh */}
      <div className="flex-1">
        <label className="block text-xs font-bold uppercase tracking-wider text-brand-earth/70 mb-1">
          Lựa Chọn Chi Nhánh
        </label>
        <div className="relative">
          <select
            value={branch}
            onChange={handleBranchChange}
            className="w-full bg-secondary-cream border border-secondary-sand text-brand-earth text-sm font-semibold rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-terracotta cursor-pointer"
          >
            <option value="Đồi Bông Gòn 1 - 42/6 Hải Đăng">Đồi Bông Gòn 1 - 42/6 Hải Đăng</option>
            <option value="Đồi Bông Gòn 2 - Triển Núi Nhỏ">Đồi Bông Gòn 2 - Triển Núi Nhỏ</option>
            <option value="Đồi Bông Gòn 3 - Bãi Sau Vũng Tàu">Đồi Bông Gòn 3 - Bãi Sau Vũng Tàu</option>
          </select>
        </div>
      </div>

      {/* Mã ưu đãi Voucher */}
      <div className="flex-1">
        <label className="block text-xs font-bold uppercase tracking-wider text-brand-earth/70 mb-1">
          Mã Ưu Đãi Voucher
        </label>
        <form onSubmit={handleVoucherSubmit} className="flex gap-2">
          <input
            type="text"
            value={voucher}
            onChange={(e) => setVoucher(e.target.value)}
            placeholder="Nhập mã giảm giá..."
            className="flex-1 bg-secondary-cream border border-secondary-sand text-brand-earth font-bold tracking-wider text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-terracotta uppercase"
          />
          <Button type="submit" variant="primary" size="md">
            Áp dụng
          </Button>
        </form>
      </div>
    </div>
  );
};
