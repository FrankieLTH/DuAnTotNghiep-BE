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
  Modal,
} from '../AdminUI';
import { IconPlus, IconLock, IconUnlock, IconRefresh, IconEdit, IconCheck } from '../AdminIcons';
import { AdminUser } from '../AdminLayout';
import { isValidEmail, isValidPhoneNumber } from '../../../services/adminService';

export interface StaffItem {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager';
  branchId?: number; // 1 = CN1, 2 = CN2; undefined = all (admin)
  branchName?: string;
  isBlocked: boolean;
  createdAt: string;
}

interface StaffScreenProps {
  currentUser: AdminUser;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const StaffScreen: React.FC<StaffScreenProps> = ({
  currentUser,
  onShowToast,
}) => {
  // If user is not admin, show Unauthorized view
  if (currentUser.role !== 'admin') {
    return (
      <div className="p-8 bg-white border border-[#E5E0D8] rounded-[6px] text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-[#FDF2F2] text-[#DC2626] flex items-center justify-center mx-auto font-bold text-lg">
          !
        </div>
        <h2 className="text-base font-bold text-[#1C1917]">Bạn không có quyền truy cập</h2>
        <p className="text-xs text-[#78716C] max-w-sm mx-auto">
          Mục Quản lý nhân viên chỉ dành riêng cho Quản trị viên cấp cao (ADMIN).
        </p>
      </div>
    );
  }

  const [staffList, setStaffList] = useState<StaffItem[]>([
    {
      id: 1,
      name: 'Võ Minh Quân (Admin Tổng)',
      email: 'admin@homestay.com',
      phone: '0901889900',
      role: 'admin',
      branchName: 'Tất cả chi nhánh',
      isBlocked: false,
      createdAt: '01/01/2026',
    },
    {
      id: 2,
      name: 'Nguyễn Thị Hương Giang',
      email: 'quanly.cn1@homestay.com',
      phone: '0912334455',
      role: 'manager',
      branchId: 1,
      branchName: 'CN1: Triền Núi Nhỏ',
      isBlocked: false,
      createdAt: '15/02/2026',
    },
    {
      id: 3,
      name: 'Trần Văn Bảo',
      email: 'quanly.cn2@homestay.com',
      phone: '0988112233',
      role: 'manager',
      branchId: 2,
      branchName: 'CN2: Bãi Trước / Núi Lớn',
      isBlocked: false,
      createdAt: '01/04/2026',
    },
    {
      id: 4,
      name: 'Đặng Tuấn Kiệt (Thực tập lễ tân)',
      email: 'letan.cn1@homestay.com',
      phone: '0977223344',
      role: 'manager',
      branchId: 1,
      branchName: 'CN1: Triền Núi Nhỏ',
      isBlocked: true, // Blocked staff
      createdAt: '10/08/2026',
    },
  ]);

  const [selectedStaff, setSelectedStaff] = useState<StaffItem | null>(null);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState<boolean>(false);
  const [showResetPassModal, setShowResetPassModal] = useState<boolean>(false);
  const [tempPassword, setTempPassword] = useState<string>('');
  const [staffTarget, setStaffTarget] = useState<StaffItem | null>(null);

  // Form states for Add/Edit
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    role: 'admin' | 'manager';
    branchId: number;
  }>({
    name: '',
    email: '',
    phone: '',
    role: 'manager',
    branchId: 1,
  });

