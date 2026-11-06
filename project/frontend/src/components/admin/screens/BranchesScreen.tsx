import React, { useState, useEffect, useCallback } from 'react';
import {
  TableContainer,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Input,
  Drawer,
  ConfirmDialog,
} from '../AdminUI';
import { IconPlus, IconEdit, IconEyeOff, IconEye } from '../AdminIcons';
import { AdminUser } from '../AdminLayout';
import { adminApi, BranchItem, isValidPhoneNumber } from '../../../services/adminService';

interface BranchesScreenProps {
  currentUser: AdminUser;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const emptyBranchForm = { name: '', address: '', hotline: '', status: 'active' as 'active' | 'hidden' };

export const BranchesScreen: React.FC<BranchesScreenProps> = ({ currentUser, onShowToast }) => {
  if (currentUser.role !== 'admin') {
    return (
      <div className="p-8 bg-white border border-[#E5E0D8] rounded-[6px] text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-[#FDF2F2] text-[#DC2626] flex items-center justify-center mx-auto font-bold text-lg">!</div>
        <h2 className="text-base font-bold text-[#1C1917]">Bạn không có quyền truy cập</h2>
        <p className="text-xs text-[#78716C] max-w-sm mx-auto">
          Mục Quản lý chi nhánh chỉ dành riêng cho tài khoản Quản trị viên cấp cao (ADMIN).
        </p>
      </div>
    );
  }

  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showDrawer, setShowDrawer] = useState(false);
  const [isNewBranch, setIsNewBranch] = useState(false);
  const [editForm, setEditForm] = useState<typeof emptyBranchForm & { id?: number }>(emptyBranchForm);

