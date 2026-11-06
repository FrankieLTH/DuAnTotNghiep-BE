import React, { useState } from 'react';
import {
  IconDashboard,
  IconBooking,
  IconRoom,
  IconBranch,
  IconCustomer,
  IconVoucher,
  IconStaff,
  IconKey,
  IconAudit,
  IconSearch,
  IconChevronDown,
  IconLogOut,
  IconMenu,
  IconLock,
} from './AdminIcons';
import { Badge, Button, ConfirmDialog, Modal, Input } from './AdminUI';

export type AdminRole = 'admin' | 'manager';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  branchId?: number; // 1 = CN1, 2 = CN2; undefined/0 = Tất cả (chỉ cho Admin)
  branchName?: string;
}

export type AdminScreenKey =
  | 'dashboard'
  | 'bookings'
  | 'rooms'
  | 'branches'
  | 'customers'
  | 'vouchers'
  | 'staff'
  | 'access-codes'
  | 'audit-logs';

export interface AdminLayoutProps {
  currentUser: AdminUser;
  activeScreen: AdminScreenKey;
  onNavigate: (screen: AdminScreenKey) => void;
  selectedBranchId: number; // 0 = Tất cả chi nhánh, 1 = CN1, 2 = CN2
  onBranchChange: (branchId: number) => void;
  onLogout: () => void;
  children: React.ReactNode;
  pageTitle: string;
  pageSubtitle?: string;
  isViewOnly?: boolean;
  headerActions?: React.ReactNode;
  onQuickSearch?: (query: string) => void;
}