  const handleOpenAdd = () => {
    setSelectedStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'manager',
      branchId: 1,
    });
    setShowDrawer(true);
  };

  const handleOpenEdit = (st: StaffItem) => {
    setSelectedStaff(st);
    setFormData({
      name: st.name,
      email: st.email,
      phone: st.phone,
      role: st.role,
      branchId: st.branchId || 1,
    });
    setShowDrawer(true);
  };

  const handleSaveStaff = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      onShowToast('Vui lòng nhập họ tên và email nhân viên!', 'error');
      return;
    }

    if (!isValidEmail(formData.email)) {
      onShowToast('Email nhân viên không đúng định dạng (VD: example@gmail.com).', 'error');
      return;
    }

    if (formData.phone && !isValidPhoneNumber(formData.phone)) {
      onShowToast('Số điện thoại nhân viên không đúng định dạng (phải là số điện thoại Việt Nam gồm 10 chữ số, VD: 0901234567).', 'error');
      return;
    }

    if (formData.role === 'manager' && !formData.branchId) {
      onShowToast('Vai trò Quản lý bắt buộc phải gắn với 1 chi nhánh cụ thể!', 'error');
      return;
    }

    const branchName =
      formData.role === 'admin'
        ? 'Tất cả chi nhánh'
        : formData.branchId === 1
        ? 'CN1: Triền Núi Nhỏ'
        : 'CN2: Bãi Trước / Núi Lớn';

    if (selectedStaff) {
      // Edit
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === selectedStaff.id
            ? {
                ...s,
                ...formData,
                branchName,
              }
            : s
        )
      );
      onShowToast(`Đã cập nhật thông tin nhân viên "${formData.name}".`, 'success');
    } else {
      // Add
      const newStaff: StaffItem = {
        id: Date.now(),
        ...formData,
        branchName,
        isBlocked: false,
        createdAt: 'Hôm nay',
      };
      setStaffList([newStaff, ...staffList]);
      onShowToast(`Đã thêm nhân viên "${formData.name}" thành công!`, 'success');
    }

    setShowDrawer(false);
  };

  const handleToggleBlockStaff = () => {
    if (!staffTarget) return;

    // Check safeguard: always keep at least 1 active admin
    if (staffTarget.role === 'admin' && !staffTarget.isBlocked) {
      const activeAdmins = staffList.filter((s) => s.role === 'admin' && !s.isBlocked);
      if (activeAdmins.length <= 1) {
        onShowToast('Không thể khóa tài khoản: Hệ thống phải có ít nhất 1 ADMIN hoạt động!', 'error');
        setStaffTarget(null);
        return;
      }
    }

    const nextBlock = !staffTarget.isBlocked;
    setStaffList((prev) =>
      prev.map((s) => (s.id === staffTarget.id ? { ...s, isBlocked: nextBlock } : s))
    );
    onShowToast(
      `Đã ${nextBlock ? 'khóa' : 'mở khóa'} nhân viên "${staffTarget.name}".`,
      nextBlock ? 'warning' : 'success'
    );
    setStaffTarget(null);
  };

  const handleResetPassword = (target: StaffItem) => {
    // Generate a secure 8-character temporary password
    const generated = `ĐBG@${Math.floor(1000 + Math.random() * 9000)}`;
    setTempPassword(generated);
    setStaffTarget(target);
    setShowResetPassModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-[#E5E0D8] rounded-[6px]">
        <div>
          <h2 className="text-sm font-semibold text-[#1C1917]">
            Danh sách nhân viên & phân quyền hệ thống ({staffList.length} người)
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Quản trị viên (ADMIN) và Quản lý cơ sở (QUẢN LÝ)
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<IconPlus className="w-4 h-4" />}
          onClick={handleOpenAdd}
        >
          Thêm nhân viên mới
        </Button>
      </div>

      {/* Staff Table */}
      <TableContainer>
        <TableHeader>
          <tr>
            <th className="py-3 px-3.5">Họ và tên</th>
            <th className="py-3 px-3.5">Email tài khoản</th>
            <th className="py-3 px-3.5">Số điện thoại</th>
            <th className="py-3 px-3.5 text-center">Vai trò</th>
            <th className="py-3 px-3.5">Chi nhánh làm việc</th>
            <th className="py-3 px-3.5 text-center">Trạng thái</th>
            <th className="py-3 px-3.5 text-right">Thao tác</th>
          </tr>
        </TableHeader>
        <tbody>
          {staffList.map((st) => (
            <TableRow key={st.id}>
              {/* Họ tên */}
              <td className="py-2.5 px-3.5 font-semibold text-xs text-[#1C1917]">
                {st.name}
                <div className="text-[11px] text-[#78716C]">Tạo ngày: {st.createdAt}</div>
              </td>

              {/* Email */}
              <td className="py-2.5 px-3.5 font-mono text-xs text-[#44403C]">{st.email}</td>

              {/* Phone */}
              <td className="py-2.5 px-3.5 font-mono text-xs text-[#1C1917]">{st.phone}</td>

              {/* Role */}
              <td className="py-2.5 px-3.5 text-center">
                <Badge variant={st.role === 'admin' ? 'terracotta' : 'neutral'} size="sm">
                  {st.role === 'admin' ? 'ADMIN (Toàn quyền)' : 'QUẢN LÝ (Vận hành)'}
                </Badge>
              </td>

              {/* Chi nhánh */}
              <td className="py-2.5 px-3.5 text-xs text-[#44403C] font-medium">
                {st.branchName}
              </td>

              {/* Status */}
              <td className="py-2.5 px-3.5 text-center">
                <Badge variant={st.isBlocked ? 'danger' : 'success'} size="sm">
                  {st.isBlocked ? 'Đã bị khóa' : 'Đang làm việc'}
                </Badge>
              </td>

              {/* Actions */}
              <td className="py-2.5 px-3.5 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<IconEdit className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenEdit(st)}
                  >
                    Sửa
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<IconRefresh className="w-3.5 h-3.5" />}
                    onClick={() => handleResetPassword(st)}
                  >
                    Cấp lại MK
                  </Button>

                  <Button
                    variant={st.isBlocked ? 'secondary' : 'outline'}
                    size="sm"
                    icon={
                      st.isBlocked ? (
                        <IconUnlock className="w-3.5 h-3.5" />
                      ) : (
                        <IconLock className="w-3.5 h-3.5" />
                      )
                    }
                    onClick={() => {
                      setStaffTarget(st);
                      setShowBlockConfirm(true);
                    }}
                  >
                    {st.isBlocked ? 'Mở khóa' : 'Khóa'}
                  </Button>
                </div>
              </td>
            </TableRow>
          ))}
        </tbody>
      </TableContainer>

      {/* Drawer: Thêm / Sửa nhân viên */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={selectedStaff ? 'Chỉnh sửa nhân viên & quyền hạn' : 'Thêm nhân viên quản trị mới'}
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" size="md" onClick={() => setShowDrawer(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="md" onClick={handleSaveStaff}>
              Lưu nhân viên
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <Input
            label="Họ và tên nhân viên *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            label="Email đăng nhập *"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Input
            label="Số điện thoại"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <Select
            label="Vai trò tài khoản *"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
          >
            <option value="manager">QUẢN LÝ (Vận hành hàng ngày, gắn với 1 chi nhánh)</option>
            <option value="admin">ADMIN (Toàn quyền hệ thống qua mọi chi nhánh)</option>
          </Select>

          {/* If Quản lý: Required Branch Selection */}
          {formData.role === 'manager' && (
            <div className="p-3 bg-[#FAF0EB] border border-[#F0D5C7] rounded-[6px] space-y-2">
              <span className="font-semibold text-[#B4532A] block">
                Gắn chi nhánh bắt buộc cho Quản lý
              </span>
              <Select
                label="Chi nhánh quản lý trực tiếp *"
                value={formData.branchId}
                onChange={(e) =>
                  setFormData({ ...formData, branchId: Number(e.target.value) })
                }
              >
                <option value={1}>CN1: Triền Núi Nhỏ (Đường Hải Đăng, Vũng Tàu)</option>
                <option value={2}>CN2: Bãi Trước / Núi Lớn (Đường Vi Ba, Vũng Tàu)</option>
              </Select>
              <p className="text-[11px] text-[#78716C]">
                Quản lý chỉ có quyền xem và thao tác dữ liệu thuộc chi nhánh được chỉ định này.
              </p>
            </div>
          )}
        </div>
      </Drawer>

      {/* Confirmation Dialog for Block/Unblock */}
      <ConfirmDialog
        isOpen={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        onConfirm={handleToggleBlockStaff}
        title={staffTarget?.isBlocked ? 'Mở khóa nhân viên' : 'Khóa tài khoản nhân viên'}
        message={`Bạn có chắc chắn muốn ${
          staffTarget?.isBlocked ? 'mở khóa' : 'khóa truy cập'
        } của nhân viên "${staffTarget?.name}"? Khi khóa, nhân viên sẽ bị đăng xuất ngay lập tức khỏi hệ thống.`}
        confirmLabel={staffTarget?.isBlocked ? 'Mở khóa' : 'Xác nhận khóa'}
        variant={staffTarget?.isBlocked ? 'primary' : 'danger'}
      />

      {/* Modal: Hiển thị mật khẩu tạm cấp lại */}
      <Modal
        isOpen={showResetPassModal}
        onClose={() => setShowResetPassModal(false)}
        title="Cấp lại mật khẩu nhân viên"
        footer={
          <div className="flex justify-between items-center w-full">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                onShowToast(`Đã gửi email chứa mật khẩu tạm tới ${staffTarget?.email}`, 'success');
                setShowResetPassModal(false);
              }}
            >
              Gửi email mật khẩu
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowResetPassModal(false)}
            >
              Đã sao chép & Đóng
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-[#44403C]">
            Hệ thống đã khởi tạo lại mật khẩu tạm thời cho nhân viên{' '}
            <strong>{staffTarget?.name}</strong>:
          </p>
          <div className="p-3 bg-[#FAF9F7] border border-[#DDD7CE] rounded-[6px] flex items-center justify-between">
            <span className="font-mono text-base font-bold text-[#B4532A] tracking-wider">
              {tempPassword}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(tempPassword);
                onShowToast('Đã sao chép mật khẩu tạm vào bộ nhớ tạm!', 'success');
              }}
            >
              Sao chép
            </Button>
          </div>
          <p className="text-[11px] text-[#78716C]">
            * Mật khẩu tạm này chỉ hiển thị một lần. Nhân viên sẽ được yêu cầu đổi mật khẩu mới trong lần đăng nhập đầu tiên.
          </p>
        </div>
      </Modal>
    </div>
  );
};
