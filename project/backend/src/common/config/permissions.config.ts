/**
 * PHÂN QUYỀN HỆ THỐNG HOMESTAY (RBAC BY PERMISSION)
 * Tuân thủ quy tắc: Viết theo permission, gán permission cho role, không rải if (role === 'admin').
 */

export enum Permission {
  // 1. Quản lý chi nhánh (APARTMENT)
  BRANCHES_VIEW = 'branches:view',
  BRANCHES_MANAGE = 'branches:manage', // Chỉ Admin (thêm, sửa, ẩn)

  // 2. Quản lý loại phòng (room_types)
  ROOM_TYPES_VIEW = 'room_types:view',
  ROOM_TYPES_MANAGE = 'room_types:manage', // Chỉ Admin (thêm, sửa, ẩn)

  // 3. Quản lý phòng cụ thể (ROOMS)
  ROOMS_VIEW = 'rooms:view',
  ROOMS_MANAGE = 'rooms:manage', // Chỉ Admin (thêm, sửa, ẩn, gán khóa)
  ROOMS_STATUS_UPDATE = 'rooms:status_update', // Admin & Manager (đổi status available/maintenance)

  // 4. Quản lý khách hàng (CUSTOMER)
  CUSTOMERS_VIEW = 'customers:view',
  CUSTOMERS_MANAGE = 'customers:manage', // Admin & Manager (thêm, sửa, ẩn, chặn)

  // 5. Quản lý đơn đặt phòng (BOOKINGS)
  BOOKINGS_VIEW = 'bookings:view',
  BOOKINGS_CANCEL_UNPAID = 'bookings:cancel_unpaid',
  BOOKINGS_EXTEND_HOLD = 'bookings:extend_hold',
  BOOKINGS_CANCEL_PAID_REFUND = 'bookings:cancel_paid_refund', // Chỉ Admin

  // 6. Quản lý mã khóa thông minh
  LOCKS_VIEW = 'locks:view',
  LOCKS_MANAGE = 'locks:manage', // Cấp mới, gửi lại, thu hồi mã PIN

  // 7. Danh mục khác (Voucher, giá, phụ phí, dịch vụ)
  VOUCHERS_VIEW = 'vouchers:view',
  VOUCHERS_MANAGE = 'vouchers:manage', // Chỉ Admin
  CATALOG_VIEW = 'catalog:view',
  CATALOG_MANAGE = 'catalog:manage', // Chỉ Admin

  // 8. Quản lý nhân viên & Phân quyền
  STAFF_MANAGE = 'staff:manage', // Chỉ Admin

  // 9. Nhật ký kiểm toán (Audit logs)
  AUDIT_VIEW = 'audit:view', // Chỉ Admin

  // 10. Duyệt giấy tờ CCCD
  VERIFICATION_REVIEW = 'verification:review',
  DOCS_VIEW_UNMASKED = 'docs:view_unmasked',

  // 11. Cảnh báo khẩn cấp & Lưu trữ
  ALERTS_VIEW = 'alerts:view',
  RETENTION_VIEW_JOBS = 'retention:view_jobs',
  RETENTION_CONFIGURE = 'retention:configure', // Chỉ Admin
}

export type StaffRole = 'admin' | 'manager';

export interface StaffContext {
  role: StaffRole;
  apartmentId?: number | null; // null/undefined for admin (toàn quyền tất cả chi nhánh)
  actor: string;
  email?: string;
  staffId?: number;
}

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  // Manager: Quản lý vận hành hàng ngày (giới hạn trong chi nhánh của mình)
  manager: [
    Permission.BRANCHES_VIEW, // Chỉ xem chi nhánh của mình
    Permission.ROOM_TYPES_VIEW, // Chỉ xem loại phòng chi nhánh mình
    Permission.ROOMS_VIEW, // Xem phòng chi nhánh mình
    Permission.ROOMS_STATUS_UPDATE, // Đổi status available/maintenance
    Permission.CUSTOMERS_VIEW, // Xem, tìm kiếm khách hàng
    Permission.CUSTOMERS_MANAGE, // Thêm, sửa, ẩn, chặn khách
    Permission.BOOKINGS_VIEW, // Xem đơn chi nhánh mình
    Permission.BOOKINGS_CANCEL_UNPAID,
    Permission.BOOKINGS_EXTEND_HOLD,
    Permission.LOCKS_VIEW,
    Permission.LOCKS_MANAGE,
    Permission.VOUCHERS_VIEW,
    Permission.CATALOG_VIEW,
    Permission.VERIFICATION_REVIEW,
    Permission.ALERTS_VIEW,
    Permission.RETENTION_VIEW_JOBS,
  ],

  // Admin: Toàn quyền hệ thống qua mọi chi nhánh
  admin: [
    Permission.BRANCHES_VIEW,
    Permission.BRANCHES_MANAGE, // Thêm / sửa / ẩn chi nhánh
    Permission.ROOM_TYPES_VIEW,
    Permission.ROOM_TYPES_MANAGE, // Thêm / sửa / ẩn loại phòng
    Permission.ROOMS_VIEW,
    Permission.ROOMS_MANAGE, // Thêm / sửa / ẩn / gán khóa phòng
    Permission.ROOMS_STATUS_UPDATE,
    Permission.CUSTOMERS_VIEW,
    Permission.CUSTOMERS_MANAGE,
    Permission.BOOKINGS_VIEW,
    Permission.BOOKINGS_CANCEL_UNPAID,
    Permission.BOOKINGS_EXTEND_HOLD,
    Permission.BOOKINGS_CANCEL_PAID_REFUND, // Hoàn tiền
    Permission.LOCKS_VIEW,
    Permission.LOCKS_MANAGE,
    Permission.VOUCHERS_VIEW,
    Permission.VOUCHERS_MANAGE,
    Permission.CATALOG_VIEW,
    Permission.CATALOG_MANAGE,
    Permission.STAFF_MANAGE, // Quản lý nhân viên
    Permission.AUDIT_VIEW, // Xem nhật ký audit
    Permission.VERIFICATION_REVIEW,
    Permission.DOCS_VIEW_UNMASKED,
    Permission.ALERTS_VIEW,
    Permission.RETENTION_VIEW_JOBS,
    Permission.RETENTION_CONFIGURE,
  ],
};

/**
 * Kiểm tra role có permission tương ứng
 */
export function hasPermission(
  role: StaffRole,
  permission: Permission,
  context?: { isVerificationQueue?: boolean },
): boolean {
  if (role === 'manager' && permission === Permission.DOCS_VIEW_UNMASKED) {
    return !!context?.isVerificationQueue;
  }
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Hàm che số CCCD/Hộ chiếu: Giữ 4 số đầu và 3 số cuối
 */
export function maskDocNumber(docNumber?: string | null): string {
  if (!docNumber) return '';
  const clean = docNumber.trim();
  if (clean.length <= 7) return clean;
  const prefix = clean.substring(0, 4);
  const suffix = clean.substring(clean.length - 3);
  return `${prefix}****${suffix}`;
}