  const [showHideConfirm, setShowHideConfirm] = useState(false);
  const [branchToHide, setBranchToHide] = useState<BranchItem | null>(null);
  const [hideConflictInfo, setHideConflictInfo] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getBranches(currentUser.role);
      setBranches(Array.isArray(data) ? data : []);
    } catch {
      onShowToast('Không thể tải danh sách chi nhánh.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser.role]);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  const openAddDrawer = () => {
    setIsNewBranch(true);
    setEditForm(emptyBranchForm);
    setShowDrawer(true);
  };

  const openEditDrawer = (b: BranchItem) => {
    setIsNewBranch(false);
    setEditForm({ id: b.id, name: b.name, address: b.address, hotline: b.hotline, status: b.status });
    setShowDrawer(true);
  };

  const handleSave = async () => {
    if (!editForm.name.trim() || !editForm.address.trim() || !editForm.hotline.trim()) {
      onShowToast('Vui lòng nhập đầy đủ tên, địa chỉ và hotline.', 'error');
      return;
    }
    if (!isValidPhoneNumber(editForm.hotline)) {
      onShowToast('Số điện thoại hotline không đúng định dạng (phải là số điện thoại Việt Nam gồm 10 chữ số, VD: 0903123456).', 'error');
      return;
    }
    setSaving(true);
    try {
      if (isNewBranch) {
        await adminApi.createBranch({ name: editForm.name, address: editForm.address, hotline: editForm.hotline }, currentUser.role);
        onShowToast(`Đã thêm chi nhánh "${editForm.name}" thành công!`, 'success');
      } else if (editForm.id) {
        await adminApi.updateBranch(editForm.id, { name: editForm.name, address: editForm.address, hotline: editForm.hotline, status: editForm.status }, currentUser.role);
        onShowToast(`Đã cập nhật chi nhánh "${editForm.name}" thành công!`, 'success');
      }
      setShowDrawer(false);
      await loadBranches();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Lỗi khi lưu chi nhánh. Vui lòng thử lại.';
      onShowToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleHide = async () => {
    if (!branchToHide) return;
    setSaving(true);
    try {
      if (branchToHide.status === 'active') {
        await adminApi.hideBranch(branchToHide.id, currentUser.role);
        onShowToast(`Đã tạm ẩn chi nhánh "${branchToHide.name}".`, 'warning');
      } else {
        await adminApi.activateBranch(branchToHide.id, currentUser.role);
        onShowToast(`Đã kích hoạt lại chi nhánh "${branchToHide.name}".`, 'success');
      }
      setShowHideConfirm(false);
      setBranchToHide(null);
      setHideConflictInfo(null);
      await loadBranches();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.error === 'FUTURE_BOOKINGS_EXIST') {
        setHideConflictInfo(`${data.message}`);
      } else {
        onShowToast(data?.message || 'Lỗi khi thay đổi trạng thái chi nhánh.', 'error');
        setShowHideConfirm(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-[#E5E0D8] rounded-[6px]">
        <div>
          <h2 className="text-sm font-semibold text-[#1C1917]">
            Danh sách cơ sở lưu trú homestay ({branches.length} chi nhánh)
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Quản lý địa chỉ, hotline chăm sóc khách hàng và tổng số phòng từng cơ sở
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<IconPlus className="w-4 h-4" />} onClick={openAddDrawer}>
          Thêm chi nhánh mới
        </Button>
      </div>

      {/* Branches Table */}
      <TableContainer>
        <TableHeader>
          <tr>
            <th className="py-3 px-3.5">Tên chi nhánh</th>
            <th className="py-3 px-3.5">Địa chỉ cơ sở</th>
            <th className="py-3 px-3.5">Hotline hỗ trợ</th>
            <th className="py-3 px-3.5 text-center">Phòng</th>
            <th className="py-3 px-3.5 text-center">Trạng thái</th>
            <th className="py-3 px-3.5 text-right">Thao tác</th>
          </tr>
        </TableHeader>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} className="py-10 text-center text-xs text-[#78716C]">Đang tải dữ liệu...</td></tr>
          ) : branches.length === 0 ? (
            <tr><td colSpan={6} className="py-10 text-center text-xs text-[#78716C]">Chưa có chi nhánh nào.</td></tr>
          ) : branches.map((b) => (
            <TableRow key={b.id}>
              <td className="py-3 px-3.5">
                <span className="font-semibold text-xs text-[#1C1917]">{b.name}</span>
              </td>
              <td className="py-3 px-3.5 text-xs text-[#44403C]">{b.address}</td>
              <td className="py-3 px-3.5 font-mono text-xs text-[#78716C]">{b.hotline}</td>
              <td className="py-3 px-3.5 text-center">
                <div className="text-xs text-[#1C1917] font-mono font-bold">{b.total_rooms} phòng</div>
                <div className="text-[10px] text-[#78716C]">
                  {b.available_rooms} sẵn sàng · {b.maintenance_rooms} bảo trì
                </div>
              </td>
              <td className="py-3 px-3.5 text-center">
                <Badge variant={b.status === 'active' ? 'success' : 'neutral'} size="sm">
                  {b.status === 'active' ? 'Đang hoạt động' : 'Tạm ẩn'}
                </Badge>
                {(b.active_future_bookings ?? 0) > 0 && (
                  <div className="text-[10px] text-[#B4532A] mt-0.5">{b.active_future_bookings} đơn tương lai</div>
                )}
              </td>
              <td className="py-3 px-3.5 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button variant="outline" size="sm" icon={<IconEdit className="w-3.5 h-3.5" />} onClick={() => openEditDrawer(b)}>
                    Sửa
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={b.status === 'active' ? <IconEyeOff className="w-3.5 h-3.5" /> : <IconEye className="w-3.5 h-3.5" />}
                    onClick={() => { setBranchToHide(b); setHideConflictInfo(null); setShowHideConfirm(true); }}
                  >
                    {b.status === 'active' ? 'Ẩn' : 'Hiện'}
                  </Button>
                </div>
              </td>
            </TableRow>
          ))}
        </tbody>
      </TableContainer>

      {/* Drawer: Thêm / Sửa chi nhánh */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={isNewBranch ? 'Thêm chi nhánh mới' : 'Chỉnh sửa thông tin chi nhánh'}
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" size="md" onClick={() => setShowDrawer(false)} disabled={saving}>Hủy</Button>
            <Button variant="primary" size="md" onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu chi nhánh'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <Input
            label="Tên chi nhánh homestay"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="VD: Chi nhánh 1 – Triền Núi Nhỏ"
          />
          <Input
            label="Địa chỉ chi tiết"
            value={editForm.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            placeholder="VD: Đường Hải Đăng, Phường 2, TP. Vũng Tàu"
          />
          <Input
            label="Hotline lễ tân cơ sở (10 số)"
            value={editForm.hotline}
            onChange={(e) => setEditForm({ ...editForm, hotline: e.target.value })}
            placeholder="VD: 0903123456"
          />
          {!isNewBranch && (
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">Trạng thái</label>
              <select
                className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'hidden' })}
              >
                <option value="active">Đang hoạt động</option>
                <option value="hidden">Tạm ẩn</option>
              </select>
            </div>
          )}
        </div>
      </Drawer>

      {/* Confirm Hide / Activate */}
      <ConfirmDialog
        isOpen={showHideConfirm}
        onClose={() => { setShowHideConfirm(false); setHideConflictInfo(null); }}
        onConfirm={hideConflictInfo ? () => { setShowHideConfirm(false); setHideConflictInfo(null); } : handleToggleHide}
        title={hideConflictInfo ? 'Không thể ẩn chi nhánh' : (branchToHide?.status === 'active' ? 'Ẩn chi nhánh' : 'Kích hoạt chi nhánh')}
        message={
          hideConflictInfo
            ? hideConflictInfo
            : `Bạn có chắc chắn muốn ${branchToHide?.status === 'active' ? 'tạm ẩn' : 'mở hoạt động lại'} chi nhánh "${branchToHide?.name}"?${branchToHide?.status === 'active' ? ' Khách hàng sẽ không thấy các phòng thuộc chi nhánh này trên trang tìm kiếm.' : ''}`
        }
        confirmLabel={hideConflictInfo ? 'Đã hiểu' : (branchToHide?.status === 'active' ? 'Xác nhận ẩn' : 'Mở lại')}
        variant={hideConflictInfo ? 'primary' : (branchToHide?.status === 'active' ? 'danger' : 'primary')}
      />
    </div>
  );
};
