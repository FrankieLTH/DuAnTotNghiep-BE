import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TableContainer,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Drawer,
  ConfirmDialog,
  formatMoney,
  formatDate,
  Input,
} from '../AdminUI';
import { IconSearch, IconLock, IconUnlock, IconEye, IconPlus } from '../AdminIcons';
import { AdminUser } from '../AdminLayout';
import { adminApi, AdminCustomerItem, isValidEmail, isValidPhoneNumber } from '../../../services/adminService';

type CustomerDetail = AdminCustomerItem;

interface CustomersScreenProps {
  currentUser: AdminUser;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

type StatusFilter = 'all' | 'active' | 'hidden' | 'blocked';

export const CustomersScreen: React.FC<CustomersScreenProps> = ({ currentUser, onShowToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [customers, setCustomers] = useState<AdminCustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [actionSaving, setActionSaving] = useState(false);

  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: '', email: '', phone: '' });
  const [addSaving, setAddSaving] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCustomers = useCallback(async (page = 1, search = searchQuery, status = statusFilter) => {
    setLoading(true);
    try {
      const data = await adminApi.getCustomers(search, 'all', currentUser.role);
      const list = Array.isArray(data) ? data : (data?.items ?? data?.customers ?? []);
      setCustomers(list);
      setTotalCount(list.length);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser.role, searchQuery, statusFilter]);

  useEffect(() => { loadCustomers(1, searchQuery, statusFilter); }, [statusFilter]);

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadCustomers(1, val, statusFilter), 400);
  };

  const viewCustomer = async (c: AdminCustomerItem) => {
    try {
      const history = await adminApi.getCustomerHistory(c.id, currentUser.role);
      setSelectedCustomer({ ...c, bookings: history?.bookings ?? [] });
    } catch {
      setSelectedCustomer({ ...c, bookings: [] });
    }
    setShowDrawer(true);
  };

  const handleToggleBlock = async () => {
    if (!selectedCustomer) return;
    setActionSaving(true);
    try {
      const willBlock = !selectedCustomer.is_blocked;
      await adminApi.toggleBlockCustomer(selectedCustomer.id, willBlock, blockReason, currentUser.role);
      onShowToast(`Đã ${willBlock ? 'khóa' : 'mở khóa'} tài khoản "${selectedCustomer.full_name}".`, willBlock ? 'warning' : 'success');
      setShowBlockConfirm(false);
      setBlockReason('');
      setShowDrawer(false);
      await loadCustomers();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi thao tác tài khoản.', 'error');
    } finally {
      setActionSaving(false);
    }
  };

  const handleToggleHide = async (c: AdminCustomerItem) => {
    try {
      const isHidden = !!(c as any).is_hidden;
      await adminApi.toggleHideCustomer(c.id, !isHidden, currentUser.role);
      onShowToast(`Đã ${!isHidden ? 'ẩn' : 'hiện'} tài khoản "${c.full_name}".`, !isHidden ? 'warning' : 'success');
      await loadCustomers();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi thao tác.', 'error');
    }
  };

  const handleAddCustomer = async () => {
    if (!addForm.full_name.trim() || !addForm.email.trim()) {
      onShowToast('Vui lòng nhập họ tên và email.', 'error');
      return;
    }
    if (!isValidEmail(addForm.email)) {
      onShowToast('Địa chỉ email/gmail không đúng định dạng (VD: example@gmail.com).', 'error');
      return;
    }
    if (addForm.phone && !isValidPhoneNumber(addForm.phone)) {
      onShowToast('Số điện thoại không đúng định dạng (phải là số điện thoại Việt Nam gồm 10 chữ số, VD: 0901234567).', 'error');
      return;
    }
    setAddSaving(true);
    try {
      await adminApi.createCustomer(addForm, currentUser.role);
      onShowToast(`Đã thêm khách hàng "${addForm.full_name}"!`, 'success');
      setShowAddDrawer(false);
      setAddForm({ full_name: '', email: '', phone: '' });
      await loadCustomers();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi thêm khách hàng.', 'error');
    } finally {
      setAddSaving(false);
    }
  };

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'active', label: 'Hoạt động' },
    { key: 'hidden', label: 'Đã ẩn' },
    { key: 'blocked', label: 'Bị chặn' },
  ];

  const filteredCustomers = customers.filter((c) => {
    const h = c as any;
    if (statusFilter === 'blocked') return c.is_blocked;
    if (statusFilter === 'hidden') return h.is_hidden && !c.is_blocked;
    if (statusFilter === 'active') return !c.is_blocked && !h.is_hidden;
    return true;
  });
  const pageItems = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredCustomers.length / pageSize);

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-[#E5E0D8] rounded-[6px]">
        <div>
          <h2 className="text-sm font-semibold text-[#1C1917]">Quản lý khách hàng</h2>
          <p className="text-xs text-[#78716C] mt-0.5">Tìm kiếm theo họ tên, email hoặc số điện thoại</p>
        </div>
        <Button variant="primary" size="sm" icon={<IconPlus className="w-4 h-4" />} onClick={() => setShowAddDrawer(true)}>
          Thêm khách hàng
        </Button>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-[#F4F2EE] rounded-[6px] p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === tab.key ? 'bg-white text-[#1C1917] shadow-sm' : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <IconSearch className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#78716C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Tìm theo email, SĐT, họ tên..."
            className="w-full pl-8 pr-3 py-2 text-xs border border-[#E5E0D8] rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#B4532A] bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <TableContainer>
        <TableHeader>
          <tr>
            <th className="py-3 px-3.5">Khách hàng</th>
            <th className="py-3 px-3.5">Email</th>
            <th className="py-3 px-3.5">Điện thoại</th>
            <th className="py-3 px-3.5 text-center">Số đơn</th>
            <th className="py-3 px-3.5">Loại tài khoản</th>
            <th className="py-3 px-3.5">Ngày tạo</th>
            <th className="py-3 px-3.5 text-center">Trạng thái</th>
            <th className="py-3 px-3.5 text-right">Thao tác</th>
          </tr>
        </TableHeader>
        <tbody>
          {loading ? (
            <tr><td colSpan={8} className="py-10 text-center text-xs text-[#78716C]">Đang tải...</td></tr>
          ) : pageItems.length === 0 ? (
            <tr><td colSpan={8} className="py-10 text-center text-xs text-[#78716C]">Không tìm thấy khách hàng nào.</td></tr>
          ) : pageItems.map((c) => {
            const h = c as any;
            return (
              <TableRow key={c.id}>
                <td className="py-2.5 px-3.5 font-medium text-xs text-[#1C1917]">{c.full_name}</td>
                <td className="py-2.5 px-3.5 text-xs text-[#78716C]">{c.email}</td>
                <td className="py-2.5 px-3.5 font-mono text-xs text-[#78716C]">{(c as any).phone || '—'}</td>
                <td className="py-2.5 px-3.5 text-center font-mono font-bold text-xs text-[#1C1917]">
                  {c.total_bookings_count ?? '—'}
                </td>
                <td className="py-2.5 px-3.5">
                  <Badge variant={c.account_type === 'REGISTERED' ? 'info' : 'neutral'} size="sm">
                    {c.account_type === 'REGISTERED' ? 'Đã kích hoạt' : 'Khách vãng lai'}
                  </Badge>
                </td>
                <td className="py-2.5 px-3.5 text-xs text-[#78716C]">{formatDate(c.created_at)}</td>
                <td className="py-2.5 px-3.5 text-center">
                  {c.is_blocked ? (
                    <Badge variant="danger" size="sm">Bị chặn</Badge>
                  ) : h.is_hidden ? (
                    <Badge variant="neutral" size="sm">Đã ẩn</Badge>
                  ) : (
                    <Badge variant="success" size="sm">Bình thường</Badge>
                  )}
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button variant="outline" size="sm" icon={<IconEye className="w-3.5 h-3.5" />} onClick={() => viewCustomer(c)}>
                      Xem
                    </Button>
                    <Button
                      variant={c.is_blocked ? 'primary' : 'secondary'}
                      size="sm"
                      icon={c.is_blocked ? <IconUnlock className="w-3.5 h-3.5" /> : <IconLock className="w-3.5 h-3.5" />}
                      onClick={() => { setSelectedCustomer(c as any); setShowBlockConfirm(true); }}
                    >
                      {c.is_blocked ? 'Mở khóa' : 'Chặn'}
                    </Button>
                  </div>
                </td>
              </TableRow>
            );
          })}
        </tbody>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#78716C]">
          <span>Hiển thị {pageItems.length} / {filteredCustomers.length} khách hàng</span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-2.5 py-1.5 border border-[#E5E0D8] rounded-[4px] hover:bg-[#F4F2EE] disabled:opacity-40 cursor-pointer"
            >
              ‹
            </button>
            <span className="px-2 font-medium text-[#1C1917]">{currentPage} / {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-2.5 py-1.5 border border-[#E5E0D8] rounded-[4px] hover:bg-[#F4F2EE] disabled:opacity-40 cursor-pointer"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* Drawer: Chi tiết khách hàng */}
      <Drawer
        isOpen={showDrawer && selectedCustomer !== null}
        onClose={() => setShowDrawer(false)}
        title="Thông tin khách hàng"
        footer={
          <div className="flex justify-between gap-2 w-full">
            <Button
              variant={selectedCustomer?.is_blocked ? 'primary' : 'danger'}
              size="md"
              icon={selectedCustomer?.is_blocked ? <IconUnlock className="w-3.5 h-3.5" /> : <IconLock className="w-3.5 h-3.5" />}
              onClick={() => setShowBlockConfirm(true)}
            >
              {selectedCustomer?.is_blocked ? 'Mở khóa tài khoản' : 'Chặn tài khoản'}
            </Button>
            <Button variant="outline" size="md" onClick={() => setShowDrawer(false)}>Đóng</Button>
          </div>
        }
      >
        {selectedCustomer && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[#78716C] mb-0.5">Họ và tên</div>
                <div className="font-semibold text-[#1C1917]">{selectedCustomer.full_name}</div>
              </div>
              <div>
                <div className="text-[#78716C] mb-0.5">Email</div>
                <div className="text-[#1C1917]">{selectedCustomer.email}</div>
              </div>
              <div>
                <div className="text-[#78716C] mb-0.5">Số điện thoại</div>
                <div className="font-mono text-[#1C1917]">{(selectedCustomer as any).phone || '—'}</div>
              </div>
              <div>
                <div className="text-[#78716C] mb-0.5">Loại tài khoản</div>
                <Badge variant={selectedCustomer.account_type === 'REGISTERED' ? 'info' : 'neutral'} size="sm">
                  {selectedCustomer.account_type === 'REGISTERED' ? 'Đã kích hoạt' : 'Khách vãng lai'}
                </Badge>
              </div>
              <div>
                <div className="text-[#78716C] mb-0.5">Trạng thái</div>
                {selectedCustomer.is_blocked ? (
                  <Badge variant="danger" size="sm">Bị chặn</Badge>
                ) : (
                  <Badge variant="success" size="sm">Bình thường</Badge>
                )}
              </div>
              <div>
                <div className="text-[#78716C] mb-0.5">Ngày tạo</div>
                <div className="text-[#1C1917]">{formatDate(selectedCustomer.created_at)}</div>
              </div>
            </div>

            {/* Lịch sử đặt phòng */}
            <div className="border-t border-[#E5E0D8] pt-3">
              <h4 className="font-semibold text-[#1C1917] mb-2">
                Lịch sử đặt phòng ({selectedCustomer.total_bookings_count ?? 0} đơn)
              </h4>
              {selectedCustomer.bookings && selectedCustomer.bookings.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedCustomer.bookings.map((b: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-[#F8F6F1] rounded-[4px] border border-[#E5E0D8]">
                      <div>
                        <div className="font-mono font-bold text-[#1C1917]">{b.booking_code || b.code}</div>
                        <div className="text-[#78716C] mt-0.5">{b.booked_start_time || b.checkIn}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#B4532A]">{formatMoney(b.total_amount || b.totalAmount || 0)}</div>
                        <Badge variant={b.booking_status === 'confirmed' || b.status === 'confirmed' ? 'success' : 'neutral'} size="sm">
                          {b.booking_status || b.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#78716C] italic">Chưa có đơn đặt phòng nào.</p>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Confirm Block / Unblock */}
      <ConfirmDialog
        isOpen={showBlockConfirm}
        onClose={() => { setShowBlockConfirm(false); setBlockReason(''); }}
        onConfirm={handleToggleBlock}
        title={selectedCustomer?.is_blocked ? 'Mở khóa tài khoản' : 'Chặn tài khoản khách hàng'}
        message={`Bạn có chắc muốn ${selectedCustomer?.is_blocked ? 'mở khóa' : 'chặn'} tài khoản "${selectedCustomer?.full_name}"?`}
        confirmLabel={selectedCustomer?.is_blocked ? 'Xác nhận mở khóa' : 'Chặn tài khoản'}
        variant={selectedCustomer?.is_blocked ? 'primary' : 'danger'}
        reasonRequired={!selectedCustomer?.is_blocked}
        reasonValue={blockReason}
        onReasonChange={setBlockReason}
      />

      {/* Drawer: Thêm khách hàng */}
      <Drawer
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        title="Thêm khách hàng mới"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" size="md" onClick={() => setShowAddDrawer(false)} disabled={addSaving}>Hủy</Button>
            <Button variant="primary" size="md" onClick={handleAddCustomer} disabled={addSaving}>
              {addSaving ? 'Đang lưu...' : 'Thêm khách hàng'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-2.5 bg-[#FDF7EE] border border-[#F7DCB4] rounded-[6px] text-[#9C5B14]">
            Khách hàng sẽ được tạo tài khoản chưa kích hoạt. Mật khẩu sẽ được thiết lập qua OTP email khi khách đăng nhập lần đầu.
          </div>
          <Input label="Họ và tên *" value={addForm.full_name}
            onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
            placeholder="Nhập họ tên đầy đủ" />
          <Input label="Địa chỉ email *" value={addForm.email}
            onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
            placeholder="khachhang@example.com" />
          <Input label="Số điện thoại" value={addForm.phone}
            onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
            placeholder="0901234567" />
        </div>
      </Drawer>
    </div>
  );
};
