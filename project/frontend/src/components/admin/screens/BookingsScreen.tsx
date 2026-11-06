import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TableContainer,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Input,
  Modal,
  Drawer,
  ConfirmDialog,
  formatMoney,
  formatDateTime,
} from '../AdminUI';
import {
  IconSearch,
  IconPlus,
  IconClock,
  IconEye,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconRefresh,
  IconEdit,
} from '../AdminIcons';
import { AdminUser } from '../AdminLayout';
import { adminService, adminApi, getSimRooms, getSimRoomTypes, getSimBookings, HOMESTAY_EXTRA_SERVICES } from '../../../services/adminService';

// ============================================================
// TYPES
// ============================================================
type BookingTab = 'all' | 'pending_payment' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
type StayType = 'overnight' | 'daily' | 'extended';

interface BookingsScreenProps {
  currentUser: AdminUser;
  selectedBranchId: number;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  initialBookingCode?: string;
}

// ============================================================
// HELPERS
// ============================================================
const STAY_TYPE_CONFIG: Record<StayType, { label: string; desc: string; checkIn: string; checkOut: string; multiplier: number }> = {
  overnight: { label: 'Qua đêm', desc: '19:00 → 12:00 hôm sau', checkIn: '19:00', checkOut: '12:00', multiplier: 0.7 },
  daily:     { label: 'Trong ngày', desc: '07:00 → 17:00', checkIn: '07:00', checkOut: '17:00', multiplier: 0.7 },
  extended:  { label: 'Qua ngày', desc: '14:00 → 12:00 hôm sau', checkIn: '14:00', checkOut: '12:00', multiplier: 1.0 },
};

const TAB_CONFIG: Record<BookingTab, { label: string; statusFilter?: string }> = {
  all:             { label: 'Tất cả' },
  pending_payment: { label: 'Chưa thanh toán', statusFilter: 'pending_payment' },
  confirmed:       { label: 'Thành công', statusFilter: 'confirmed' },
  checked_in:      { label: 'Đang lưu trú', statusFilter: 'checked_in' },
  checked_out:     { label: 'Hoàn tất', statusFilter: 'checked_out' },
  cancelled:       { label: 'Đã hủy', statusFilter: 'cancelled' },
};

function getBookingStatusBadge(status: string) {
  const cfg: Record<string, JSX.Element> = {
    pending_payment: <Badge variant="warning" size="sm">Chưa thanh toán</Badge>,
    confirmed:       <Badge variant="success" size="sm">Thành công</Badge>,
    checked_in:      <Badge variant="info" size="sm">Đang lưu trú</Badge>,
    checked_out:     <Badge variant="neutral" size="sm">Hoàn tất</Badge>,
    cancelled:       <Badge variant="danger" size="sm">Đã hủy</Badge>,
    expired:         <Badge variant="warning" size="sm">Hết hạn</Badge>,
    draft:           <Badge variant="neutral" size="sm">Nháp</Badge>,
  };
  return cfg[status] || <Badge variant="neutral" size="sm">{status}</Badge>;
}

function getStayTypeLabel(type: string) {
  return STAY_TYPE_CONFIG[type as StayType]?.label || type;
}

function calcNights(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000));
}

function daysUntilCheckin(booked_start_time: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkin = new Date(booked_start_time);
  checkin.setHours(0, 0, 0, 0);
  return Math.ceil((checkin.getTime() - today.getTime()) / 86400000);
}

function isRefundEligible(booked_start_time: string): boolean {
  return daysUntilCheckin(booked_start_time) > 10;
}

