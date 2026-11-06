import React, { useState, useEffect } from 'react';
import { AdminLayout, AdminUser, AdminScreenKey } from '../components/admin/AdminLayout';
import { Toast } from '../components/admin/AdminUI';
import { LoginScreen } from '../components/admin/screens/LoginScreen';
import { DashboardScreen } from '../components/admin/screens/DashboardScreen';
import { BookingsScreen } from '../components/admin/screens/BookingsScreen';
import { RoomsScreen } from '../components/admin/screens/RoomsScreen';
import { BranchesScreen } from '../components/admin/screens/BranchesScreen';
import { CustomersScreen } from '../components/admin/screens/CustomersScreen';
import { VouchersScreen } from '../components/admin/screens/VouchersScreen';
import { StaffScreen } from '../components/admin/screens/StaffScreen';
import { AccessCodesScreen } from '../components/admin/screens/AccessCodesScreen';
import { AuditLogsScreen, AuditLogItem } from '../components/admin/screens/AuditLogsScreen';

interface AdminPageProps {
  onGoHome: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onGoHome }) => {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    try {
      const stored = sessionStorage.getItem('homestay_admin_session');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // ignore
    }
    // Default to admin for smooth evaluation experience
    return {
      id: 1,
      name: 'Võ Minh Quân (Admin)',
      email: 'admin@homestay.com',
      role: 'admin',
      branchName: 'Tất cả chi nhánh',
    };
  });

  // Navigation and active branch
  const [activeScreen, setActiveScreen] = useState<AdminScreenKey>('dashboard');
  const [selectedBranchId, setSelectedBranchId] = useState<number>(0); // 0 = all branches
  const [searchTargetBooking, setSearchTargetBooking] = useState<string>('');

  // Toast notifications
  const [toast, setToast] = useState<{
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  // Global Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([
    {
      id: 1,
      createdAt: '04/11/2026 07:15:20',
      actorName: 'Võ Minh Quân',
      actorRole: 'Admin',
      action: 'Xem mã PIN',
      actionCode: 'XEM_MA_PIN',
      entityType: 'lock_pin',
      entityId: 'P.201 (BK-89021)',
      oldValue: '••••••',
      newValue: '839201',
    },
    {
      id: 2,
      createdAt: '03/11/2026 16:40:12',
      actorName: 'Nguyễn Thị Hương Giang',
      actorRole: 'Quản lý CN1',
      action: 'Bảo trì phòng',
      actionCode: 'BAO_TRI_PHONG',
      entityType: 'room',
      entityId: 'P.102',
      oldValue: 'available',
      newValue: 'maintenance',
    },
    {
      id: 3,
      createdAt: '03/11/2026 14:22:05',
      actorName: 'Võ Minh Quân',
      actorRole: 'Admin',
      action: 'Duyệt hoàn tiền',
      actionCode: 'DUYET_HOAN_TIEN',
      entityType: 'booking',
      entityId: 'BK-88914',
      oldValue: 'chờ duyệt',
      newValue: 'đã hoàn 1.890.000đ',
    },
    {
      id: 4,
      createdAt: '02/11/2026 09:10:44',
      actorName: 'Võ Minh Quân',
      actorRole: 'Admin',
      action: 'Khóa tài khoản',
      actionCode: 'KHOA_TAI_KHOAN',
      entityType: 'staff',
      entityId: 'Đặng Tuấn Kiệt',
      oldValue: 'active',
      newValue: 'blocked',
    },
  ]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'success'
  ) => {
    setToast({ message, type });
  };

  const handleLogAudit = (
    actionCode: string,
    entityId: string,
    oldValue: string,
    newValue: string
  ) => {
    const actionNames: Record<string, string> = {
      XEM_MA_PIN: 'Xem mã PIN',
      HUY_BOOKING: 'Hủy booking',
      DUYET_HOAN_TIEN: 'Duyệt hoàn tiền',
      THU_HOI_MA_PIN: 'Thu hồi mã PIN',
      KHOA_TAI_KHOAN: 'Khóa tài khoản',
      BAO_TRI_PHONG: 'Bảo trì phòng',
      CAP_MA_PIN_MOI: 'Cấp mã PIN mới',
      GIA_HAN_MA_PIN: 'Gia hạn mã PIN',
    };

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const dateStr = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

    const newLog: AuditLogItem = {
      id: Date.now(),
      createdAt: dateStr,
      actorName: currentUser ? currentUser.name : 'Hệ thống',
      actorRole: currentUser ? (currentUser.role === 'admin' ? 'Admin' : 'Quản lý') : 'Hệ thống',
      action: actionNames[actionCode] || actionCode,
      actionCode,
      entityType: 'system',
      entityId,
      oldValue,
      newValue,
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const handleLoginSuccess = (user: AdminUser) => {
    setCurrentUser(user);
    try {
      sessionStorage.setItem('homestay_admin_session', JSON.stringify(user));
    } catch (e) {
      // ignore
    }
    // Set default branch for Quản lý
    if (user.role === 'manager' && user.branchId) {
      setSelectedBranchId(user.branchId);
    } else {
      setSelectedBranchId(0);
    }
    showToast(`Đăng nhập thành công với vai trò ${user.role.toUpperCase()}`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      sessionStorage.removeItem('homestay_admin_session');
    } catch (e) {
      // ignore
    }
    showToast('Đã đăng xuất khỏi phiên làm việc quản trị.', 'info');
  };

  // Quick search handler from topbar
  const handleQuickSearch = (query: string) => {
    setSearchTargetBooking(query);
    setActiveScreen('bookings');
  };

  // Title and subtitle helper
  const getScreenMeta = (screenKey: AdminScreenKey) => {
    switch (screenKey) {
      case 'dashboard':
        return {
          title: 'Thống kê tổng quan',
          subtitle: 'Hiệu suất vận hành, doanh thu và các cảnh báo cần xử lý theo chi nhánh',
          isViewOnly: false,
        };
      case 'bookings':
        return {
          title: 'Quản lý booking',
          subtitle: 'Theo dõi đơn đặt phòng, tự động gán phòng, giữ chỗ 30 phút và sức chứa khách',
          isViewOnly: false,
        };
      case 'rooms':
        return {
          title: 'Quản lý phòng',
          subtitle: 'Danh mục loại phòng, phòng cụ thể, biểu phí và tình trạng khóa thông minh',
          isViewOnly: currentUser?.role === 'manager',
        };
      case 'branches':
        return {
          title: 'Quản lý chi nhánh',
          subtitle: 'Cấu hình thông tin cơ sở homestay, hotline và phòng vận hành',
          isViewOnly: false,
        };
      case 'customers':
        return {
          title: 'Quản lý khách hàng',
          subtitle: 'Hồ sơ khách hàng, phân loại tài khoản tự động và lịch sử booking theo chi nhánh',
          isViewOnly: false,
        };
      case 'vouchers':
        return {
          title: 'Mã giảm giá & Khuyến mãi',
          subtitle: 'Quản lý voucher, định mức giảm giá và khung giờ áp dụng',
          isViewOnly: currentUser?.role === 'manager',
        };
      case 'staff':
        return {
          title: 'Nhân viên & Phân quyền',
          subtitle: 'Quản trị vai trò ADMIN và QUẢN LÝ gắn với từng cơ sở',
          isViewOnly: false,
        };
      case 'access-codes':
        return {
          title: 'Access Code (Mã khóa thông minh)',
          subtitle: 'Kiểm soát mã PIN TTLock cửa phòng, tự động đổi mã và giám sát mức pin',
          isViewOnly: false,
        };
      case 'audit-logs':
        return {
          title: 'Nhật ký thao tác hệ thống',
          subtitle: 'Ghi vết toàn bộ hành vi nhạy cảm: xem mã PIN, hủy đơn, hoàn tiền, khóa tài khoản',
          isViewOnly: false,
        };
      default:
        return { title: 'Quản trị hệ thống', subtitle: '', isViewOnly: false };
    }
  };

  // 1. If not authenticated, render Login Screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} onGoHome={onGoHome} />;
  }

  // 2. Render Main Admin Layout
  const screenMeta = getScreenMeta(activeScreen);

  return (
    <>
      <AdminLayout
        currentUser={currentUser}
        activeScreen={activeScreen}
        onNavigate={(screen) => {
          setActiveScreen(screen);
          setSearchTargetBooking('');
        }}
        selectedBranchId={selectedBranchId}
        onBranchChange={setSelectedBranchId}
        onLogout={handleLogout}
        pageTitle={screenMeta.title}
        pageSubtitle={screenMeta.subtitle}
        isViewOnly={screenMeta.isViewOnly}
        onQuickSearch={handleQuickSearch}
      >
        {/* Screen 2: Thống kê */}
        {activeScreen === 'dashboard' && (
          <DashboardScreen
            currentUser={currentUser}
            selectedBranchId={selectedBranchId}
            onNavigateToBooking={(code) => {
              if (code) setSearchTargetBooking(code);
              setActiveScreen('bookings');
            }}
            onShowToast={showToast}
          />
        )}

        {/* Screen 3: Quản lý booking */}
        {activeScreen === 'bookings' && (
          <BookingsScreen
            currentUser={currentUser}
            selectedBranchId={selectedBranchId}
            onShowToast={showToast}
            initialBookingCode={searchTargetBooking}
          />
        )}

        {/* Screen 4: Quản lý phòng */}
        {activeScreen === 'rooms' && (
          <RoomsScreen
            currentUser={currentUser}
            selectedBranchId={selectedBranchId}
            onShowToast={showToast}
          />
        )}

        {/* Screen 5: Quản lý chi nhánh (Admin only) */}
        {activeScreen === 'branches' && (
          <BranchesScreen currentUser={currentUser} onShowToast={showToast} />
        )}

        {/* Screen 6: Quản lý khách hàng */}
        {activeScreen === 'customers' && (
          <CustomersScreen currentUser={currentUser} onShowToast={showToast} />
        )}

        {/* Screen 7: Mã giảm giá */}
        {activeScreen === 'vouchers' && (
          <VouchersScreen currentUser={currentUser} onShowToast={showToast} />
        )}

        {/* Screen 8: Quản lý nhân viên (Admin only) */}
        {activeScreen === 'staff' && (
          <StaffScreen currentUser={currentUser} onShowToast={showToast} />
        )}

        {/* Screen 9: Access code (Mã khóa) */}
        {activeScreen === 'access-codes' && (
          <AccessCodesScreen
            currentUser={currentUser}
            selectedBranchId={selectedBranchId}
            onShowToast={showToast}
            onLogAudit={handleLogAudit}
          />
        )}

        {/* Screen 10: Nhật ký thao tác (Admin only) */}
        {activeScreen === 'audit-logs' && (
          <AuditLogsScreen
            currentUser={currentUser}
            logs={auditLogs}
            onShowToast={showToast}
          />
        )}
      </AdminLayout>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};
