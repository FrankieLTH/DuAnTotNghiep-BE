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
} from '../AdminIcons';
import { AdminUser } from '../AdminLayout';
import { CustomerRequestsPanel } from '../CustomerRequestsPanel';
import { adminService, adminApi, getSimRooms, getSimRoomTypes, getSimBookings } from '../../../services/adminService';

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

  // ---- Extend hold confirm ----
  const [showExtendConfirm, setShowExtendConfirm] = useState(false);
  const [extendTarget, setExtendTarget] = useState<any | null>(null);

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

  // Gia hạn
  const handleExtendHold = async () => {
    if (!extendTarget) return;
    try {
      await adminService.extendHoldTime(extendTarget.id, currentUser.role);
      onShowToast(`Đã gia hạn giữ chỗ đơn ${extendTarget.booking_code} thêm 15 phút.`, 'success');
      setShowExtendConfirm(false);
      setExtendTarget(null);
      await fetchBookings();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi gia hạn.', 'error');
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
    setWSelectedRoomIds([null]);
    setWCollectedAmount('');
    setWStep3Error('');
    setWCreatedBooking(null);
    setShowWizard(true);
  };

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

            {/* Tab: Chưa thanh toán — Gia hạn & Hủy */}
            {b.booking_status === 'pending_payment' && (
              <>
                <Button
                  variant="secondary" size="sm"
                  icon={<IconRefresh className="w-3.5 h-3.5" />}
                  onClick={() => { setExtendTarget(b); setShowExtendConfirm(true); }}
                >
                  +15p
                </Button>
                <Button
                  variant="danger" size="sm"
                  icon={<IconX className="w-3.5 h-3.5" />}
                  onClick={() => { setCancelPendingTarget(b); setCancelPendingReason(''); setShowCancelPendingConfirm(true); }}
                >
                  Hủy
                </Button>
              </>
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
      <CustomerRequestsPanel currentUser={currentUser} selectedBranchId={selectedBranchId} />
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

      {/* ===== CONFIRM: GIA HẠN ===== */}
      <ConfirmDialog
        isOpen={showExtendConfirm}
        onClose={() => { setShowExtendConfirm(false); setExtendTarget(null); }}
        onConfirm={handleExtendHold}
        title="Gia hạn giữ chỗ"
        message={`Gia hạn giữ chỗ đơn ${extendTarget?.booking_code} thêm 15 phút?`}
        confirmLabel="Gia hạn +15 phút"
        variant="primary"
      />
    </div>
  );
};