function formatCountdown(holdExpiresAt: string | undefined): { text: string; urgent: boolean } {
  if (!holdExpiresAt) return { text: '—', urgent: false };
  const remaining = Math.max(0, Math.floor((new Date(holdExpiresAt).getTime() - Date.now()) / 1000));
  if (remaining === 0) return { text: 'Đã hết hạn', urgent: true };
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return { text: `${m}:${String(s).padStart(2, '0')}`, urgent: remaining < 300 };
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export const BookingsScreen: React.FC<BookingsScreenProps> = ({
  currentUser,
  selectedBranchId,
  onShowToast,
  initialBookingCode,
}) => {
  // ---- Tabs ----
  const [activeTab, setActiveTab] = useState<BookingTab>('all');

  // ---- Filters ----
  const [filterBookingType, setFilterBookingType] = useState('all');
  const [searchQuery, setSearchQuery] = useState(initialBookingCode || '');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ---- Data ----
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [roomTypesList, setRoomTypesList] = useState<any[]>([]);

  // ---- Countdown timer ----
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ---- Detail drawer ----
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  // ---- Early checkout confirm ----
  const [showEarlyCheckoutConfirm, setShowEarlyCheckoutConfirm] = useState(false);
  const [earlyCheckoutTarget, setEarlyCheckoutTarget] = useState<any | null>(null);

  // ---- Refund confirm ----
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refundTarget, setRefundTarget] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState('');

  // ---- Cancel confirm (pending_payment) ----
  const [showCancelPendingConfirm, setShowCancelPendingConfirm] = useState(false);
  const [cancelPendingTarget, setCancelPendingTarget] = useState<any | null>(null);
  const [cancelPendingReason, setCancelPendingReason] = useState('');

  // ---- Edit Booking Modal ----
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editBranchId, setEditBranchId] = useState<number>(1);
  const [editRoomTypeId, setEditRoomTypeId] = useState<number>(0);
  const [editRoomId, setEditRoomId] = useState<number | null>(null);
  const [editNewCheckIn, setEditNewCheckIn] = useState('');
  const [editNewCheckout, setEditNewCheckout] = useState('');
  const [editConflictMsg, setEditConflictMsg] = useState('');
  const [editHasConflict, setEditHasConflict] = useState(false);
  const [editServices, setEditServices] = useState<Array<{ serviceId: string; quantity: number }>>([]);
  const [editIsFree, setEditIsFree] = useState(false);
  const [editFeeOption, setEditFeeOption] = useState<'pay_now' | 'pay_at_checkout'>('pay_now');
  const [editReason, setEditReason] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // ---- Wizard Modal tạo booking 3 bước ----
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardLoading, setWizardLoading] = useState(false);

  // Wizard Step 1
  const [wBranchId, setWBranchId] = useState(currentUser.role === 'manager' ? currentUser.branchId || 1 : 1);
  const [wRoomTypeId, setWRoomTypeId] = useState(0);
  const [wStayType, setWStayType] = useState<StayType>('extended');
  const [wCheckIn, setWCheckIn] = useState(new Date().toISOString().slice(0, 10));
  const [wCheckOut, setWCheckOut] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [wNumRooms, setWNumRooms] = useState(1);
  const [wAdults, setWAdults] = useState(1);
  const [wChildren, setWChildren] = useState(0);
  const [wQuote, setWQuote] = useState<any>(null);
  const [wStep1Error, setWStep1Error] = useState('');

  // Wizard Step 2
  const [wGuestName, setWGuestName] = useState('');
  const [wGuestPhone, setWGuestPhone] = useState('');
  const [wGuestEmail, setWGuestEmail] = useState('');
  const [wGuestCCCD, setWGuestCCCD] = useState('');
  const [wStep2Error, setWStep2Error] = useState('');
  // Người đi cùng — số lượng = wAdults + wChildren - 1 (trừ người đặt chính)
  const [wCompanions, setWCompanions] = useState<Array<{
    name: string;
    phone?: string;
    cccd?: string;
    date_of_birth?: string;
    type: 'adult' | 'child';
    nationality?: string;
  }>>([]);

  // Wizard Step 3
  const [wSelectedRoomIds, setWSelectedRoomIds] = useState<(number | null)[]>([null]);
  const [wCollectedAmount, setWCollectedAmount] = useState('');
  const [wStep3Error, setWStep3Error] = useState('');
  const [wCreatedBooking, setWCreatedBooking] = useState<any>(null);

  // ============================================================
  // LOAD DATA
  // ============================================================
  useEffect(() => {
    adminService.getBranches(currentUser.role).then((res: any) => {
      setBranchesList(Array.isArray(res) ? res : (res?.items || []));
    }).catch(() => {});
    adminService.getAdminRoomTypes(currentUser.role).then((res: any) => {
      setRoomTypesList(Array.isArray(res) ? res : (res?.items || []));
    }).catch(() => {});
  }, [currentUser.role]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getBookings(
        {
          tab: activeTab,
          booking_type: filterBookingType !== 'all' ? filterBookingType : undefined,
          search: searchQuery.trim() || undefined,
          page: currentPage,
          limit: pageSize,
        },
        currentUser.role
      );
      if (res && res.items) {
        setBookings(res.items);
        setTotalCount(res.total || 0);
      } else if (Array.isArray(res)) {
        setBookings(res);
        setTotalCount(res.length);
      }
    } catch {
      onShowToast('Không tải được danh sách đơn.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterBookingType, searchQuery, currentPage, currentUser.role]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // ============================================================
  // ACTIONS
  // ============================================================

  // Check-out sớm
  const handleEarlyCheckout = async () => {
    if (!earlyCheckoutTarget) return;
    try {
      await adminService.checkOutBooking(earlyCheckoutTarget.id, currentUser.role);
      onShowToast(`Đã check-out sớm đơn ${earlyCheckoutTarget.booking_code}. Phòng chuyển sang Cần dọn dẹp.`, 'success');
      setShowEarlyCheckoutConfirm(false);
      setEarlyCheckoutTarget(null);
      await fetchBookings();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi check-out.', 'error');
    }
  };

  // Hoàn tiền
  const handleRefund = async () => {
    if (!refundTarget) return;
    try {
      const refundAmount = refundTarget.paid_amount || refundTarget.total_amount || 0;
      await adminService.cancelPaidBookingAndRefund(refundTarget.id, refundAmount, refundReason || 'Hoàn tiền theo yêu cầu', currentUser.role);
      onShowToast(`Đã ghi nhận hoàn tiền ${formatMoney(refundAmount)} cho đơn ${refundTarget.booking_code}.`, 'success');
      setShowRefundConfirm(false);
      setRefundTarget(null);
      setRefundReason('');
      await fetchBookings();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi hoàn tiền.', 'error');
    }
  };

  // Hủy giữ chỗ
  const handleCancelPending = async () => {
    if (!cancelPendingTarget) return;
    try {
      await adminService.cancelUnpaidBooking(cancelPendingTarget.id, cancelPendingReason || 'Hủy bởi nhân viên', currentUser.role);
      onShowToast(`Đã hủy giữ chỗ đơn ${cancelPendingTarget.booking_code}.`, 'success');
      setShowCancelPendingConfirm(false);
      setCancelPendingTarget(null);
      setCancelPendingReason('');
      await fetchBookings();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi hủy đơn.', 'error');
    }
  };

  // ---- Edit Booking helpers & handlers ----
  const editAvailableRoomTypes = useMemo(() => {
    return roomTypesList.filter(rt => rt.apartment_id === Number(editBranchId));
  }, [roomTypesList, editBranchId]);

  const editSelectedRoomType = useMemo(() => {
    return roomTypesList.find(rt => rt.id === Number(editRoomTypeId));
  }, [roomTypesList, editRoomTypeId]);

  const editAvailableRooms = useMemo(() => {
    const allRooms = getSimRooms();
    return allRooms.filter(r => r.room_type_id === Number(editRoomTypeId) && !r.is_hidden);
  }, [editRoomTypeId]);

  const checkScheduleConflict = useCallback((
    branchId: number,
    roomTypeId: number,
    roomId: number | null,
    checkInDate: string,
    checkOutDate: string,
    targetBooking: any,
  ) => {
    if (!targetBooking || !checkInDate || !checkOutDate) return { hasConflict: false, message: '' };

    const isCheckedIn = targetBooking.booking_status === 'checked_in';
    const oldCheckIn = targetBooking.booked_start_time.slice(0, 10);
    const oldCheckOut = targetBooking.booked_end_time.slice(0, 10);
    const oldNights = calcNights(oldCheckIn, oldCheckOut);
    const newNights = calcNights(checkInDate, checkOutDate);

    // 1. Không giảm số lượng ngày ở
    if (newNights < oldNights) {
      return {
        hasConflict: true,
        message: `Không được giảm số lượng ngày ở! Đơn gốc: ${oldNights} đêm, mới chọn: ${newNights} đêm. Chỉ được phép tăng hoặc giữ nguyên.`,
      };
    }

    // 2. Với đơn đã Check-in:
    if (isCheckedIn) {
      if (new Date(checkOutDate) <= new Date(oldCheckOut)) {
        return {
          hasConflict: true,
          message: `Khách đang lưu trú: Ngày check-out mới phải sau ngày check-out hiện tại (${new Date(oldCheckOut).toLocaleDateString('vi-VN')})!`,
        };
      }
    }

    // 3. Nếu có phòng cụ thể được chọn: kiểm tra lịch phòng
    if (roomId) {
      const isOriginalRoom = roomId === targetBooking.rooms?.[0]?.room_id;
      const startToCheck = (isCheckedIn && isOriginalRoom) ? oldCheckOut : checkInDate;

      const res = adminApi.checkRoomDateConflict(roomId, startToCheck, checkOutDate, targetBooking.id);
      if (res.hasConflict) {
        if (isCheckedIn && isOriginalRoom) {
          return {
            hasConflict: true,
            message: `⚠️ Phòng hiện tại (${targetBooking.rooms?.[0]?.room_number || ''}) đã kín lịch trong những ngày gia hạn thêm (${res.message}). Vui lòng đổi sang loại phòng và chọn một phòng cụ thể khác còn trống trước khi gia hạn!`,
          };
        }
        return {
          hasConflict: true,
          message: `⚠️ Phòng đã chọn bị trùng lịch: ${res.message}. Vui lòng chọn phòng khác!`,
        };
      }
    } else {
      const concrete = getSimRooms().filter(r => r.room_type_id === roomTypeId && !r.is_hidden);
      if (concrete.length === 0) {
        return {
          hasConflict: true,
          message: 'Loại phòng này hiện chưa có phòng thực tế nào trong hệ thống.',
        };
      }
    }

    return {
      hasConflict: false,
      message: 'Lịch phòng hoàn toàn còn trống! Đủ điều kiện lưu thay đổi.',
    };
  }, []);

  const openEditModal = (b: any) => {
    setEditTarget(b);
    const branch = b.apartment_id || (b.rooms?.[0]?.room_types_id ? roomTypesList.find(rt => rt.id === b.rooms[0].room_types_id)?.apartment_id : 1) || 1;
    const roomTypeId = b.rooms?.[0]?.room_types_id || 0;
    const roomId = b.rooms?.[0]?.room_id || null;
    const start = b.booked_start_time?.slice(0, 10) || '';
    const end = b.booked_end_time?.slice(0, 10) || '';

    setEditBranchId(branch);
    setEditRoomTypeId(roomTypeId);
    setEditRoomId(roomId);
    setEditNewCheckIn(start);
    setEditNewCheckout(end);
    setEditServices([]);
    setEditIsFree(false);
    setEditFeeOption('pay_now');
    setEditReason('');

    const verify = checkScheduleConflict(branch, roomTypeId, roomId, start, end, b);
    setEditHasConflict(verify.hasConflict);
    setEditConflictMsg(verify.message);

    setShowEditModal(true);
  };

  const handleEditBranchChange = (newBranchId: number) => {
    setEditBranchId(newBranchId);
    const roomTypesInNewBranch = roomTypesList.filter(rt => rt.apartment_id === newBranchId);
    const currentRt = roomTypesList.find(rt => rt.id === editRoomTypeId);

    const matchingRt = currentRt ? roomTypesInNewBranch.find(rt => rt.name.trim().toLowerCase() === currentRt.name.trim().toLowerCase()) : null;
    const chosenRtId = matchingRt ? matchingRt.id : (roomTypesInNewBranch[0]?.id || 0);

    setEditRoomTypeId(chosenRtId);
    setEditRoomId(null);

    const verify = checkScheduleConflict(newBranchId, chosenRtId, null, editNewCheckIn, editNewCheckout, editTarget);
    setEditHasConflict(verify.hasConflict);
    setEditConflictMsg(verify.message);
  };

  const handleEditRoomTypeChange = (newRoomTypeId: number) => {
    setEditRoomTypeId(newRoomTypeId);
    setEditRoomId(null);

    const verify = checkScheduleConflict(editBranchId, newRoomTypeId, null, editNewCheckIn, editNewCheckout, editTarget);
    setEditHasConflict(verify.hasConflict);
    setEditConflictMsg(verify.message);
  };

  const handleEditRoomIdChange = (newRoomId: number | null) => {
    setEditRoomId(newRoomId);
    const verify = checkScheduleConflict(editBranchId, editRoomTypeId, newRoomId, editNewCheckIn, editNewCheckout, editTarget);
    setEditHasConflict(verify.hasConflict);
    setEditConflictMsg(verify.message);
  };

  const handleEditCheckInChange = (newDate: string) => {
    setEditNewCheckIn(newDate);
    const verify = checkScheduleConflict(editBranchId, editRoomTypeId, editRoomId, newDate, editNewCheckout, editTarget);
    setEditHasConflict(verify.hasConflict);
    setEditConflictMsg(verify.message);
  };

  const handleEditCheckoutChange = (newDate: string) => {
    setEditNewCheckout(newDate);
    const verify = checkScheduleConflict(editBranchId, editRoomTypeId, editRoomId, editNewCheckIn, newDate, editTarget);
    setEditHasConflict(verify.hasConflict);
    setEditConflictMsg(verify.message);
  };

  const calcEditTotals = () => {
    if (!editTarget) return { oldNights: 0, newNights: 0, oldRoomTotal: 0, newRoomTotal: 0, roomCostDiff: 0, servicesCost: 0, total: 0, addedServices: [] };

    const oldStart = editTarget.booked_start_time.slice(0, 10);
    const oldEnd = editTarget.booked_end_time.slice(0, 10);
    const oldNights = calcNights(oldStart, oldEnd);
    const oldBasePrice = editTarget.rooms?.[0]?.base_price || 0;
    const oldRoomTotal = oldNights * oldBasePrice;

    const newNights = editNewCheckIn && editNewCheckout ? calcNights(editNewCheckIn, editNewCheckout) : oldNights;
    const newBasePrice = editSelectedRoomType?.base_price ?? oldBasePrice;
    const newRoomTotal = newNights * newBasePrice;

    const roomCostDiff = Math.max(0, newRoomTotal - oldRoomTotal);

    let servicesCost = 0;
    const addedServices = editServices
      .filter(s => s.quantity > 0)
      .map(s => {
        const def = HOMESTAY_EXTRA_SERVICES.find(x => x.id === s.serviceId)!;
        const amount = def.price * s.quantity;
        servicesCost += amount;
        return { service_id: def.id, service_name: def.name, unit: def.unit, price: def.price, quantity: s.quantity, amount };
      });

    const total = roomCostDiff + servicesCost;
    return { oldNights, newNights, oldRoomTotal, newRoomTotal, roomCostDiff, servicesCost, total, addedServices };
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (!editReason.trim()) { onShowToast('Vui lòng nhập lý do chỉnh sửa (bắt buộc).', 'error'); return; }

    const conflict = checkScheduleConflict(editBranchId, editRoomTypeId, editRoomId, editNewCheckIn, editNewCheckout, editTarget);
    if (conflict.hasConflict) {
      onShowToast(conflict.message, 'error');
      return;
    }

    const { roomCostDiff, servicesCost, total, addedServices } = calcEditTotals();
    const branchObj = branchesList.find(b => b.id === Number(editBranchId));
    const roomTypeObj = roomTypesList.find(rt => rt.id === Number(editRoomTypeId));
    const concreteRoomObj = getSimRooms().find(r => r.room_id === editRoomId);

    const isCheckedIn = editTarget.booking_status === 'checked_in';

    setEditSaving(true);
    try {
      const finalCharged = editIsFree ? 0 : total;
      await adminApi.editBookingDetails(editTarget.id, {
        new_branch_id: !isCheckedIn ? Number(editBranchId) : undefined,
        new_branch_name: !isCheckedIn ? branchObj?.name : undefined,
        new_room_type_id: Number(editRoomTypeId),
        new_room_type_name: roomTypeObj?.name,
        new_room_id: editRoomId,
        new_room_number: concreteRoomObj?.room_number || null,
        new_base_price: roomTypeObj?.base_price,
        new_check_in: !isCheckedIn ? `${editNewCheckIn} 14:00:00` : undefined,
        new_check_out: `${editNewCheckout} 12:00:00`,
        added_services: addedServices,
        extra_room_amount: roomCostDiff,
        extra_services_amount: servicesCost,
        final_charged_amount: finalCharged,
        is_free: editIsFree,
        fee_option: editFeeOption,
        reason: editReason.trim(),
      }, currentUser.role);

      onShowToast(`Đã lưu chỉnh sửa đơn ${editTarget.booking_code}!`, 'success');
      setShowEditModal(false);
      setEditTarget(null);
      await fetchBookings();
    } catch (err: any) {
      onShowToast(err?.message || 'Lỗi khi lưu chỉnh sửa.', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // ============================================================
  // WIZARD LOGIC
  // ============================================================
  const openWizard = () => {
    setWizardStep(1);
    setWBranchId(currentUser.role === 'manager' ? currentUser.branchId || 1 : 1);
    setWRoomTypeId(0);
    setWStayType('extended');
    setWCheckIn(new Date().toISOString().slice(0, 10));
    setWCheckOut(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    setWNumRooms(1);
    setWAdults(1);
    setWChildren(0);
    setWQuote(null);
    setWStep1Error('');
    setWGuestName('');
    setWGuestPhone('');
    setWGuestEmail('');
    setWGuestCCCD('');
    setWStep2Error('');
    setWCompanions([]);
    setWSelectedRoomIds([null]);
    setWCollectedAmount('');
    setWStep3Error('');
    setWCreatedBooking(null);
    setShowWizard(true);
  };

  // Auto-resize companion array when guest count changes
  useEffect(() => {
    const count = Math.max(0, wAdults + wChildren - 1);
    setWCompanions(prev => {
      const next = [...prev];
      while (next.length < count) {
        const idx = next.length;
        next.push({ name: '', phone: '', cccd: '', type: idx < wAdults - 1 ? 'adult' : 'child', nationality: 'Việt Nam' });
      }
      while (next.length > count) next.pop();
      return next;
    });
  }, [wAdults, wChildren]);

  // Filtered room types by branch
  const filteredRoomTypes = useMemo(
    () => roomTypesList.filter(rt => !wBranchId || rt.apartment_id === Number(wBranchId)),
    [roomTypesList, wBranchId]
  );

  // Available rooms for step 3
  const availableRooms = useMemo(() => {
    const allRooms = getSimRooms();
    return allRooms.filter(r => r.room_type_id === wRoomTypeId && r.status === 'available' && !r.is_hidden);
  }, [wRoomTypeId]);

  // Count of available rooms for validation
  const availableRoomCount = useMemo(() => availableRooms.length, [availableRooms]);

  // Selected room type info
  const selectedRoomType = useMemo(
    () => roomTypesList.find(rt => rt.id === wRoomTypeId),
    [roomTypesList, wRoomTypeId]
  );

  // Calculate quote locally
  const calcQuote = useCallback(() => {
    if (!selectedRoomType) return null;
    const cfg = STAY_TYPE_CONFIG[wStayType];
    const nights = calcNights(wCheckIn, wCheckOut);
    const total = Math.round(selectedRoomType.base_price * cfg.multiplier * wNumRooms * nights);
    return {
      base_price: selectedRoomType.base_price,
      multiplier: cfg.multiplier,
      nights,
      num_rooms: wNumRooms,
      total_amount: total,
      max_occupancy: selectedRoomType.max_occupancy,
      room_type_name: selectedRoomType.name,
    };
  }, [selectedRoomType, wStayType, wCheckIn, wCheckOut, wNumRooms]);

  useEffect(() => {
    if (wRoomTypeId && wCheckIn && wCheckOut) {
      setWQuote(calcQuote());
    } else {
      setWQuote(null);
    }
  }, [wRoomTypeId, wStayType, wCheckIn, wCheckOut, wNumRooms, calcQuote]);

  // Auto-fill checkout date based on stay type & check-in
  useEffect(() => {
    if (!wCheckIn) return;
    const cfg = STAY_TYPE_CONFIG[wStayType];
    const checkInDate = new Date(wCheckIn);
    if (wStayType === 'daily') {
      setWCheckOut(wCheckIn); // same day
    } else {
      const nextDay = new Date(checkInDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setWCheckOut(nextDay.toISOString().slice(0, 10));
    }
  }, [wStayType, wCheckIn]);

  // Sync wSelectedRoomIds length with wNumRooms
  useEffect(() => {
    setWSelectedRoomIds(prev => {
      const arr = [...prev];
      while (arr.length < wNumRooms) arr.push(null);
      return arr.slice(0, wNumRooms);
    });
  }, [wNumRooms]);

  // Validate Step 1
  const validateStep1 = (): string => {
    if (!wRoomTypeId) return 'Vui lòng chọn loại phòng.';
    if (!wCheckIn) return 'Vui lòng chọn ngày check-in.';
    if (!wCheckOut) return 'Vui lòng chọn ngày check-out.';
    if (new Date(wCheckIn) < new Date(new Date().toISOString().slice(0, 10))) return 'Ngày check-in không được là ngày trong quá khứ.';
    if (wStayType !== 'daily' && new Date(wCheckOut) <= new Date(wCheckIn)) return 'Ngày check-out phải sau ngày check-in.';
    if (wAdults < 1) return 'Số người lớn tối thiểu là 1.';
    if (selectedRoomType && wAdults > selectedRoomType.max_occupancy * wNumRooms) {
      return `Số người lớn vượt sức chứa tối đa (${selectedRoomType.max_occupancy} người × ${wNumRooms} phòng = ${selectedRoomType.max_occupancy * wNumRooms}).`;
    }
    if (availableRoomCount < wNumRooms) {
      return `Loại phòng này chỉ còn ${availableRoomCount} phòng trống, không đủ ${wNumRooms} phòng yêu cầu.`;
    }
    return '';
  };

  // Validate Step 2
  const validateStep2 = (): string => {
    if (!wGuestName.trim() || wGuestName.trim().length < 2) return 'Vui lòng nhập họ và tên (ít nhất 2 ký tự).';
    if (!wGuestPhone.trim()) return 'Vui lòng nhập số điện thoại.';
    if (!/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(wGuestPhone.replace(/[\s.-]/g, ''))) return 'Số điện thoại không hợp lệ.';
    if (wGuestEmail && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(wGuestEmail.trim())) return 'Email không hợp lệ.';
    if (!wGuestCCCD.trim()) return 'Vui lòng nhập số CCCD / Hộ chiếu.';
    if (!/^\d{9,12}$/.test(wGuestCCCD.replace(/\s/g, ''))) return 'Số CCCD phải có 9 hoặc 12 chữ số.';
    for (let i = 0; i < wCompanions.length; i++) {
      const comp = wCompanions[i];
      if (!comp.name.trim()) return `Vui lòng nhập họ tên người đi cùng #${i + 1}.`;
      if (comp.type === 'adult') {
        if (!comp.cccd || !comp.cccd.trim()) return `Vui lòng nhập số CCCD người đi cùng #${i + 1} (Người lớn).`;
      } else {
        if (!comp.date_of_birth || !comp.date_of_birth.trim()) return `Vui lòng chọn ngày sinh cho người đi cùng #${i + 1} (Trẻ em).`;
      }
    }
    return '';
  };

  // Validate Step 3 - amount match
  const isAmountMatched = useMemo(() => {
    if (!wQuote || !wCollectedAmount) return false;
    const entered = parseInt(wCollectedAmount.replace(/[^\d]/g, ''), 10);
    return entered === wQuote.total_amount;
  }, [wQuote, wCollectedAmount]);

  const validateStep3 = (): string => {
    for (let i = 0; i < wNumRooms; i++) {
      if (!wSelectedRoomIds[i]) return `Vui lòng chọn phòng cụ thể cho phòng số ${i + 1}.`;
    }
    if (!isAmountMatched) return 'Số tiền thu chưa khớp với tổng tiền cần thu.';
    return '';
  };

  const handleWizardNext = async () => {
    if (wizardStep === 1) {
      const err = validateStep1();
      if (err) { setWStep1Error(err); return; }
      setWStep1Error('');
      setWizardStep(2);
    } else if (wizardStep === 2) {
      const err = validateStep2();
      if (err) { setWStep2Error(err); return; }
      setWStep2Error('');
      setWizardStep(3);
    } else if (wizardStep === 3) {
      const err = validateStep3();
      if (err) { setWStep3Error(err); return; }
      setWStep3Error('');
      await handleWizardSubmit();
    }
  };

  const handleWizardSubmit = async () => {
    setWizardLoading(true);
    try {
      const cfg = STAY_TYPE_CONFIG[wStayType];
      const result = await adminService.manualHoldBooking({
        apartment_id: wBranchId,
        room_type_id: wRoomTypeId,
        booking_type: wStayType,
        check_in: wCheckIn,
        check_out: wCheckOut,
        adults: wAdults,
        children: wChildren,
        num_rooms: wNumRooms,
        guest_name: wGuestName.trim(),
        guest_phone: wGuestPhone.trim(),
        guest_email: wGuestEmail.trim(),
        guest_cccd: wGuestCCCD.trim(),
        companions: wCompanions,
        room_ids: wSelectedRoomIds.filter(Boolean) as number[],
        paid_amount: wQuote?.total_amount || 0,
      }, currentUser.role);

      // Gán phòng + ghi thanh toán
      if (result?.id) {
        await adminService.recordCounterPayment(result.id, {
          amount: wQuote?.total_amount || 0,
          payment_method: 'counter_cash',
          note: 'Thu tại quầy',
          room_ids: wSelectedRoomIds.filter(Boolean) as number[],
        }, currentUser.role);
      }

      setWCreatedBooking(result);
      setWizardStep(4); // Bước kết quả
      onShowToast(`Đã tạo đơn ${result?.booking_code || ''} thành công!`, 'success');
      await fetchBookings();
    } catch (err: any) {
      setWStep3Error(err?.response?.data?.message || 'Lỗi khi tạo đơn. Vui lòng thử lại.');
    } finally {
      setWizardLoading(false);
    }
  };

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const renderTabBadge = (tab: BookingTab) => {
    const count = tab === 'all'
      ? bookings.length
      : bookings.filter(b => b.booking_status === TAB_CONFIG[tab].statusFilter).length;
    if (activeTab !== tab) return null;
    return <span className="ml-1.5 bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full">{count}</span>;
  };

  const renderBookingRow = (b: any) => {
    const countdown = formatCountdown(b.hold_expires_at);
    const refundOk = b.booking_status === 'cancelled' && isRefundEligible(b.booked_start_time);
    const rooms = b.rooms || [];
    const hasConcreteRoom = rooms.some((r: any) => r.room_id);
    const totalPaid = b.paid_amount || b.total_amount || rooms.reduce((acc: number, r: any) => acc + (r.base_price || 0), 0);

    return (
      <TableRow key={b.id}>
        {/* Mã đơn */}
        <td className="py-2.5 px-3.5">
          <div className="font-mono text-xs font-bold text-[#B4532A]">{b.booking_code}</div>
          <div className="text-[11px] text-[#78716C]">{getStayTypeLabel(b.booking_type)}</div>
        </td>

        {/* Khách hàng */}
        <td className="py-2.5 px-3.5">
          <div className="text-xs font-medium text-[#1C1917]">{b.customer_name || '—'}</div>
          <div className="text-[11px] text-[#78716C]">{b.customer_phone || b.customer_email || ''}</div>
        </td>

        {/* Phòng */}
        <td className="py-2.5 px-3.5">
          {rooms.length === 0 ? (
            <span className="text-[11px] text-[#78716C]">—</span>
          ) : rooms.map((r: any, i: number) => (
            <div key={i} className="text-xs">
              <span className="font-medium text-[#44403C]">{r.room_type_name}</span>
              {r.room_number && <span className="ml-1 font-mono text-[#B4532A]">({r.room_number})</span>}
              {!r.room_id && b.booking_status === 'pending_payment' && (
                <span className="ml-1 text-[10px] text-[#78716C] italic">chưa gán</span>
              )}
            </div>
          ))}
        </td>

        {/* Ngày */}
        <td className="py-2.5 px-3.5 text-xs text-[#44403C]">
          <div>{new Date(b.booked_start_time).toLocaleDateString('vi-VN')}</div>
          <div className="text-[11px] text-[#78716C]">→ {new Date(b.booked_end_time).toLocaleDateString('vi-VN')}</div>
        </td>

        {/* Tiền */}
        <td className="py-2.5 px-3.5 text-right">
          <div className="font-mono text-xs font-bold text-[#1C1917]">{formatMoney(totalPaid)}</div>
          {b.refund_amount && (
            <div className="text-[10px] text-[#B4532A]">Hoàn: {formatMoney(b.refund_amount)}</div>
          )}
        </td>

        {/* Trạng thái */}
        <td className="py-2.5 px-3.5">
          {getBookingStatusBadge(b.booking_status)}
          {b.booking_status === 'pending_payment' && (
            <div className={`text-[10px] mt-0.5 font-mono ${countdown.urgent ? 'text-[#DC2626] font-bold animate-pulse' : 'text-[#78716C]'}`}>
              ⏱ {countdown.text}
            </div>
          )}
        </td>

        {/* Thao tác */}
        <td className="py-2.5 px-3.5">
          <div className="flex flex-wrap items-center gap-1">
            {/* Xem chi tiết */}
            <Button
              variant="outline" size="sm"
              icon={<IconEye className="w-3.5 h-3.5" />}
              onClick={async () => {
                try {
                  const detail = await adminService.getBookingDetail(b.id, currentUser.role);
                  setSelectedBooking(detail || b);
                } catch {
                  setSelectedBooking(b);
                }
                setShowDetailDrawer(true);
              }}
            >
              Chi tiết
            </Button>

            {/* Tab: Chưa thanh toán — Hủy */}
            {b.booking_status === 'pending_payment' && (
              <>
                <Button
                  variant="danger" size="sm"
                  icon={<IconX className="w-3.5 h-3.5" />}
                  onClick={() => { setCancelPendingTarget(b); setCancelPendingReason(''); setShowCancelPendingConfirm(true); }}
                >
                  Hủy
                </Button>
              </>
            )}

            {/* Tab: Confirmed / Đang lưu trú — Sửa đơn */}
            {['confirmed', 'checked_in'].includes(b.booking_status) && (
              <Button
                variant="outline" size="sm"
                icon={<IconEdit className="w-3.5 h-3.5" />}
                onClick={() => openEditModal(b)}
              >
                Sửa đơn
              </Button>
            )}

            {/* Tab: Đang lưu trú — Check-out sớm */}
            {b.booking_status === 'checked_in' && (
              <Button
                variant="secondary" size="sm"
                icon={<IconCheck className="w-3.5 h-3.5" />}
                onClick={() => { setEarlyCheckoutTarget(b); setShowEarlyCheckoutConfirm(true); }}
                className="!text-[#9C5B14] !bg-[#FDF7EE] !border-[#F7DCB4] hover:!bg-[#FBEFD9]"
              >
                Check-out sớm
              </Button>
            )}

            {/* Tab: Đã hủy — Hoàn tiền */}
            {b.booking_status === 'cancelled' && (b.paid_amount || 0) > 0 && (
              <div className="relative group">
                <Button
                  variant={refundOk ? 'primary' : 'outline'}
                  size="sm"
                  disabled={!refundOk}
                  onClick={() => {
                    if (refundOk) {
                      setRefundTarget(b);
                      setRefundReason('');
                      setShowRefundConfirm(true);
                    }
                  }}
                  className={!refundOk ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  Hoàn tiền
                </Button>
                {!refundOk && (
                  <div className="absolute bottom-full right-0 mb-1.5 w-56 bg-[#1C1917] text-white text-[10px] rounded-[4px] px-2.5 py-1.5 z-50 shadow-lg hidden group-hover:block">
                    Chỉ áp dụng hoàn tiền cho đơn hủy trước ngày nhận phòng trên 10 ngày (còn {daysUntilCheckin(b.booked_start_time)} ngày)
                    <div className="absolute bottom-[-4px] right-3 w-2 h-2 bg-[#1C1917] rotate-45"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </td>
      </TableRow>
    );
  };

  // ============================================================
  // WIZARD STEPS RENDER
  // ============================================================
  const renderWizardStep1 = () => (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-[#44403C] uppercase tracking-wide mb-1">Bước 1/3 — Chọn phòng & Ngày & Số người</div>

      {/* Chi nhánh */}
      <div>
        <label className="block text-xs font-medium text-[#44403C] mb-1">Chi nhánh *</label>
        <select className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
          value={wBranchId} onChange={e => setWBranchId(Number(e.target.value))}
          disabled={currentUser.role === 'manager'}>
          {branchesList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Loại phòng */}
      <div>
        <label className="block text-xs font-medium text-[#44403C] mb-1">Loại phòng *</label>
        <select className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
          value={wRoomTypeId} onChange={e => setWRoomTypeId(Number(e.target.value))}>
          <option value={0}>-- Chọn loại phòng --</option>
          {filteredRoomTypes.map(rt => (
            <option key={rt.id} value={rt.id}>{rt.name} — {formatMoney(rt.base_price)}/đêm (tối đa {rt.max_occupancy} người)</option>
          ))}
        </select>
      </div>

      {/* Loại lưu trú */}
      <div>
        <label className="block text-xs font-medium text-[#44403C] mb-1">Loại lưu trú *</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(STAY_TYPE_CONFIG) as [StayType, typeof STAY_TYPE_CONFIG[StayType]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setWStayType(key)}
              className={`p-2.5 rounded-[6px] border text-left transition-all ${
                wStayType === key
                  ? 'border-[#B4532A] bg-[#FDF7EE] text-[#B4532A]'
                  : 'border-[#E5E0D8] bg-white text-[#44403C] hover:border-[#B4532A]/40'
              }`}
            >
              <div className="font-semibold text-xs">{cfg.label}</div>
              <div className="text-[10px] mt-0.5 opacity-75">{cfg.desc}</div>
              <div className="text-[10px] mt-0.5 font-mono font-bold">{cfg.multiplier === 1 ? '100%' : '70%'} giá</div>
            </button>
          ))}
        </div>
      </div>

      {/* Ngày */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#44403C] mb-1">Ngày check-in *</label>
          <input type="date" className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
            value={wCheckIn} min={new Date().toISOString().slice(0, 10)}
            onChange={e => setWCheckIn(e.target.value)} />
          <div className="text-[10px] text-[#78716C] mt-0.5">Check-in: {STAY_TYPE_CONFIG[wStayType].checkIn}</div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#44403C] mb-1">Ngày check-out *</label>
          <input type="date" className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
            value={wCheckOut} min={wCheckIn}
            onChange={e => setWCheckOut(e.target.value)}
            readOnly={wStayType === 'daily'} />
          <div className="text-[10px] text-[#78716C] mt-0.5">Check-out: {STAY_TYPE_CONFIG[wStayType].checkOut}</div>
        </div>
      </div>

      {/* Số phòng & Số người */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#44403C] mb-1">Số phòng *</label>
          <input type="number" min={1} max={10} className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
            value={wNumRooms} onChange={e => setWNumRooms(Math.max(1, Number(e.target.value)))} />
          {wRoomTypeId > 0 && (
            <div className="text-[10px] text-[#78716C] mt-0.5">Còn {availableRoomCount} phòng trống</div>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-[#44403C] mb-1">Người lớn *</label>
          <input type="number" min={1} className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
            value={wAdults} onChange={e => setWAdults(Math.max(1, Number(e.target.value)))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#44403C] mb-1">Trẻ em</label>
          <input type="number" min={0} className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
            value={wChildren} onChange={e => setWChildren(Math.max(0, Number(e.target.value)))} />
        </div>
      </div>

      {/* Tổng tiền */}
      {wQuote && (
        <div className="bg-[#FDF7EE] border border-[#F7DCB4] rounded-[6px] p-3">
          <div className="text-xs text-[#78716C]">
            <span>{formatMoney(wQuote.base_price)}</span>
            <span className="mx-1">×</span>
            <span>{Math.round(wQuote.multiplier * 100)}%</span>
            <span className="mx-1">×</span>
            <span>{wQuote.num_rooms} phòng</span>
            <span className="mx-1">×</span>
            <span>{wQuote.nights} đêm</span>
          </div>
          <div className="font-mono text-lg font-bold text-[#B4532A] mt-1">
            💰 {formatMoney(wQuote.total_amount)}
          </div>
        </div>
      )}

      {wStep1Error && (
        <div className="text-xs text-[#DC2626] bg-[#FDF2F2] border border-[#FECACA] rounded-[6px] px-3 py-2">
          ⚠️ {wStep1Error}
        </div>
      )}
    </div>
  );

  const renderWizardStep2 = () => (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-[#44403C] uppercase tracking-wide mb-1">Bước 2/3 — Thông tin người ở</div>

      <div>
        <label className="block text-xs font-medium text-[#44403C] mb-1">Họ và tên *</label>
        <input className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
          value={wGuestName} onChange={e => setWGuestName(e.target.value)}
          placeholder="Nguyễn Văn A" />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#44403C] mb-1">Số điện thoại *</label>
        <input type="tel" className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
          value={wGuestPhone} onChange={e => setWGuestPhone(e.target.value)}
          placeholder="0901234567" />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#44403C] mb-1">Email</label>
        <input type="email" className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
          value={wGuestEmail} onChange={e => setWGuestEmail(e.target.value)}
          placeholder="email@example.com (không bắt buộc)" />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#44403C] mb-1">Số CCCD / Hộ chiếu *</label>
        <input className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A] font-mono tracking-widest"
          value={wGuestCCCD} onChange={e => setWGuestCCCD(e.target.value.replace(/\D/g, ''))}
          placeholder="079xxxxxxxxx" maxLength={12} />
        <div className="text-[10px] text-[#78716C] mt-0.5">9 hoặc 12 chữ số</div>
      </div>

      {/* Người đi cùng */}
      {wCompanions.length > 0 && (
        <div className="border-t border-[#E5E0D8] pt-4 space-y-4">
          <div className="text-xs font-semibold text-[#44403C] uppercase tracking-wide">
            Thông tin người đi cùng ({wCompanions.length} người)
          </div>
          {wCompanions.map((comp, idx) => (
            <div key={idx} className="bg-[#F9F7F5] border border-[#E5E0D8] rounded-[6px] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#B4532A]">
                  Người đi cùng #{idx + 1} — {comp.type === 'adult' ? 'Người lớn' : 'Trẻ em'}
                </span>
                <span className="text-[10px] text-[#78716C]">
                  {comp.type === 'adult' ? 'Yêu cầu CCCD' : 'Chỉ cần Họ tên & Ngày sinh'}
                </span>
              </div>

              {comp.type === 'child' ? (
                /* Trẻ em: Chỉ cần điền Tên và Ngày sinh */
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[#44403C] mb-0.5">Họ và tên bé *</label>
                    <input
                      className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                      value={comp.name}
                      placeholder="Bé Nguyễn Văn B"
                      onChange={e => setWCompanions(prev => prev.map((c, i) => i === idx ? { ...c, name: e.target.value } : c))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#44403C] mb-0.5">Ngày sinh bé *</label>
                    <input
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                      value={comp.date_of_birth || ''}
                      onChange={e => setWCompanions(prev => prev.map((c, i) => i === idx ? { ...c, date_of_birth: e.target.value } : c))}
                    />
                  </div>
                </div>
              ) : (
                /* Người lớn: Họ tên, SĐT, CCCD, Quốc tịch */
                <>
                  <div>
                    <label className="block text-xs text-[#44403C] mb-0.5">Họ và tên *</label>
                    <input
                      className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                      value={comp.name}
                      placeholder="Nguyễn Văn B"
                      onChange={e => setWCompanions(prev => prev.map((c, i) => i === idx ? { ...c, name: e.target.value } : c))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-[#44403C] mb-0.5">Số điện thoại</label>
                      <input
                        type="tel"
                        className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                        value={comp.phone || ''}
                        placeholder="0901234567"
                        onChange={e => setWCompanions(prev => prev.map((c, i) => i === idx ? { ...c, phone: e.target.value } : c))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#44403C] mb-0.5">Số CCCD / Hộ chiếu *</label>
                      <input
                        className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A] font-mono tracking-widest"
                        value={comp.cccd || ''}
                        placeholder="079xxxxxxxxx"
                        maxLength={12}
                        onChange={e => setWCompanions(prev => prev.map((c, i) => i === idx ? { ...c, cccd: e.target.value.replace(/\D/g, '') } : c))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[#44403C] mb-0.5">Quốc tịch</label>
                    <select
                      className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                      value={comp.nationality || 'Việt Nam'}
                      onChange={e => setWCompanions(prev => prev.map((c, i) => i === idx ? { ...c, nationality: e.target.value } : c))}
                    >
                      <option value="Việt Nam">Việt Nam</option>
                      <option value="Nước ngoài">Nước ngoài</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {wStep2Error && (
        <div className="text-xs text-[#DC2626] bg-[#FDF2F2] border border-[#FECACA] rounded-[6px] px-3 py-2">
          ⚠️ {wStep2Error}
        </div>
      )}
    </div>
  );

  const renderWizardStep3 = () => (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-[#44403C] uppercase tracking-wide mb-1">Bước 3/3 — Gán phòng & Thu tiền</div>

      {/* Tóm tắt */}
      <div className="bg-[#F4F2EE] rounded-[6px] p-3 text-xs space-y-1">
        <div><span className="text-[#78716C]">Loại phòng:</span> <span className="font-medium">{selectedRoomType?.name}</span></div>
        <div><span className="text-[#78716C]">Lưu trú:</span> <span className="font-medium">{STAY_TYPE_CONFIG[wStayType].label} ({STAY_TYPE_CONFIG[wStayType].desc})</span></div>
        <div><span className="text-[#78716C]">Ngày:</span> <span className="font-medium">{new Date(wCheckIn).toLocaleDateString('vi-VN')} → {new Date(wCheckOut).toLocaleDateString('vi-VN')}</span></div>
        <div><span className="text-[#78716C]">Số phòng:</span> <span className="font-medium">{wNumRooms}</span> | <span className="text-[#78716C]">Người lớn:</span> <span className="font-medium">{wAdults}</span> | <span className="text-[#78716C]">Trẻ em:</span> <span className="font-medium">{wChildren}</span></div>
        <div><span className="text-[#78716C]">Khách:</span> <span className="font-medium">{wGuestName}</span> — <span className="font-mono">{wGuestCCCD}</span></div>
      </div>

      {/* Chọn phòng cụ thể */}
      <div>
        <label className="block text-xs font-medium text-[#44403C] mb-2">Chọn phòng cụ thể *</label>
        {Array.from({ length: wNumRooms }, (_, i) => (
          <div key={i} className="mb-2">
            <label className="block text-[11px] text-[#78716C] mb-1">Phòng {i + 1}</label>
            <select
              className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
              value={wSelectedRoomIds[i] || ''}
              onChange={e => {
                const newIds = [...wSelectedRoomIds];
                newIds[i] = Number(e.target.value) || null;
                setWSelectedRoomIds(newIds);
              }}
            >
              <option value="">-- Chọn phòng --</option>
              {availableRooms
                .filter(r => !wSelectedRoomIds.some((id, idx) => id === r.room_id && idx !== i))
                .map(r => (
                  <option key={r.room_id} value={r.room_id}>{r.room_number} — {r.apartment_name}</option>
                ))}
            </select>
          </div>
        ))}
      </div>

      {/* Thu tiền */}
      <div className="border border-[#E5E0D8] rounded-[6px] p-3">
        <div className="text-xs font-medium text-[#44403C] mb-2">Thu tiền</div>
        {wQuote && (
          <div className="text-sm font-mono font-bold text-[#B4532A] mb-3">
            💰 Tổng cần thu: {formatMoney(wQuote.total_amount)}
          </div>
        )}
        <div>
          <label className="block text-xs text-[#44403C] mb-1">Số tiền đã thu (VNĐ) *</label>
          <input
            type="text"
            inputMode="numeric"
            className={`w-full border rounded-[6px] px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 ${
              wCollectedAmount && !isAmountMatched
                ? 'border-[#DC2626] bg-[#FDF2F2] focus:ring-[#DC2626]'
                : wCollectedAmount && isAmountMatched
                ? 'border-[#2A694E] bg-[#F0FAF5] focus:ring-[#2A694E]'
                : 'border-[#E5E0D8] bg-white focus:ring-[#B4532A]'
            }`}
            value={wCollectedAmount}
            onChange={e => setWCollectedAmount(e.target.value.replace(/[^\d]/g, ''))}
            placeholder={wQuote ? String(wQuote.total_amount) : ''}
          />
          {wCollectedAmount && !isAmountMatched && (
            <div className="text-[11px] text-[#DC2626] mt-1">
              ⚠️ Chưa khớp! Cần thu: {wQuote ? formatMoney(wQuote.total_amount) : '—'}
            </div>
          )}
          {wCollectedAmount && isAmountMatched && (
            <div className="text-[11px] text-[#2A694E] mt-1">✅ Khớp 100% — Có thể xác nhận</div>
          )}
        </div>
      </div>

      {wStep3Error && (
        <div className="text-xs text-[#DC2626] bg-[#FDF2F2] border border-[#FECACA] rounded-[6px] px-3 py-2">
          ⚠️ {wStep3Error}
        </div>
      )}
    </div>
  );

  const renderWizardResult = () => (
    <div className="text-center space-y-4 py-4">
      <div className="text-4xl">✅</div>
      <div className="text-sm font-bold text-[#2A694E]">Tạo đơn thành công!</div>
      {wCreatedBooking && (
        <div className="bg-[#F0FAF5] border border-[#BBF7D0] rounded-[6px] p-3 text-xs text-left space-y-1">
          <div><span className="text-[#78716C]">Mã đơn:</span> <span className="font-mono font-bold text-[#B4532A]">{wCreatedBooking.booking_code}</span></div>
          <div><span className="text-[#78716C]">Trạng thái:</span> {getBookingStatusBadge(wCreatedBooking.booking_status || 'confirmed')}</div>
          <div><span className="text-[#78716C]">Tổng tiền:</span> <span className="font-bold">{wQuote ? formatMoney(wQuote.total_amount) : '—'}</span></div>
        </div>
      )}
      <Button variant="primary" size="md" onClick={() => setShowWizard(false)}>
        Đóng
      </Button>
    </div>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="space-y-5">
      {/* ===== HEADER & TOP ACTIONS ===== */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#1C1917]">Quản lý Booking</h2>
          <p className="text-xs text-[#78716C]">Theo dõi và xử lý tất cả đơn đặt phòng</p>
        </div>
        <Button
          variant="primary" size="sm"
          icon={<IconPlus className="w-4 h-4" />}
          onClick={openWizard}
        >
          Tạo đơn tại quầy
        </Button>
      </div>

      {/* ===== 6 TABS ===== */}
      <div className="bg-white border border-[#E5E0D8] rounded-[6px] overflow-hidden">
        <div className="flex overflow-x-auto border-b border-[#E5E0D8]">
          {(Object.keys(TAB_CONFIG) as BookingTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
              className={`flex-shrink-0 px-4 py-3 text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${
                activeTab === tab
                  ? 'border-[#B4532A] text-[#B4532A] bg-[#FDF7EE]'
                  : 'border-transparent text-[#78716C] hover:text-[#44403C] hover:bg-[#F4F2EE]'
              }`}
            >
              {TAB_CONFIG[tab].label}
              {activeTab === tab && renderTabBadge(tab)}
            </button>
          ))}
        </div>

        {/* Bộ lọc */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-[#FAFAF9]">
          <div className="relative flex-1 min-w-[200px]">
            <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A8A29E]" />
            <input
              className="w-full pl-8 pr-3 py-2 text-xs border border-[#E5E0D8] rounded-[6px] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
              placeholder="Tìm mã đơn, tên khách, SĐT..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select
            className="border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
            value={filterBookingType}
            onChange={e => { setFilterBookingType(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">Tất cả loại lưu trú</option>
            <option value="overnight">Qua đêm</option>
            <option value="daily">Trong ngày</option>
            <option value="extended">Qua ngày</option>
          </select>
          <Button variant="outline" size="sm" icon={<IconRefresh className="w-3.5 h-3.5" />} onClick={fetchBookings}>
            Tải lại
          </Button>
        </div>

        {/* Bảng danh sách */}
        <TableContainer>
          <TableHeader>
            <tr>
              <th className="py-3 px-3.5">Mã đơn</th>
              <th className="py-3 px-3.5">Khách hàng</th>
              <th className="py-3 px-3.5">Phòng</th>
              <th className="py-3 px-3.5">Ngày</th>
              <th className="py-3 px-3.5 text-right">Tổng tiền</th>
              <th className="py-3 px-3.5">Trạng thái</th>
              <th className="py-3 px-3.5">Thao tác</th>
            </tr>
          </TableHeader>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-10 text-center text-xs text-[#78716C]">Đang tải...</td></tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-xs text-[#78716C]">Không có đơn nào trong mục này.</td></tr>
            ) : bookings.map(renderBookingRow)}
          </tbody>
        </TableContainer>

        {/* Phân trang */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-[#E5E0D8] bg-[#FAFAF9]">
            <span className="text-xs text-[#78716C]">Tổng {totalCount} đơn</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>‹</Button>
              <span className="px-3 py-1.5 text-xs text-[#44403C]">Trang {currentPage}</span>
              <Button variant="outline" size="sm" disabled={currentPage * pageSize >= totalCount} onClick={() => setCurrentPage(p => p + 1)}>›</Button>
            </div>
          </div>
        )}
      </div>

      {/* ===== DRAWER: CHI TIẾT ĐƠN ===== */}
      <Drawer
        isOpen={showDetailDrawer}
        onClose={() => { setShowDetailDrawer(false); setSelectedBooking(null); }}
        title={`Chi tiết đơn ${selectedBooking?.booking_code || ''}`}
        footer={<Button variant="outline" size="md" onClick={() => setShowDetailDrawer(false)}>Đóng</Button>}
      >
        {selectedBooking && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2">
              {getBookingStatusBadge(selectedBooking.booking_status)}
              <span className="font-mono font-bold text-[#B4532A]">{selectedBooking.booking_code}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-[#78716C]">Loại lưu trú</span><div className="font-medium">{getStayTypeLabel(selectedBooking.booking_type)}</div></div>
              <div><span className="text-[#78716C]">Nguồn</span><div className="font-medium">{selectedBooking.source === 'admin' ? 'Tại quầy' : 'Online'}</div></div>
              <div><span className="text-[#78716C]">Check-in</span><div className="font-medium">{new Date(selectedBooking.booked_start_time).toLocaleString('vi-VN')}</div></div>
              <div><span className="text-[#78716C]">Check-out</span><div className="font-medium">{new Date(selectedBooking.booked_end_time).toLocaleString('vi-VN')}</div></div>
              <div><span className="text-[#78716C]">Người lớn</span><div className="font-medium">{selectedBooking.adults}</div></div>
              <div><span className="text-[#78716C]">Trẻ em</span><div className="font-medium">{selectedBooking.children}</div></div>
            </div>

            <div className="border-t border-[#E5E0D8] pt-3">
              <div className="font-semibold text-[#44403C] mb-2">Khách hàng</div>
              <div className="space-y-1">
                <div><span className="text-[#78716C]">Tên:</span> <span className="font-medium">{selectedBooking.customer_name || '—'}</span></div>
                <div><span className="text-[#78716C]">SĐT:</span> <span className="font-medium">{selectedBooking.customer_phone || '—'}</span></div>
                <div><span className="text-[#78716C]">Email:</span> <span className="font-medium">{selectedBooking.customer_email || '—'}</span></div>
                {selectedBooking.customer_cccd && <div><span className="text-[#78716C]">CCCD:</span> <span className="font-mono font-medium">{selectedBooking.customer_cccd}</span></div>}
              </div>
            </div>

            {selectedBooking.rooms?.length > 0 && (
              <div className="border-t border-[#E5E0D8] pt-3">
                <div className="font-semibold text-[#44403C] mb-2">Phòng</div>
                {selectedBooking.rooms.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-[#F4F2EE] last:border-0">
                    <div>
                      <span className="font-medium">{r.room_type_name}</span>
                      {r.room_number && <span className="ml-2 font-mono text-[#B4532A]">({r.room_number})</span>}
                      {!r.room_id && <span className="ml-1 italic text-[#78716C]">chưa gán</span>}
                    </div>
                    <span className="font-mono font-bold">{formatMoney(r.base_price)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-[#E5E0D8] pt-3">
              <div className="flex justify-between font-bold">
                <span>Tổng tiền</span>
                <span className="font-mono text-[#B4532A]">{formatMoney(selectedBooking.paid_amount || selectedBooking.total_amount || 0)}</span>
              </div>
              {selectedBooking.refund_amount && (
                <div className="flex justify-between text-[#2A694E] mt-1">
                  <span>Đã hoàn tiền</span>
                  <span className="font-mono">{formatMoney(selectedBooking.refund_amount)}</span>
                </div>
              )}
            </div>

            {selectedBooking.cancel_reason && (
              <div className="bg-[#FDF2F2] border border-[#FECACA] rounded-[6px] p-2.5">
                <span className="text-[#78716C]">Lý do hủy: </span>
                <span className="text-[#DC2626]">{selectedBooking.cancel_reason}</span>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ===== MODAL: TẠO BOOKING 3 BƯỚC ===== */}
      <Modal
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        title={wizardStep < 4 ? `Tạo đơn tại quầy — Bước ${wizardStep}/3` : 'Tạo đơn thành công'}
        footer={wizardStep < 4 ? (
          <div className="flex justify-between gap-2 w-full">
            <Button
              variant="secondary" size="md"
              onClick={() => {
                if (wizardStep === 1) setShowWizard(false);
                else setWizardStep(s => s - 1);
              }}
              disabled={wizardLoading}
            >
              {wizardStep === 1 ? 'Hủy' : '← Quay lại'}
            </Button>
            <Button
              variant="primary" size="md"
              onClick={handleWizardNext}
              disabled={wizardLoading || (wizardStep === 3 && !isAmountMatched)}
            >
              {wizardLoading ? 'Đang xử lý...' : wizardStep === 3 ? 'Xác nhận đã thu ✓' : 'Tiếp theo →'}
            </Button>
          </div>
        ) : undefined}
      >
        {/* Progress indicator */}
        {wizardStep < 4 && (
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  s < wizardStep ? 'bg-[#2A694E] text-white' :
                  s === wizardStep ? 'bg-[#B4532A] text-white' :
                  'bg-[#E5E0D8] text-[#78716C]'
                }`}>{s < wizardStep ? '✓' : s}</div>
                {s < 3 && <div className={`flex-1 h-0.5 ${s < wizardStep ? 'bg-[#2A694E]' : 'bg-[#E5E0D8]'}`} />}
              </React.Fragment>
            ))}
          </div>
        )}

        {wizardStep === 1 && renderWizardStep1()}
        {wizardStep === 2 && renderWizardStep2()}
        {wizardStep === 3 && renderWizardStep3()}
        {wizardStep === 4 && renderWizardResult()}
      </Modal>

      {/* ===== CONFIRM: CHECK-OUT SỚM ===== */}
      <ConfirmDialog
        isOpen={showEarlyCheckoutConfirm}
        onClose={() => { setShowEarlyCheckoutConfirm(false); setEarlyCheckoutTarget(null); }}
        onConfirm={handleEarlyCheckout}
        title="Xác nhận check-out sớm"
        message={`Xác nhận check-out sớm cho đơn ${earlyCheckoutTarget?.booking_code}? Trạng thái đơn sẽ chuyển sang Hoàn tất và phòng sẽ chuyển sang Cần dọn dẹp.`}
        confirmLabel="Check-out sớm"
        variant="primary"
      />

      {/* ===== CONFIRM: HOÀN TIỀN ===== */}
      <ConfirmDialog
        isOpen={showRefundConfirm}
        onClose={() => { setShowRefundConfirm(false); setRefundTarget(null); }}
        onConfirm={handleRefund}
        title="Xác nhận hoàn tiền"
        message={`Xác nhận hoàn tiền ${refundTarget ? formatMoney(refundTarget.paid_amount || refundTarget.total_amount || 0) : ''} cho đơn ${refundTarget?.booking_code}?`}
        confirmLabel="Xác nhận hoàn tiền"
        variant="primary"
        reasonRequired={false}
        reasonValue={refundReason}
        onReasonChange={setRefundReason}
      />

      {/* ===== CONFIRM: HỦY GIỮ CHỖ ===== */}
      <ConfirmDialog
        isOpen={showCancelPendingConfirm}
        onClose={() => { setShowCancelPendingConfirm(false); setCancelPendingTarget(null); }}
        onConfirm={handleCancelPending}
        title="Hủy giữ chỗ"
        message={`Xác nhận hủy giữ chỗ đơn ${cancelPendingTarget?.booking_code}?`}
        confirmLabel="Hủy giữ chỗ"
        variant="danger"
        reasonRequired={true}
        reasonValue={cancelPendingReason}
        onReasonChange={setCancelPendingReason}
      />

      {/* ===== MODAL CHỈNH SỬA ĐƠN ===== */}
      {showEditModal && editTarget && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Chỉnh sửa đơn ${editTarget.booking_code}`}
          maxWidth="xl"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>Hủy</Button>
              <Button variant="primary" onClick={handleSaveEdit} disabled={editSaving || editHasConflict}>
                {editSaving ? 'Đang lưu...' : 'Lưu chỉnh sửa'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Banner trạng thái */}
            {editTarget.booking_status === 'checked_in' ? (
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[6px] p-2.5 text-xs text-[#1E40AF]">
                🏨 <strong>Khách đang lưu trú</strong> (Phòng: <span className="font-mono font-bold text-[#B4532A]">{editTarget.rooms?.[0]?.room_number || '—'}</span>).
                Ngày nhận phòng đã qua nên được giữ nguyên. Bạn có thể gia hạn ngày trả phòng (tăng số ngày ở) và đổi loại phòng / phòng nếu cần.
              </div>
            ) : (
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[6px] p-2.5 text-xs text-[#166534]">
                📋 <strong>Đơn đã xác nhận (Chưa nhận phòng)</strong>.
                Bạn có thể đổi chi nhánh, loại phòng, gán phòng cụ thể và dời ngày check-in/check-out (số đêm mới phải ≥ số đêm gốc).
              </div>
            )}

            {/* Chi nhánh & Loại phòng & Phòng cụ thể */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#FAF8F5] p-3 rounded-[6px] border border-[#E5E0D8]">
              {/* Chi nhánh */}
              <div>
                <label className="text-xs font-semibold text-[#44403C] block mb-1">🏢 Chi nhánh *</label>
                {editTarget.booking_status === 'checked_in' ? (
                  <div className="text-xs font-medium py-2 px-3 bg-white border border-[#E5E0D8] rounded-[6px] text-[#78716C]">
                    {branchesList.find(b => b.id === Number(editBranchId))?.name || 'Chi nhánh hiện tại'}
                  </div>
                ) : (
                  <select
                    value={editBranchId}
                    onChange={e => handleEditBranchChange(Number(e.target.value))}
                    disabled={currentUser.role === 'manager'}
                    className="w-full border border-[#E5E0D8] rounded-[6px] px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                  >
                    {branchesList.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Loại phòng */}
              <div>
                <label className="text-xs font-semibold text-[#44403C] block mb-1">🛏️ Loại phòng *</label>
                <select
                  value={editRoomTypeId}
                  onChange={e => handleEditRoomTypeChange(Number(e.target.value))}
                  className="w-full border border-[#E5E0D8] rounded-[6px] px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                >
                  <option value={0}>-- Chọn loại phòng --</option>
                  {editAvailableRoomTypes.map(rt => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} ({formatMoney(rt.base_price)}/đêm)
                    </option>
                  ))}
                </select>
              </div>

              {/* Phòng cụ thể */}
              <div>
                <label className="text-xs font-semibold text-[#44403C] block mb-1">🚪 Phòng cụ thể</label>
                <select
                  value={editRoomId || ''}
                  onChange={e => handleEditRoomIdChange(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-[#E5E0D8] rounded-[6px] px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                >
                  <option value="">-- Chưa gán phòng cụ thể --</option>
                  {editAvailableRooms.map(r => (
                    <option key={r.room_id} value={r.room_id}>
                      Phòng {r.room_number} {r.room_id === editTarget.rooms?.[0]?.room_id ? '(Phòng hiện tại)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Thời gian lưu trú (Check-in & Check-out) */}
            <div className="bg-[#FAF8F5] p-3 rounded-[6px] border border-[#E5E0D8] space-y-2">
              <div className="text-xs font-semibold text-[#44403C]">📅 Thời gian lưu trú</div>
              <div className="grid grid-cols-2 gap-3">
                {/* Check-in */}
                <div>
                  <label className="text-[11px] font-medium text-[#78716C] block mb-1">
                    Ngày Check-in {editTarget.booking_status === 'checked_in' && '(Đã nhận phòng)'}
                  </label>
                  <input
                    type="date"
                    disabled={editTarget.booking_status === 'checked_in'}
                    min={new Date().toISOString().slice(0, 10)}
                    value={editNewCheckIn}
                    onChange={e => handleEditCheckInChange(e.target.value)}
                    className={`w-full border rounded-[6px] px-3 py-1.5 text-xs focus:outline-none ${
                      editTarget.booking_status === 'checked_in'
                        ? 'bg-[#E5E0D8]/40 text-[#78716C] cursor-not-allowed border-[#E5E0D8]'
                        : 'bg-white border-[#E5E0D8] focus:ring-1 focus:ring-[#B4532A]'
                    }`}
                  />
                </div>

                {/* Check-out */}
                <div>
                  <label className="text-[11px] font-medium text-[#78716C] block mb-1">
                    Ngày Check-out * {editTarget.booking_status === 'checked_in' && '(Chỉ được gia hạn tăng)'}
                  </label>
                  <input
                    type="date"
                    min={
                      editTarget.booking_status === 'checked_in'
                        ? new Date(new Date(editTarget.booked_end_time).getTime() + 86400000).toISOString().slice(0, 10)
                        : editNewCheckIn
                    }
                    value={editNewCheckout}
                    onChange={e => handleEditCheckoutChange(e.target.value)}
                    className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                  />
                </div>
              </div>

              {/* Thông báo số đêm & kiểm tra trùng lịch */}
              {(() => {
                const { oldNights, newNights } = calcEditTotals();
                return (
                  <div className="text-[11px] text-[#78716C] flex items-center justify-between pt-1">
                    <span>
                      Thời lượng: <strong className="text-[#1C1917]">{newNights} đêm</strong> (Đơn gốc: {oldNights} đêm)
                    </span>
                    {newNights < oldNights && (
                      <span className="text-[#DC2626] font-bold">🚫 Không được giảm số đêm</span>
                    )}
                  </div>
                );
              })()}

              {editConflictMsg && (
                <div
                  className={`text-xs px-3 py-2 rounded-[6px] ${
                    editHasConflict
                      ? 'bg-[#FDF2F2] border border-[#FECACA] text-[#DC2626]'
                      : 'bg-[#EDF5F1] border border-[#86EFAC] text-[#2A694E]'
                  }`}
                >
                  {editHasConflict ? '🚫' : '✅'} {editConflictMsg}
                </div>
              )}
            </div>

            {/* Danh mục dịch vụ homestay */}
            <div>
              <label className="text-xs font-semibold text-[#44403C] block mb-2">🛎️ Thêm dịch vụ homestay</label>
              {(['rent_vehicle', 'laundry', 'event_decor'] as const).map(cat => {
                const catServices = HOMESTAY_EXTRA_SERVICES.filter(s => s.category === cat);
                const catLabel = catServices[0]?.categoryLabel || cat;
                return (
                  <div key={cat} className="mb-2.5">
                    <div className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wide mb-1">{catLabel}</div>
                    {catServices.map(svc => {
                      const existing = editServices.find(e => e.serviceId === svc.id);
                      const qty = existing?.quantity || 0;
                      return (
                        <div key={svc.id} className="flex items-center gap-2 py-1 border-b border-[#F4F2EE]">
                          <div className="flex-1 text-xs text-[#1C1917]">{svc.name}</div>
                          <div className="text-xs text-[#78716C] font-mono whitespace-nowrap">
                            {svc.price.toLocaleString('vi-VN')}đ/{svc.unit}
                          </div>
                          <input
                            type="number" min={0} max={99} value={qty}
                            onChange={e => {
                              const v = Math.max(0, Number(e.target.value));
                              setEditServices(prev => {
                                const idx2 = prev.findIndex(x => x.serviceId === svc.id);
                                if (v === 0) return prev.filter(x => x.serviceId !== svc.id);
                                if (idx2 >= 0) { const n = [...prev]; n[idx2] = { serviceId: svc.id, quantity: v }; return n; }
                                return [...prev, { serviceId: svc.id, quantity: v }];
                              });
                            }}
                            className="w-14 border border-[#E5E0D8] rounded-[4px] px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                          />
                          <div className="text-xs font-mono text-[#B4532A] w-24 text-right">
                            {qty > 0 ? `${(qty * svc.price).toLocaleString('vi-VN')}đ` : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Tóm tắt phụ thu */}
            {(() => {
              const { roomCostDiff, servicesCost, total, oldNights, newNights, oldRoomTotal, newRoomTotal } = calcEditTotals();
              return (
                <div className="bg-[#FDF7EE] border border-[#F7DCB4] rounded-[6px] p-3 text-xs space-y-1">
                  <div className="font-semibold text-[#78716C] mb-1">TỔNG HỢP CHI PHÍ:</div>
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Tiền phòng tính lại ({newNights} đêm):</span>
                    <span className="font-mono">{newRoomTotal.toLocaleString('vi-VN')}đ (Gốc: {oldRoomTotal.toLocaleString('vi-VN')}đ)</span>
                  </div>
                  {roomCostDiff > 0 && (
                    <div className="flex justify-between text-[#B4532A]">
                      <span>Chênh lệch tiền phòng:</span>
                      <span className="font-mono font-bold">+{roomCostDiff.toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                  {servicesCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#78716C]">Dịch vụ phát sinh:</span>
                      <span className="font-mono font-bold">+{servicesCost.toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-[#F7DCB4] pt-1.5 text-sm">
                    <span className="font-bold text-[#1C1917]">Tổng tiền phụ thu:</span>
                    <span className="font-mono font-bold text-[#B4532A]">
                      {editIsFree ? '0đ (Miễn phí ưu đãi)' : `${total.toLocaleString('vi-VN')}đ`}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Thu phí / Miễn phí */}
            <div className="flex gap-4 flex-wrap items-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input type="radio" checked={!editIsFree} onChange={() => setEditIsFree(false)} /> Có thu phí
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input type="radio" checked={editIsFree} onChange={() => setEditIsFree(true)} /> Miễn phí (0đ)
              </label>
              {!editIsFree && (
                <select
                  value={editFeeOption}
                  onChange={e => setEditFeeOption(e.target.value as 'pay_now' | 'pay_at_checkout')}
                  className="text-xs border border-[#E5E0D8] rounded-[4px] px-2.5 py-1 focus:outline-none"
                >
                  <option value="pay_now">Thu ngay</option>
                  <option value="pay_at_checkout">Thu khi check-out</option>
                </select>
              )}
            </div>

            {/* Lý do bắt buộc */}
            <div>
              <label className="text-xs font-semibold text-[#44403C] block mb-1">
                Lý do chỉnh sửa <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                rows={2}
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                placeholder="Nhập lý do chỉnh sửa đơn (bắt buộc)..."
                className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