const BRANCHES_LIST = [
  { id: 1, name: 'Chi nhánh 1 - Triền Núi Nhỏ', address: 'Đường Hải Đăng, Phường 2, TP. Vũng Tàu' },
  { id: 2, name: 'Chi nhánh 2 - Bãi Trước / Núi Lớn', address: 'Đường Vi Ba, Phường 1, TP. Vũng Tàu' },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  activeScreen,
  onNavigate,
  selectedBranchId,
  onBranchChange,
  onLogout,
  children,
  pageTitle,
  pageSubtitle,
  isViewOnly = false,
  headerActions,
  onQuickSearch,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Password change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Menu items config with permission mapping
  const menuItems: {
    key: AdminScreenKey;
    label: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
  }[] = [
    { key: 'dashboard', label: 'Thống kê', icon: <IconDashboard className="w-4 h-4" /> },
    { key: 'bookings', label: 'Quản lý booking', icon: <IconBooking className="w-4 h-4" /> },
    { key: 'rooms', label: 'Quản lý phòng', icon: <IconRoom className="w-4 h-4" /> },
    {
      key: 'branches',
      label: 'Quản lý chi nhánh',
      icon: <IconBranch className="w-4 h-4" />,
      adminOnly: true,
    },
    { key: 'customers', label: 'Khách hàng', icon: <IconCustomer className="w-4 h-4" /> },
    { key: 'vouchers', label: 'Mã giảm giá', icon: <IconVoucher className="w-4 h-4" /> },
    {
      key: 'staff',
      label: 'Nhân viên & Phân quyền',
      icon: <IconStaff className="w-4 h-4" />,
      adminOnly: true,
    },
    { key: 'access-codes', label: 'Access code (Mã khóa)', icon: <IconKey className="w-4 h-4" /> },
    {
      key: 'audit-logs',
      label: 'Nhật ký thao tác',
      icon: <IconAudit className="w-4 h-4" />,
      adminOnly: true,
    },
  ];

  // Filter menu items: hide completely if user is manager and item is adminOnly
  const visibleMenuItems = menuItems.filter(
    (item) => !item.adminOnly || currentUser.role === 'admin'
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onQuickSearch) {
      onQuickSearch(searchQuery);
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setPasswordError('Vui lòng nhập đầy đủ mật khẩu cũ và mới');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải từ 6 ký tự trở lên');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }

    setPasswordError('');
    setPasswordSuccess(true);
    setTimeout(() => {
      setShowChangePasswordModal(false);
      setPasswordSuccess(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#F8F6F1] text-[#1C1917] flex font-sans selection:bg-[#B4532A] selection:text-white">
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR (240px / collapsible) */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-[#FFFFFF] border-r border-[#E5E0D8] transition-all duration-200 flex flex-col select-none ${
          isSidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E5E0D8]">
          {!isSidebarCollapsed ? (
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-[#1C1917] uppercase">
                ĐỒI BÔNG GÒN
              </span>
              <span className="text-[11px] text-[#78716C] tracking-wide">
                Trang Quản Trị Hệ Thống
              </span>
            </div>
          ) : (
            <span className="font-bold text-sm text-[#B4532A] mx-auto">ĐBG</span>
          )}

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#F2EFE9] rounded transition-colors cursor-pointer"
            title={isSidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            <IconMenu className="w-4 h-4" />
          </button>
        </div>

        {/* Current Branch badge for Quản lý in sidebar */}
        {!isSidebarCollapsed && currentUser.role === 'manager' && (
          <div className="mx-3 mt-3 p-2 bg-[#F9F8F6] border border-[#E5E0D8] rounded-[6px]">
            <div className="text-[10px] uppercase font-bold text-[#78716C]">Chi nhánh quản lý</div>
            <div className="text-xs font-semibold text-[#1C1917] truncate mt-0.5">
              {currentUser.branchName || 'Chi nhánh 1'}
            </div>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          {visibleMenuItems.map((item) => {
            const isActive = activeScreen === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-3 h-10 rounded-[6px] text-sm font-medium transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#FAF0EB] text-[#B4532A] font-semibold border-l-2 border-[#B4532A]'
                    : 'text-[#44403C] hover:bg-[#F4F2EE] hover:text-[#1C1917]'
                }`}
                title={item.label}
              >
                <span className={`shrink-0 ${isActive ? 'text-[#B4532A]' : 'text-[#78716C]'}`}>
                  {item.icon}
                </span>
                {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Info Footer in sidebar */}
        <div className="p-3 border-t border-[#E5E0D8] bg-[#FAF9F7]">
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="text-xs font-semibold text-[#1C1917] truncate">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-[#78716C] truncate">{currentUser.email}</div>
              </div>
              <Badge
                variant={currentUser.role === 'admin' ? 'terracotta' : 'neutral'}
                size="sm"
              >
                {currentUser.role === 'admin' ? 'ADMIN' : 'QUẢN LÝ'}
              </Badge>
            </div>
          ) : (
            <div className="text-center font-bold text-[10px] text-[#78716C]">
              {currentUser.role === 'admin' ? 'ADM' : 'QL'}
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTAINER */}
      {/* ========================================================================= */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${
          isSidebarCollapsed ? 'pl-16' : 'pl-60'
        }`}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 bg-[#FFFFFF] border-b border-[#E5E0D8] px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Left: Branch Switcher & Search */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-2xl">
            {/* Branch switcher dropdown */}
            <div className="relative shrink-0">
              {currentUser.role === 'admin' ? (
                <div className="flex items-center gap-1.5 text-xs text-[#44403C]">
                  <span className="hidden sm:inline font-medium text-[#78716C]">Chi nhánh:</span>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => onBranchChange(Number(e.target.value))}
                    className="h-8 px-2.5 bg-[#FAF9F7] text-xs font-semibold text-[#1C1917] border border-[#DDD7CE] rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#B4532A] cursor-pointer"
                  >
                    <option value={0}>Tất cả chi nhánh (2 chi nhánh)</option>
                    <option value={1}>CN1: Triền Núi Nhỏ</option>
                    <option value={2}>CN2: Bãi Trước / Núi Lớn</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="hidden sm:inline text-[#78716C]">Chi nhánh:</span>
                  <span className="font-semibold text-[#1C1917] bg-[#F2EFE9] px-2.5 py-1 rounded-[4px] border border-[#DDD7CE]">
                    {currentUser.branchName || 'CN1: Triền Núi Nhỏ'}
                  </span>
                </div>
              )}
            </div>

            {/* Quick search input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm hidden md:block">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#A8A29E]">
                <IconSearch className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Tìm nhanh booking, SĐT, mã khóa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-[#FAF9F7] text-[#1C1917] border border-[#DDD7CE] rounded-[6px] placeholder:text-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#B4532A] transition-colors"
              />
            </form>
          </div>

          {/* Right: Role indicator & User Menu */}
          <div className="flex items-center gap-3">
            {/* View only badge if applicable */}
            {isViewOnly && (
              <Badge variant="warning" size="sm">
                Chế độ chỉ xem
              </Badge>
            )}

            {/* Role & Branch pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#F9F8F6] border border-[#E5E0D8] rounded-[6px] text-xs">
              <span className="font-semibold text-[#1C1917]">
                {currentUser.role === 'admin' ? 'ADMIN (Toàn quyền)' : 'QUẢN LÝ (Vận hành)'}
              </span>
              <span className="text-[#A8A29E]">•</span>
              <span className="text-[#78716C]">
                {currentUser.role === 'admin'
                  ? selectedBranchId === 0
                    ? '2 Chi nhánh'
                    : `CN${selectedBranchId}`
                  : currentUser.branchName || 'CN1'}
              </span>
            </div>

            {/* User Avatar dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 h-9 px-2.5 rounded-[6px] hover:bg-[#F2EFE9] transition-colors cursor-pointer text-left border border-transparent hover:border-[#DDD7CE]"
              >
                <div className="w-7 h-7 rounded-full bg-[#FAF0EB] text-[#B4532A] font-bold text-xs flex items-center justify-center border border-[#F0D5C7]">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-xs">
                  <div className="font-medium text-[#1C1917] leading-none">{currentUser.name}</div>
                </div>
                <IconChevronDown className="w-3.5 h-3.5 text-[#78716C]" />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white border border-[#DDD7CE] rounded-[6px] shadow-lg py-1 z-50 animate-fadeIn"
                  onMouseLeave={() => setShowUserDropdown(false)}
                >
                  <div className="px-3.5 py-2.5 border-b border-[#E5E0D8]">
                    <div className="text-xs font-semibold text-[#1C1917]">{currentUser.name}</div>
                    <div className="text-[11px] text-[#78716C] truncate">{currentUser.email}</div>
                    <div className="mt-1">
                      <Badge variant={currentUser.role === 'admin' ? 'terracotta' : 'neutral'} size="sm">
                        {currentUser.role === 'admin' ? 'Quản trị viên cấp cao' : 'Quản lý cơ sở'}
                      </Badge>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowChangePasswordModal(true);
                    }}
                    className="w-full px-3.5 py-2 text-xs text-left text-[#44403C] hover:bg-[#FAF9F7] flex items-center gap-2 cursor-pointer"
                  >
                    <IconLock className="w-3.5 h-3.5 text-[#78716C]" />
                    Đổi mật khẩu
                  </button>

                  <div className="border-t border-[#E5E0D8] my-1" />

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="w-full px-3.5 py-2 text-xs text-left text-[#DC2626] hover:bg-[#FDF2F2] flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <IconLogOut className="w-3.5 h-3.5" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Header (Title + Breadcrumbs + Actions) */}
        <div className="bg-[#FFFFFF] border-b border-[#E5E0D8] px-4 sm:px-6 lg:px-8 py-5">
          <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-[#78716C] mb-1">
                Trang quản trị &rsaquo; {pageTitle}
              </div>
              <h1 className="text-2xl font-bold text-[#1C1917] tracking-tight">{pageTitle}</h1>
              {pageSubtitle && (
                <p className="text-xs text-[#78716C] mt-1">{pageSubtitle}</p>
              )}
            </div>
            {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
          </div>
        </div>

        {/* Page Content Body (Max 1280px) */}
        <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={onLogout}
        title="Xác nhận đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc quản trị? Hệ thống sẽ lưu lại toàn bộ trạng thái hiện tại."
        confirmLabel="Đăng xuất"
        variant="primary"
      />

      {/* Change Password Modal */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        title="Đổi mật khẩu tài khoản"
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowChangePasswordModal(false)}
            >
              Hủy
            </Button>
            <Button variant="primary" size="md" onClick={handleChangePasswordSubmit}>
              Cập nhật mật khẩu
            </Button>
          </>
        }
      >
        <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
          {passwordSuccess ? (
            <div className="p-3 bg-[#EDF5F1] text-[#2A694E] border border-[#C6E7D2] rounded-[6px] text-xs font-medium">
              Đổi mật khẩu thành công!
            </div>
          ) : (
            <>
              {passwordError && (
                <div className="p-2.5 bg-[#FDF2F2] text-[#DC2626] border border-[#F5C2C2] rounded-[6px] text-xs">
                  {passwordError}
                </div>
              )}
              <Input
                label="Mật khẩu hiện tại"
                type="password"
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <Input
                label="Mật khẩu mới (tối thiểu 6 ký tự)"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                label="Xác nhận mật khẩu mới"
                type="password"
                placeholder="••••••••"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </>
          )}
        </form>
      </Modal>
    </div>
  );
};
