import React, { useState } from 'react';
import {
  TableContainer,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Input,
  Select,
  Drawer,
  ConfirmDialog,
  formatMoney,
  formatDate,
} from '../AdminUI';
import { IconPlus, IconEdit, IconX, IconCheck } from '../AdminIcons';
import { AdminUser } from '../AdminLayout';

export interface VoucherItem {
  id: number;
  code: string;
  title: string;
  discountType: 'percent' | 'fixed_amount';
  discountValue: number;
  maxDiscountAmount: number;
  minOrderValue: number;
  usedCount: number;
  usageLimit: number;
  validFrom: string;
  validTo: string;
  activeHoursStart?: string; // Khung giờ áp dụng (Admin form)
  activeHoursEnd?: string;
  isActive: boolean;
}

interface VouchersScreenProps {
  currentUser: AdminUser;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const VouchersScreen: React.FC<VouchersScreenProps> = ({
  currentUser,
  onShowToast,
}) => {
  const [vouchersList, setVouchersList] = useState<VoucherItem[]>([
    {
      id: 1,
      code: 'WELCOME10',
      title: 'Chào mừng khách lưu trú mới',
      discountType: 'percent',
      discountValue: 10,
      maxDiscountAmount: 200000,
      minOrderValue: 500000,
      usedCount: 24,
      usageLimit: 100,
      validFrom: '2026-10-01',
      validTo: '2026-12-31',
      activeHoursStart: '00:00',
      activeHoursEnd: '23:59',
      isActive: true,
    },
    {
      id: 2,
      code: 'WEEKENDSUN',
      title: 'Ưu đãi cuối tuần ấm áp',
      discountType: 'fixed_amount',
      discountValue: 150000,
      maxDiscountAmount: 150000,
      minOrderValue: 1000000,
      usedCount: 18,
      usageLimit: 50,
      validFrom: '2026-11-01',
      validTo: '2026-11-30',
      activeHoursStart: '12:00',
      activeHoursEnd: '22:00',
      isActive: true,
    },
    {
      id: 3,
      code: 'AUTUMN20',
      title: 'Mùa thu dịu êm triền núi',
      discountType: 'percent',
      discountValue: 20,
      maxDiscountAmount: 300000,
      minOrderValue: 1200000,
      usedCount: 50,
      usageLimit: 50,
      validFrom: '2026-09-01',
      validTo: '2026-10-31',
      isActive: false, // Expired / Inactive
    },
  ]);

  const [selectedVoucher, setSelectedVoucher] = useState<VoucherItem | null>(null);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState<boolean>(false);
  const [voucherToDeactivate, setVoucherToDeactivate] = useState<VoucherItem | null>(null);

  const handleSaveVoucher = () => {
    if (!selectedVoucher) return;
    if (!selectedVoucher.code.trim() || !selectedVoucher.title.trim()) {
      onShowToast('Vui lòng nhập đầy đủ mã voucher và tiêu đề!', 'error');
      return;
    }

    setVouchersList((prev) => {
      const exists = prev.find((v) => v.id === selectedVoucher.id);
      if (exists) {
        return prev.map((v) => (v.id === selectedVoucher.id ? selectedVoucher : v));
      }
      return [selectedVoucher, ...prev];
    });

    onShowToast(`Đã lưu mã giảm giá "${selectedVoucher.code}" thành công!`, 'success');
    setShowDrawer(false);
  };

  const handleToggleActiveVoucher = () => {
    if (!voucherToDeactivate) return;
    const nextActive = !voucherToDeactivate.isActive;
    setVouchersList((prev) =>
      prev.map((v) => (v.id === voucherToDeactivate.id ? { ...v, isActive: nextActive } : v))
    );
    onShowToast(
      `Đã ${nextActive ? 'kích hoạt' : 'vô hiệu hóa'} mã giảm giá "${voucherToDeactivate.code}".`,
      nextActive ? 'success' : 'warning'
    );
    setVoucherToDeactivate(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-[#E5E0D8] rounded-[6px]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[#1C1917]">
            Danh sách mã ưu đãi & Voucher ({vouchersList.length} mã)
          </h2>
          {currentUser.role === 'manager' && (
            <Badge variant="warning" size="sm">
              Chế độ chỉ xem
            </Badge>
          )}
        </div>

        {currentUser.role === 'admin' && (
          <Button
            variant="primary"
            size="sm"
            icon={<IconPlus className="w-4 h-4" />}
            onClick={() => {
              setSelectedVoucher({
                id: Date.now(),
                code: '',
                title: '',
                discountType: 'percent',
                discountValue: 10,
                maxDiscountAmount: 200000,
                minOrderValue: 500000,
                usedCount: 0,
                usageLimit: 100,
                validFrom: '2026-11-04',
                validTo: '2026-12-31',
                activeHoursStart: '00:00',
                activeHoursEnd: '23:59',
                isActive: true,
              });
              setShowDrawer(true);
            }}
          >
            Tạo mã giảm giá mới
          </Button>
        )}
      </div>

      {/* Vouchers Table */}
      <TableContainer>
        <TableHeader>
          <tr>
            <th className="py-3 px-3.5">Mã voucher</th>
            <th className="py-3 px-3.5">Tên chương trình</th>
            <th className="py-3 px-3.5">Loại giảm</th>
            <th className="py-3 px-3.5 text-right">Giá trị giảm</th>
            <th className="py-3 px-3.5 text-right">Đơn tối thiểu</th>
            <th className="py-3 px-3.5 text-center">Đã dùng / Giới hạn</th>
            <th className="py-3 px-3.5">Thời gian hiệu lực</th>
            <th className="py-3 px-3.5 text-center">Trạng thái</th>
            <th className="py-3 px-3.5 text-right">Thao tác</th>
          </tr>
        </TableHeader>
        <tbody>
          {vouchersList.map((v) => (
            <TableRow key={v.id}>
              {/* Code */}
              <td className="py-2.5 px-3.5 font-mono font-bold text-xs text-[#B4532A]">
                {v.code}
              </td>

              {/* Title */}
              <td className="py-2.5 px-3.5 text-xs text-[#1C1917] font-medium">{v.title}</td>

              {/* Discount type */}
              <td className="py-2.5 px-3.5 text-xs text-[#78716C]">
                {v.discountType === 'percent' ? 'Theo tỷ lệ %' : 'Số tiền cố định'}
              </td>

              {/* Value */}
              <td className="py-2.5 px-3.5 text-right font-mono text-xs font-bold text-[#1C1917] tabular-nums">
                {v.discountType === 'percent'
                  ? `${v.discountValue}% (tối đa ${formatMoney(v.maxDiscountAmount)})`
                  : formatMoney(v.discountValue)}
              </td>

              {/* Min order */}
              <td className="py-2.5 px-3.5 text-right font-mono text-xs text-[#78716C] tabular-nums">
                {formatMoney(v.minOrderValue)}
              </td>

              {/* Used count */}
              <td className="py-2.5 px-3.5 text-center font-mono text-xs text-[#44403C]">
                <span className="font-bold text-[#1C1917]">{v.usedCount}</span> / {v.usageLimit}
              </td>

              {/* Validity */}
              <td className="py-2.5 px-3.5 text-xs text-[#78716C]">
                {formatDate(v.validFrom)} &rarr; {formatDate(v.validTo)}
              </td>

              {/* Status */}
              <td className="py-2.5 px-3.5 text-center">
                <Badge variant={v.isActive ? 'success' : 'neutral'} size="sm">
                  {v.isActive ? 'Đang áp dụng' : 'Vô hiệu hóa'}
                </Badge>
              </td>

              {/* Actions */}
              <td className="py-2.5 px-3.5 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<IconEdit className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setSelectedVoucher(v);
                      setShowDrawer(true);
                    }}
                  >
                    {currentUser.role === 'admin' ? 'Sửa' : 'Xem'}
                  </Button>

                  {currentUser.role === 'admin' && (
                    <Button
                      variant={v.isActive ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setVoucherToDeactivate(v);
                        setShowDeactivateConfirm(true);
                      }}
                    >
                      {v.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                    </Button>
                  )}
                </div>
              </td>
            </TableRow>
          ))}
        </tbody>
      </TableContainer>

      {/* Drawer: Thêm / Sửa Voucher */}
      <Drawer
        isOpen={showDrawer && selectedVoucher !== null}
        onClose={() => setShowDrawer(false)}
        title={currentUser.role === 'admin' ? 'Cấu hình mã giảm giá' : 'Chi tiết mã giảm giá'}
        badge={
          currentUser.role === 'manager' && (
            <Badge variant="warning" size="sm">
              Chỉ xem
            </Badge>
          )
        }
        footer={
          currentUser.role === 'admin' ? (
            <div className="flex justify-end gap-2 w-full">
              <Button variant="secondary" size="md" onClick={() => setShowDrawer(false)}>
                Hủy
              </Button>
              <Button variant="primary" size="md" onClick={handleSaveVoucher}>
                Lưu mã ưu đãi
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="md" onClick={() => setShowDrawer(false)}>
              Đóng
            </Button>
          )
        }
      >
        {selectedVoucher && (
          <div className="space-y-4 text-xs">
            <Input
              label="Mã Code (viết hoa, không dấu)"
              disabled={currentUser.role === 'manager'}
              value={selectedVoucher.code}
              onChange={(e) =>
                setSelectedVoucher({ ...selectedVoucher, code: e.target.value.toUpperCase() })
              }
            />

            <Input
              label="Tên chương trình khuyến mãi"
              disabled={currentUser.role === 'manager'}
              value={selectedVoucher.title}
              onChange={(e) =>
                setSelectedVoucher({ ...selectedVoucher, title: e.target.value })
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Loại giảm giá"
                disabled={currentUser.role === 'manager'}
                value={selectedVoucher.discountType}
                onChange={(e) =>
                  setSelectedVoucher({
                    ...selectedVoucher,
                    discountType: e.target.value as any,
                  })
                }
              >
                <option value="percent">Giảm theo tỷ lệ %</option>
                <option value="fixed_amount">Giảm số tiền cố định (VNĐ)</option>
              </Select>

              <Input
                label="Giá trị giảm"
                type="number"
                disabled={currentUser.role === 'manager'}
                value={selectedVoucher.discountValue}
                onChange={(e) =>
                  setSelectedVoucher({
                    ...selectedVoucher,
                    discountValue: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Giảm tối đa (VNĐ)"
                type="number"
                disabled={currentUser.role === 'manager'}
                value={selectedVoucher.maxDiscountAmount}
                onChange={(e) =>
                  setSelectedVoucher({
                    ...selectedVoucher,
                    maxDiscountAmount: Number(e.target.value),
                  })
                }
              />
              <Input
                label="Giá trị đơn hàng tối thiểu"
                type="number"
                disabled={currentUser.role === 'manager'}
                value={selectedVoucher.minOrderValue}
                onChange={(e) =>
                  setSelectedVoucher({
                    ...selectedVoucher,
                    minOrderValue: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Hiệu lực từ ngày"
                type="date"
                disabled={currentUser.role === 'manager'}
                value={selectedVoucher.validFrom}
                onChange={(e) =>
                  setSelectedVoucher({ ...selectedVoucher, validFrom: e.target.value })
                }
              />
              <Input
                label="Hiệu lực đến ngày"
                type="date"
                disabled={currentUser.role === 'manager'}
                value={selectedVoucher.validTo}
                onChange={(e) =>
                  setSelectedVoucher({ ...selectedVoucher, validTo: e.target.value })
                }
              />
            </div>

            {/* Admin: Khung giờ áp dụng */}
            {currentUser.role === 'admin' && (
              <div className="p-3 bg-[#FAF9F7] border border-[#E5E0D8] rounded-[6px] space-y-2">
                <span className="font-semibold text-[#1C1917] block">
                  Cấu hình khung giờ áp dụng trong ngày (Admin)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Bắt đầu từ"
                    type="time"
                    value={selectedVoucher.activeHoursStart || '00:00'}
                    onChange={(e) =>
                      setSelectedVoucher({
                        ...selectedVoucher,
                        activeHoursStart: e.target.value,
                      })
                    }
                  />
                  <Input
                    label="Kết thúc lúc"
                    type="time"
                    value={selectedVoucher.activeHoursEnd || '23:59'}
                    onChange={(e) =>
                      setSelectedVoucher({
                        ...selectedVoucher,
                        activeHoursEnd: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Confirmation Dialog for Deactivating Voucher */}
      <ConfirmDialog
        isOpen={showDeactivateConfirm}
        onClose={() => setShowDeactivateConfirm(false)}
        onConfirm={handleToggleActiveVoucher}
        title={voucherToDeactivate?.isActive ? 'Vô hiệu hóa mã giảm giá' : 'Kích hoạt lại mã'}
        message={`Bạn có chắc chắn muốn ${
          voucherToDeactivate?.isActive ? 'vô hiệu hóa' : 'kích hoạt lại'
        } mã giảm giá "${voucherToDeactivate?.code}"? Khi vô hiệu hóa, khách hàng sẽ không thể áp dụng mã này khi đặt phòng.`}
        confirmLabel={voucherToDeactivate?.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
        variant={voucherToDeactivate?.isActive ? 'danger' : 'primary'}
      />
    </div>
  );
};
