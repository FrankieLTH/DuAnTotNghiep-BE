import React, { useState, useEffect, useCallback } from 'react';
import {
  TableContainer,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Input,
  Drawer,
  Modal,
  ConfirmDialog,
  formatMoney,
} from '../AdminUI';
import {
  IconPlus,
  IconLock,
  IconUnlock,
  IconWifi,
  IconWifiOff,
  IconBattery,
  IconEdit,
  IconEyeOff,
  IconEye,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconRefresh,
} from '../AdminIcons';
import { AdminUser } from '../AdminLayout';
import { adminApi, RoomTypeItem, RoomItem } from '../../../services/adminService';
import {
  generateFloorRoomsBatch,
  findNextStartDigitsForPrefix,
  sortRoomsNatural,
} from '../../../../../shared/helpers/roomNumbering';

interface RoomsScreenProps {
  currentUser: AdminUser;
  selectedBranchId: number;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance';

const ROOM_STATUS_CONFIG: Record<RoomStatus, { label: string; badge: JSX.Element; nextLabel: string; nextStatus: RoomStatus | null; canManual: boolean; blockedReason?: string }> = {
  available: {
    label: 'Trống',
    badge: <Badge variant="success" size="sm">🟢 Trống</Badge>,
    nextLabel: 'Đang lưu trú',
    nextStatus: 'occupied',
    canManual: false,
    blockedReason: 'Trạng thái này chỉ chuyển tự động khi có đơn check-in',
  },
  occupied: {
    label: 'Đang lưu trú',
    badge: <Badge variant="info" size="sm">🔵 Đang lưu trú</Badge>,
    nextLabel: 'Cần dọn dẹp',
    nextStatus: 'cleaning',
    canManual: true,
  },
  cleaning: {
    label: 'Cần dọn dẹp',
    badge: <Badge variant="warning" size="sm">🟡 Cần dọn dẹp</Badge>,
    nextLabel: 'Trống',
    nextStatus: 'available',
    canManual: true,
  },
  maintenance: {
    label: 'Bảo trì',
    badge: <Badge variant="danger" size="sm">🔴 Bảo trì</Badge>,
    nextLabel: 'Trống',
    nextStatus: 'available',
    canManual: true,
  },
};

const emptyRoomTypeForm = {
  name: '', apartment_id: 0, base_price: 600000, max_occupancy: 2,
  description: '', bed_config: '1 giường đôi', area: 30, is_active: true,
};
const emptyRoomForm: { apartment_id: number; room_type_id: number; room_number: string; status: RoomStatus; special_features?: string } = {
  apartment_id: 0, room_type_id: 0, room_number: '', status: 'available', special_features: '',
};

export const RoomsScreen: React.FC<RoomsScreenProps> = ({ currentUser, selectedBranchId, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'types' | 'rooms'>('types');

  // ---- Bộ lọc chi nhánh trên màn hình RoomsScreen ----
  const [screenBranchId, setScreenBranchId] = useState<number>(() => {
    return currentUser.role === 'manager' ? (currentUser.branchId || 1) : (selectedBranchId || 0);
  });

  useEffect(() => {
    if (currentUser.role === 'manager') {
      setScreenBranchId(currentUser.branchId || 1);
    } else {
      setScreenBranchId(selectedBranchId || 0);
    }
  }, [selectedBranchId, currentUser]);

  const effectiveBranchId = currentUser.role === 'manager' ? (currentUser.branchId || 1) : screenBranchId;

  // ---- Loại phòng state ----
  const [roomTypes, setRoomTypes] = useState<RoomTypeItem[]>([]);
  const [rtLoading, setRtLoading] = useState(true);
  const [showRtDrawer, setShowRtDrawer] = useState(false);
  const [isNewRt, setIsNewRt] = useState(false);
  const [rtForm, setRtForm] = useState<typeof emptyRoomTypeForm & { id?: number }>(emptyRoomTypeForm);
  const [rtSaving, setRtSaving] = useState(false);

  // ---- Phòng cụ thể state ----
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [showRoomDrawer, setShowRoomDrawer] = useState(false);
  const [isNewRoom, setIsNewRoom] = useState(false);
  const [roomForm, setRoomForm] = useState<{ id?: number; apartment_id: number; room_type_id: number; room_number: string; status: RoomStatus; special_features?: string }>(emptyRoomForm);
  const [roomSaving, setRoomSaving] = useState(false);

  // ---- Status change — vòng lặp trạng thái ----
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [statusTarget, setStatusTarget] = useState<RoomItem | null>(null);
  const [statusTargetNext, setStatusTargetNext] = useState<RoomStatus | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [showBlockedTooltip, setShowBlockedTooltip] = useState<number | null>(null);

  // ---- Maintenance toggle (riêng biệt) ----
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);
  const [maintenanceTarget, setMaintenanceTarget] = useState<RoomItem | null>(null);
  const [maintenanceReason, setMaintenanceReason] = useState('');

  // ---- Load data ----
  const loadRoomTypes = useCallback(async () => {
    setRtLoading(true);
    try {
      const aptId = currentUser.role === 'manager' ? (currentUser.branchId || undefined) : (selectedBranchId || undefined);
      const data = await adminApi.getAdminRoomTypes(currentUser.role, aptId);
      setRoomTypes(Array.isArray(data) ? data : []);
    } catch { onShowToast('Không tải được danh sách loại phòng.', 'error'); }
    finally { setRtLoading(false); }
  }, [currentUser.role, currentUser.branchId, selectedBranchId]);

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const aptId = currentUser.role === 'manager' ? (currentUser.branchId || undefined) : (selectedBranchId || undefined);
      const data = await adminApi.getRooms(currentUser.role, aptId ? { apartment_id: aptId } : undefined);
      setRooms(Array.isArray(data) ? data : []);
    } catch { onShowToast('Không tải được danh sách phòng.', 'error'); }
    finally { setRoomsLoading(false); }
  }, [currentUser.role, currentUser.branchId, selectedBranchId]);

  useEffect(() => { loadRoomTypes(); }, [loadRoomTypes]);
  useEffect(() => { loadRooms(); }, [loadRooms]);

  // ---- Room Type CRUD ----
  const handleSaveRoomType = async () => {
    if (!rtForm.name.trim()) { onShowToast('Vui lòng nhập tên loại phòng.', 'error'); return; }
    if (!rtForm.apartment_id) { onShowToast('Vui lòng chọn chi nhánh.', 'error'); return; }
    setRtSaving(true);
    try {
      if (isNewRt) {
        await adminApi.createRoomType(rtForm, currentUser.role);
        onShowToast(`Đã thêm loại phòng "${rtForm.name}"!`, 'success');
      } else if (rtForm.id) {
        const { id, apartment_id, ...updateData } = rtForm;
        await adminApi.updateRoomType(id, updateData, currentUser.role);
        onShowToast(`Đã cập nhật loại phòng "${rtForm.name}"!`, 'success');
      }
      setShowRtDrawer(false);
      await loadRoomTypes();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi lưu loại phòng.', 'error');
    } finally { setRtSaving(false); }
  };

  const handleHideRoomType = async (rt: RoomTypeItem) => {
    try {
      await adminApi.hideRoomType(rt.id, currentUser.role);
      onShowToast(`Đã ẩn loại phòng "${rt.name}".`, 'warning');
      await loadRoomTypes();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi ẩn loại phòng.', 'error');
    }
  };

  // ---- Room CRUD ----
  const handleSaveRoom = async () => {
    if (!roomForm.room_number.trim()) { onShowToast('Vui lòng nhập số phòng.', 'error'); return; }
    if (!roomForm.room_type_id) { onShowToast('Vui lòng chọn loại phòng.', 'error'); return; }
    if (!roomForm.apartment_id) { onShowToast('Vui lòng chọn chi nhánh.', 'error'); return; }
    setRoomSaving(true);
    try {
      if (isNewRoom) {
        await adminApi.createRoom(roomForm, currentUser.role);
        onShowToast(`Đã thêm phòng "${roomForm.room_number}"!`, 'success');
      } else if (roomForm.id) {
        const { id, ...updateData } = roomForm;
        await adminApi.updateRoom(id, updateData, currentUser.role);
        onShowToast(`Đã cập nhật phòng "${roomForm.room_number}"!`, 'success');
      }
      setShowRoomDrawer(false);
      await loadRooms();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi lưu phòng.', 'error');
    } finally { setRoomSaving(false); }
  };

  // ---- Vòng lặp trạng thái phòng ----
  const handleStatusCycleClick = (room: RoomItem) => {
    const cfg = ROOM_STATUS_CONFIG[room.status as RoomStatus] || ROOM_STATUS_CONFIG.available;
    if (!cfg.canManual) {
      setShowBlockedTooltip(room.room_id);
      setTimeout(() => setShowBlockedTooltip(null), 3000);
      return;
    }
    setStatusTarget(room);
    setStatusTargetNext(cfg.nextStatus);
    setStatusReason('');
    setShowStatusConfirm(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTarget || !statusTargetNext) return;
    try {
      await adminApi.updateRoomStatus(statusTarget.room_id, statusTargetNext, statusReason, currentUser.role);
      const nextLabel = ROOM_STATUS_CONFIG[statusTargetNext]?.label || statusTargetNext;
      onShowToast(`Đã chuyển phòng ${statusTarget.room_number} sang "${nextLabel}".`, 'success');
      setShowStatusConfirm(false);
      setStatusTarget(null);
      setStatusTargetNext(null);
      setStatusReason('');
      await loadRooms();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi đổi trạng thái phòng.', 'error');
    }
  };

  // ---- Toggle Bảo trì (available ↔ maintenance) ----
  const handleToggleMaintenance = (room: RoomItem) => {
    setMaintenanceTarget(room);
    setMaintenanceReason('');
    setShowMaintenanceConfirm(true);
  };

  const handleConfirmMaintenance = async () => {
    if (!maintenanceTarget) return;
    const nextStatus: RoomStatus = maintenanceTarget.status === 'maintenance' ? 'available' : 'maintenance';
    try {
      await adminApi.updateRoomStatus(maintenanceTarget.room_id, nextStatus, maintenanceReason, currentUser.role);
      onShowToast(
        `Đã chuyển phòng ${maintenanceTarget.room_number} sang "${nextStatus === 'maintenance' ? 'Bảo trì' : 'Trống'}".`,
        nextStatus === 'maintenance' ? 'warning' : 'success'
      );
      setShowMaintenanceConfirm(false);
      setMaintenanceTarget(null);
      setMaintenanceReason('');
      await loadRooms();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi đổi trạng thái phòng.', 'error');
    }
  };

  const handleHideRoom = async (room: RoomItem) => {
    try {
      if (room.is_hidden) {
        await adminApi.unhideRoom(room.room_id, currentUser.role);
        onShowToast(`Đã hiện lại phòng ${room.room_number}.`, 'success');
      } else {
        await adminApi.hideRoom(room.room_id, currentUser.role);
        onShowToast(`Đã ẩn phòng ${room.room_number}.`, 'warning');
      }
      await loadRooms();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi thay đổi hiển thị phòng.', 'error');
    }
  };

  // ---- Branches for form ----
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    adminApi.getBranches(currentUser.role).then((data) => {
      setBranches(Array.isArray(data) ? data.map((b) => ({ id: b.id, name: b.name })) : []);
    }).catch(() => {});
  }, [currentUser.role]);

  // ---- Batch Create Rooms State & Handlers ----
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchBranchId, setBatchBranchId] = useState<number>(1);
  const [batchRoomTypeId, setBatchRoomTypeId] = useState<number>(0);
  const [batchPrefix, setBatchPrefix] = useState('P');
  const [batchStartDigits, setBatchStartDigits] = useState('001');
  const [latestDetectedRoom, setLatestDetectedRoom] = useState<string | null>(null);
  const [batchCount, setBatchCount] = useState<number>(5);
  const [batchSkip4, setBatchSkip4] = useState(true);
  const [batchSkip13, setBatchSkip13] = useState(true);
  const [batchDefaultStatus, setBatchDefaultStatus] = useState<'available' | 'maintenance'>('available');
  const [batchRooms, setBatchRooms] = useState<Array<{
    id: string;
    room_number: string;
    special_features: string;
    status: 'available' | 'maintenance';
    isDuplicate: boolean;
  }>>([]);
  const [quickFeatureText, setQuickFeatureText] = useState('');
  const [batchSaving, setBatchSaving] = useState(false);

  const updateSuggestedStartDigits = (prefix: string, branchId: number, skip4Val = batchSkip4, skip13Val = batchSkip13) => {
    const branchRooms = rooms.filter(r => r.apartment_id === branchId).map(r => r.room_number);
    const { latestRoom, nextDigits } = findNextStartDigitsForPrefix(branchRooms, prefix, skip4Val, skip13Val);
    setLatestDetectedRoom(latestRoom);
    setBatchStartDigits(nextDigits);
  };

  const openBatchModal = () => {
    const initialBranch = effectiveBranchId > 0 ? effectiveBranchId : (branches[0]?.id || 1);
    setBatchBranchId(initialBranch);
    const availableTypes = roomTypes.filter(rt => rt.apartment_id === initialBranch);
    setBatchRoomTypeId(availableTypes[0]?.id || 0);
    setBatchPrefix('P');
    setBatchCount(5);
    setBatchSkip4(true);
    setBatchSkip13(true);
    setBatchDefaultStatus('available');
    setBatchRooms([]);
    setQuickFeatureText('');

    const branchRooms = rooms.filter(r => r.apartment_id === initialBranch).map(r => r.room_number);
    const { latestRoom, nextDigits } = findNextStartDigitsForPrefix(branchRooms, 'P', true, true);
    setLatestDetectedRoom(latestRoom);
    setBatchStartDigits(nextDigits);

    setShowBatchModal(true);
  };

  const handleGenerateBatchRooms = () => {
    if (!batchRoomTypeId) {
      onShowToast('Vui lòng chọn loại phòng trước khi sinh danh sách.', 'warning');
      return;
    }
    const targetBranchRooms = rooms.filter(r => r.apartment_id === batchBranchId).map(r => r.room_number);
    const generated = generateFloorRoomsBatch(
      batchPrefix,
      batchStartDigits,
      batchCount,
      batchSkip4,
      batchSkip13,
      targetBranchRooms
    );

    setBatchRooms(generated.map(g => ({
      ...g,
      status: batchDefaultStatus,
    })));
  };

  const handleUpdateBatchRoom = (id: string, field: 'room_number' | 'special_features' | 'status', value: any) => {
    setBatchRooms(prev => {
      const targetBranchRooms = rooms.filter(r => r.apartment_id === batchBranchId);
      const existingNumbers = new Set(targetBranchRooms.map(r => r.room_number.toLowerCase()));

      return prev.map(r => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
          if (field === 'room_number') {
            const isDup = existingNumbers.has(value.trim().toLowerCase());
            updated.isDuplicate = isDup;
          }
          return updated;
        }
        return r;
      });
    });
  };

  const handleDeleteBatchRoom = (id: string) => {
    setBatchRooms(prev => prev.filter(r => r.id !== id));
  };

  const handleApplyQuickFeatures = () => {
    if (!quickFeatureText.trim()) {
      onShowToast('Vui lòng nhập nội dung đặc điểm trước khi áp dụng nhanh.', 'warning');
      return;
    }
    setBatchRooms(prev => prev.map(r => ({
      ...r,
      special_features: r.special_features.trim() ? r.special_features : quickFeatureText.trim()
    })));
    onShowToast('Đã áp dụng đặc điểm cho các phòng còn trống!', 'info');
  };

  const handleSaveBatchRooms = async () => {
    if (!batchBranchId) { onShowToast('Vui lòng chọn chi nhánh.', 'error'); return; }
    if (!batchRoomTypeId) { onShowToast('Vui lòng chọn loại phòng.', 'error'); return; }
    if (batchRooms.length === 0) { onShowToast('Chưa có phòng nào được sinh. Hãy bấm "Tạo danh sách phòng".', 'error'); return; }

    const hasDuplicate = batchRooms.some(r => r.isDuplicate);
    if (hasDuplicate) {
      onShowToast('Có phòng bị trùng số với chi nhánh. Vui lòng sửa hoặc xóa phòng bị trùng trước khi lưu!', 'error');
      return;
    }

    const numbers = batchRooms.map(r => r.room_number.trim().toLowerCase());
    if (new Set(numbers).size < numbers.length) {
      onShowToast('Có số phòng bị trùng lặp trong chính danh sách tạo mới!', 'error');
      return;
    }

    setBatchSaving(true);
    try {
      const payload = {
        apartment_id: batchBranchId,
        room_type_id: batchRoomTypeId,
        rooms: batchRooms.map(r => ({
          room_number: r.room_number.trim(),
          special_features: r.special_features.trim() || undefined,
          status: r.status,
        })),
      };

      const res = await adminApi.batchCreateRooms(payload, currentUser.role);
      onShowToast(res?.message || `Đã tạo thành công ${batchRooms.length} phòng mới!`, 'success');
      setShowBatchModal(false);
      setBatchRooms([]);
      await loadRooms();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi tạo hàng loạt phòng.', 'error');
    } finally {
      setBatchSaving(false);
    }
  };

  // Lọc danh sách theo chi nhánh
  const filteredRoomTypes = effectiveBranchId > 0
    ? roomTypes.filter((rt) => rt.apartment_id === effectiveBranchId)
    : roomTypes;

  const filteredRooms = sortRoomsNatural(
    effectiveBranchId > 0
      ? rooms.filter((r) => r.apartment_id === effectiveBranchId)
      : rooms
  );

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Top Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-[#E5E0D8] rounded-[6px]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveTab('types')}
              className={`px-4 py-2 rounded-[4px] font-semibold transition-colors cursor-pointer ${
                activeTab === 'types' ? 'bg-[#B4532A] text-white' : 'bg-[#F4F2EE] text-[#44403C] hover:bg-[#EBE7E0]'
              }`}
            >
              1. Loại phòng ({filteredRoomTypes.length})
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-4 py-2 rounded-[4px] font-semibold transition-colors cursor-pointer ${
                activeTab === 'rooms' ? 'bg-[#B4532A] text-white' : 'bg-[#F4F2EE] text-[#44403C] hover:bg-[#EBE7E0]'
              }`}
            >
              2. Phòng ({filteredRooms.length})
            </button>
          </div>

          {/* Bộ lọc chi nhánh trực tiếp trên màn hình Quản lý phòng */}
          <div className="flex items-center gap-2 border-l border-[#E5E0D8] pl-3">
            <span className="text-xs font-semibold text-[#78716C] whitespace-nowrap">🏢 Chi nhánh:</span>
            <select
              value={effectiveBranchId}
              disabled={currentUser.role === 'manager'}
              onChange={(e) => setScreenBranchId(Number(e.target.value))}
              className="text-xs bg-[#FAF9F7] border border-[#E5E0D8] rounded-[4px] px-2.5 py-1.5 font-medium text-[#1C1917] focus:outline-none focus:border-[#B4532A] cursor-pointer"
            >
              <option value={0}>Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'manager' && (
            <Badge variant="warning" size="sm">Chỉ xem • Được đổi trạng thái phòng</Badge>
          )}
          {currentUser.role === 'admin' && activeTab === 'types' && (
            <Button
              variant="primary" size="sm" icon={<IconPlus className="w-4 h-4" />}
              onClick={() => {
                setIsNewRt(true);
                setRtForm({ ...emptyRoomTypeForm, apartment_id: effectiveBranchId > 0 ? effectiveBranchId : (branches[0]?.id || 1) });
                setShowRtDrawer(true);
              }}
            >
              Thêm loại phòng
            </Button>
          )}
          {currentUser.role === 'admin' && activeTab === 'rooms' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm" icon={<IconPlus className="w-4 h-4" />}
                onClick={openBatchModal}
              >
                Tạo nhiều phòng
              </Button>
              <Button
                variant="primary" size="sm" icon={<IconPlus className="w-4 h-4" />}
                onClick={() => {
                  setIsNewRoom(true);
                  setRoomForm({ ...emptyRoomForm, apartment_id: effectiveBranchId > 0 ? effectiveBranchId : (branches[0]?.id || 1), special_features: '' });
                  setShowRoomDrawer(true);
                }}
              >
                Thêm phòng
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ===== TAB 1: LOẠI PHÒNG ===== */}
      {activeTab === 'types' && (
        <TableContainer>
          <TableHeader>
            <tr>
              <th className="py-3 px-3.5">Tên loại phòng</th>
              <th className="py-3 px-3.5">Chi nhánh</th>
              <th className="py-3 px-3.5">Sức chứa</th>
              <th className="py-3 px-3.5">Cấu hình giường</th>
              <th className="py-3 px-3.5 text-center">Số phòng</th>
              <th className="py-3 px-3.5 text-right">Giá / đêm</th>
              <th className="py-3 px-3.5 text-right">Thao tác</th>
            </tr>
          </TableHeader>
          <tbody>
            {rtLoading ? (
              <tr><td colSpan={7} className="py-10 text-center text-xs text-[#78716C]">Đang tải...</td></tr>
            ) : filteredRoomTypes.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-xs text-[#78716C]">Không có loại phòng nào phù hợp với chi nhánh đã chọn.</td></tr>
            ) : filteredRoomTypes.map((rt) => (
              <TableRow key={rt.id}>
                <td className="py-2.5 px-3.5">
                  <div className="font-medium text-xs text-[#1C1917]">{rt.name}</div>
                  {rt.description && <div className="text-[11px] text-[#78716C] line-clamp-1 mt-0.5">{rt.description}</div>}
                </td>
                <td className="py-2.5 px-3.5 text-xs text-[#78716C]">{rt.apartment_name}</td>
                <td className="py-2.5 px-3.5 text-xs">
                  <span className="font-bold text-[#1C1917]">{rt.max_occupancy}</span>
                  <span className="text-[#78716C]"> suất (&gt;15t)</span>
                </td>
                <td className="py-2.5 px-3.5 text-xs text-[#78716C]">{rt.bed_config || '—'}</td>
                <td className="py-2.5 px-3.5 text-center font-mono font-bold text-xs text-[#1C1917]">
                  {rt.total_rooms} phòng
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono text-xs font-bold text-[#B4532A] tabular-nums">
                  {formatMoney(rt.base_price)}
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline" size="sm" icon={<IconEdit className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setIsNewRt(false);
                        setRtForm({ id: rt.id, name: rt.name, apartment_id: rt.apartment_id, base_price: rt.base_price, max_occupancy: rt.max_occupancy, description: rt.description || '', bed_config: rt.bed_config || '', area: rt.area || 0, is_active: rt.is_active });
                        setShowRtDrawer(true);
                      }}
                    >
                      {currentUser.role === 'admin' ? 'Sửa' : 'Xem'}
                    </Button>
                  </div>
                </td>
              </TableRow>
            ))}
          </tbody>
        </TableContainer>
      )}

      {/* ===== TAB 2: PHÒNG CỤ THỂ ===== */}
      {activeTab === 'rooms' && (
        <>
          {/* Legend trạng thái */}
          <div className="flex flex-wrap gap-2 items-center px-1 text-[11px] text-[#78716C]">
            <span className="font-medium">Trạng thái phòng:</span>
            {Object.entries(ROOM_STATUS_CONFIG).map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1">{cfg.badge}</span>
            ))}
            <span className="ml-1 italic">• Vòng lặp: Đang lưu trú → Cần dọn → Trống</span>
          </div>

          <TableContainer>
            <TableHeader>
              <tr>
                <th className="py-3 px-3.5">Số phòng</th>
                <th className="py-3 px-3.5">Loại phòng</th>
                <th className="py-3 px-3.5">Chi nhánh</th>
                <th className="py-3 px-3.5 text-center">Trạng thái</th>
                <th className="py-3 px-3.5">Khóa TTLock</th>
                <th className="py-3 px-3.5 text-center">Pin</th>
                <th className="py-3 px-3.5 text-right">Hành động</th>
              </tr>
            </TableHeader>
            <tbody>
              {roomsLoading ? (
                <tr><td colSpan={7} className="py-10 text-center text-xs text-[#78716C]">Đang tải...</td></tr>
              ) : filteredRooms.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-xs text-[#78716C]">Không có phòng nào phù hợp với chi nhánh đã chọn.</td></tr>
              ) : filteredRooms.map((r) => {
                const statusCfg = ROOM_STATUS_CONFIG[r.status as RoomStatus] || ROOM_STATUS_CONFIG.available;
                const isBlocked = showBlockedTooltip === r.room_id;

                return (
                  <TableRow key={r.room_id} className={r.is_hidden ? 'opacity-50' : ''}>
                    <td className="py-2.5 px-3.5 font-mono text-sm font-bold text-[#1C1917]">
                      <div>{r.room_number} {r.is_hidden && <span className="ml-1 text-[10px] text-[#78716C] font-normal font-sans">(ẩn)</span>}</div>
                      {r.special_features && (
                        <div className="font-sans text-[11px] font-normal text-[#9C5B14] bg-[#FDF7EE] border border-[#F7DCB4] rounded px-1.5 py-0.5 mt-1 inline-block max-w-[220px] truncate" title={r.special_features}>
                          ✦ {r.special_features}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-xs text-[#44403C]">{r.room_type_name}</td>
                    <td className="py-2.5 px-3.5 text-xs text-[#78716C]">{r.apartment_name}</td>
                    <td className="py-2.5 px-3.5 text-center">
                      {statusCfg.badge}
                    </td>
                    <td className="py-2.5 px-3.5 text-xs">
                      {r.lock_id ? (
                        <>
                          <div className="flex items-center gap-1.5 font-medium">
                            {r.lock_status === 'online' ? (
                              <><IconWifi className="w-3.5 h-3.5 text-[#2A694E]" /><span className="text-[#2A694E]">Trực tuyến</span></>
                            ) : (
                              <><IconWifiOff className="w-3.5 h-3.5 text-[#DC2626]" /><span className="text-[#DC2626]">Mất kết nối</span></>
                            )}
                          </div>
                          <div className="text-[10px] text-[#78716C]">{r.lock_name}</div>
                        </>
                      ) : (
                        <span className="text-[#78716C] italic">Chưa gán khóa</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono text-xs">
                      {r.battery_level !== undefined ? (
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                          r.battery_level < 20 ? 'bg-[#FDF2F2] text-[#DC2626] font-bold animate-pulse' : 'text-[#44403C]'
                        }`}>
                          <IconBattery className="w-3.5 h-3.5" level={r.battery_level} />
                          {r.battery_level}%
                        </div>
                      ) : <span className="text-[#78716C]">—</span>}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 relative">
                        {/* Nút chuyển trạng thái vòng lặp (không phải maintenance) */}
                        {r.status !== 'maintenance' && (
                          <div className="relative">
                            <Button
                              variant={statusCfg.canManual ? 'secondary' : 'outline'}
                              size="sm"
                              onClick={() => handleStatusCycleClick(r)}
                              className={!statusCfg.canManual ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              → {statusCfg.nextLabel}
                            </Button>
                            {/* Tooltip khi bị khóa */}
                            {isBlocked && statusCfg.blockedReason && (
                              <div className="absolute bottom-full right-0 mb-1.5 w-56 bg-[#1C1917] text-white text-[10px] rounded-[4px] px-2.5 py-1.5 z-50 shadow-lg">
                                🔒 {statusCfg.blockedReason}
                                <div className="absolute bottom-[-4px] right-3 w-2 h-2 bg-[#1C1917] rotate-45"></div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Nút Bảo trì (available ↔ maintenance) */}
                        {(r.status === 'available' || r.status === 'maintenance') && (
                          <Button
                            variant={r.status === 'maintenance' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handleToggleMaintenance(r)}
                          >
                            {r.status === 'maintenance' ? 'Bỏ bảo trì' : 'Bảo trì'}
                          </Button>
                        )}

                        {currentUser.role === 'admin' && (
                          <>
                            <Button
                              variant="outline" size="sm" icon={<IconEdit className="w-3.5 h-3.5" />}
                              onClick={() => {
                                setIsNewRoom(false);
                                setRoomForm({
                                  id: r.room_id,
                                  apartment_id: r.apartment_id,
                                  room_type_id: r.room_type_id,
                                  room_number: r.room_number,
                                  status: r.status as RoomStatus,
                                  special_features: r.special_features || '',
                                });
                                setShowRoomDrawer(true);
                              }}
                            >
                              Sửa
                            </Button>
                            <Button
                              variant="secondary" size="sm"
                              icon={r.is_hidden ? <IconEye className="w-3.5 h-3.5" /> : <IconEyeOff className="w-3.5 h-3.5" />}
                              onClick={() => handleHideRoom(r)}
                            >
                              {r.is_hidden ? 'Hiện' : 'Ẩn'}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </TableRow>
                );
              })}
            </tbody>
          </TableContainer>
        </>
      )}

      {/* ===== DRAWER: LOẠI PHÒNG ===== */}
      <Drawer
        isOpen={showRtDrawer}
        onClose={() => setShowRtDrawer(false)}
        title={isNewRt ? 'Thêm loại phòng mới' : (currentUser.role === 'admin' ? 'Chỉnh sửa loại phòng' : 'Chi tiết loại phòng (Chỉ xem)')}
        badge={currentUser.role === 'manager' ? <Badge variant="warning" size="sm">Chỉ xem</Badge> : undefined}
        footer={
          currentUser.role === 'admin' ? (
            <div className="flex justify-end gap-2 w-full">
              <Button variant="secondary" size="md" onClick={() => setShowRtDrawer(false)} disabled={rtSaving}>Hủy</Button>
              <Button variant="primary" size="md" onClick={handleSaveRoomType} disabled={rtSaving}>
                {rtSaving ? 'Đang lưu...' : 'Lưu loại phòng'}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="md" onClick={() => setShowRtDrawer(false)}>Đóng</Button>
          )
        }
      >
        <div className="space-y-4 text-xs">
          {currentUser.role === 'manager' && (
            <div className="p-2.5 bg-[#FDF7EE] border border-[#F7DCB4] rounded-[6px] text-[#9C5B14]">
              Tài khoản Quản lý chỉ được xem thông tin, không được sửa.
            </div>
          )}
          {isNewRt && (
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">Chi nhánh *</label>
              <select
                className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                value={rtForm.apartment_id}
                onChange={(e) => setRtForm({ ...rtForm, apartment_id: Number(e.target.value) })}
                disabled={currentUser.role === 'manager'}
              >
                <option value={0}>-- Chọn chi nhánh --</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <Input label="Tên loại phòng *" value={rtForm.name} disabled={currentUser.role === 'manager'}
            onChange={(e) => setRtForm({ ...rtForm, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Sức chứa tối đa (suất >15t)" type="number" value={rtForm.max_occupancy}
              disabled={currentUser.role === 'manager'}
              onChange={(e) => setRtForm({ ...rtForm, max_occupancy: Number(e.target.value) })} />
            <Input label="Cấu hình giường" value={rtForm.bed_config}
              disabled={currentUser.role === 'manager'}
              onChange={(e) => setRtForm({ ...rtForm, bed_config: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Giá cơ bản / đêm (đ)" type="number" value={rtForm.base_price}
              disabled={currentUser.role === 'manager'}
              onChange={(e) => setRtForm({ ...rtForm, base_price: Number(e.target.value) })} />
            <Input label="Diện tích (m²)" type="number" value={rtForm.area}
              disabled={currentUser.role === 'manager'}
              onChange={(e) => setRtForm({ ...rtForm, area: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">Mô tả ngắn</label>
            <textarea
              className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A] resize-none"
              rows={3}
              value={rtForm.description}
              disabled={currentUser.role === 'manager'}
              onChange={(e) => setRtForm({ ...rtForm, description: e.target.value })}
            />
          </div>
        </div>
      </Drawer>

      {/* ===== DRAWER: PHÒNG CỤ THỂ ===== */}
      <Drawer
        isOpen={showRoomDrawer}
        onClose={() => setShowRoomDrawer(false)}
        title={isNewRoom ? 'Thêm phòng mới' : 'Chỉnh sửa phòng'}
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" size="md" onClick={() => setShowRoomDrawer(false)} disabled={roomSaving}>Hủy</Button>
            <Button variant="primary" size="md" onClick={handleSaveRoom} disabled={roomSaving}>
              {roomSaving ? 'Đang lưu...' : 'Lưu phòng'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {isNewRoom && (
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">Chi nhánh *</label>
              <select
                className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                value={roomForm.apartment_id}
                onChange={(e) => setRoomForm({ ...roomForm, apartment_id: Number(e.target.value) })}
              >
                <option value={0}>-- Chọn chi nhánh --</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">Loại phòng *</label>
            <select
              className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
              value={roomForm.room_type_id}
              onChange={(e) => setRoomForm({ ...roomForm, room_type_id: Number(e.target.value) })}
            >
              <option value={0}>-- Chọn loại phòng --</option>
              {roomTypes
                .filter((rt) => !roomForm.apartment_id || rt.apartment_id === roomForm.apartment_id)
                .map((rt) => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </div>
          <Input label="Số phòng (mã phòng) *" value={roomForm.room_number}
            onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
            placeholder="VD: P101, A202" />
          <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">Trạng thái ban đầu</label>
            <select
              className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
              value={roomForm.status}
              onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value as RoomStatus })}
            >
              <option value="available">Trống (available)</option>
              <option value="maintenance">Bảo trì (maintenance)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">
              Đặc điểm đặc biệt của phòng <span className="text-[#78716C] font-normal">(không bắt buộc, không ảnh hưởng giá)</span>
            </label>
            <textarea
              className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A] resize-none"
              rows={3}
              placeholder="VD: Hướng đón nắng sáng, View biển trực diện Bãi Dâu, Gần lối ra sân thượng, Bồn tắm ngâm thảo mộc..."
              value={roomForm.special_features || ''}
              onChange={(e) => setRoomForm({ ...roomForm, special_features: e.target.value })}
            />
            <p className="text-[10px] text-[#78716C] mt-1">Thông tin mô tả đặc trưng của phòng, lưu tự do và không làm thay đổi giá tiền.</p>
          </div>
        </div>
      </Drawer>

      {/* ===== MODAL: TẠO NHIỀU PHÒNG THEO DẢI SỐ ===== */}
      <Modal
        isOpen={showBatchModal}
        onClose={() => { if (!batchSaving) setShowBatchModal(false); }}
        title="Tạo nhiều phòng theo dải số (Batch Create)"
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-[#78716C]">
              {batchRooms.length > 0 ? (
                <span>
                  Tổng cộng: <strong className="text-[#1C1917]">{batchRooms.length}</strong> phòng
                  {batchRooms.some(r => r.isDuplicate) && (
                    <span className="text-[#DC2626] font-medium ml-2">
                      (Có phòng bị trùng số!)
                    </span>
                  )}
                </span>
              ) : (
                <span>Chưa sinh danh sách phòng</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowBatchModal(false)}
                disabled={batchSaving}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={batchSaving || batchRooms.length === 0 || batchRooms.some(r => r.isDuplicate)}
                onClick={handleSaveBatchRooms}
              >
                {batchSaving ? 'Đang tạo...' : `Xác nhận tạo ${batchRooms.length} phòng`}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {/* PHẦN 1: THIẾT LẬP DẢI SỐ */}
          <div className="p-3.5 bg-[#FAF8F5] border border-[#E5E0D8] rounded-[8px] space-y-3">
            <div className="font-semibold text-[#1C1917] flex items-center justify-between">
              <span className="text-[#B4532A]">1. Cấu hình chung & Quy tắc dải số</span>
              <span className="text-[11px] text-[#78716C] font-normal">Tự động sinh mã phòng liên tục</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#44403C] mb-1">Chi nhánh *</label>
                <select
                  className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                  value={batchBranchId}
                  onChange={(e) => {
                    const newBranch = Number(e.target.value);
                    setBatchBranchId(newBranch);
                    const avTypes = roomTypes.filter(rt => rt.apartment_id === newBranch);
                    setBatchRoomTypeId(avTypes[0]?.id || 0);
                    setBatchRooms([]);
                    updateSuggestedStartDigits(batchPrefix, newBranch);
                  }}
                >
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#44403C] mb-1">Loại phòng *</label>
                <select
                  className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                  value={batchRoomTypeId}
                  onChange={(e) => {
                    setBatchRoomTypeId(Number(e.target.value));
                    setBatchRooms([]);
                  }}
                >
                  <option value={0}>-- Chọn loại phòng --</option>
                  {roomTypes
                    .filter((rt) => !batchBranchId || rt.apartment_id === batchBranchId)
                    .map((rt) => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                </select>
              </div>
            </div>

            {/* Dải số */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-[#44403C] mb-1">Tiền tố (Prefix)</label>
                <input
                  type="text"
                  placeholder="VD: P, A, Villa-"
                  value={batchPrefix}
                  onChange={(e) => {
                    const newPrefix = e.target.value;
                    setBatchPrefix(newPrefix);
                    updateSuggestedStartDigits(newPrefix, batchBranchId);
                  }}
                  className="w-full border border-[#E5E0D8] rounded-[6px] px-2.5 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#44403C] mb-1">
                  Số bắt đầu <span className="text-[#78716C] font-normal">(VD: 001, 101)</span> *
                </label>
                <input
                  type="text"
                  placeholder="VD: 001, 101"
                  value={batchStartDigits}
                  onChange={(e) => setBatchStartDigits(e.target.value)}
                  className="w-full border border-[#E5E0D8] rounded-[6px] px-2.5 py-1.5 text-xs font-mono font-bold text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#44403C] mb-1">Số lượng phòng *</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="w-full border border-[#E5E0D8] rounded-[6px] px-2.5 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#44403C] mb-1">Trạng thái ban đầu</label>
                <select
                  value={batchDefaultStatus}
                  onChange={(e) => setBatchDefaultStatus(e.target.value as 'available' | 'maintenance')}
                  className="w-full border border-[#E5E0D8] rounded-[6px] px-2 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                >
                  <option value="available">Trống (available)</option>
                  <option value="maintenance">Bảo trì (maintenance)</option>
                </select>
              </div>
            </div>

            {/* Thanh thông tin gợi ý số tiếp theo (+1) */}
            <div className="text-[11px] px-3 py-2 bg-white border border-[#E5E0D8] rounded-[6px] flex flex-wrap items-center justify-between gap-1">
              <div>
                {latestDetectedRoom ? (
                  <span>
                    Phòng mới nhất hiện có của tiền tố <strong>{batchPrefix}</strong>: <span className="font-mono font-bold text-[#B4532A]">{latestDetectedRoom}</span>
                    {' '}&rarr; Gợi ý số tiếp theo: <span className="font-mono font-bold text-[#2A694E]">{batchPrefix}{batchStartDigits}</span>
                  </span>
                ) : (
                  <span>
                    Chưa có phòng nào tiền tố <strong>{batchPrefix}</strong> tại chi nhánh này &rarr; Bắt đầu từ: <span className="font-mono font-bold text-[#2A694E]">{batchPrefix}{batchStartDigits}</span>
                  </span>
                )}
              </div>
              <div className="text-[#78716C] text-[10px]">
                Quy tắc tầng: 10 phòng/tầng (01 &rarr; 10, phòng tiếp theo nhảy lên tầng mới)
              </div>
            </div>

            {/* Checkbox kiêng số */}
            <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-[#E5E0D8]/60">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-[#44403C] select-none">
                <input
                  type="checkbox"
                  checked={batchSkip4}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setBatchSkip4(checked);
                    updateSuggestedStartDigits(batchPrefix, batchBranchId, checked, batchSkip13);
                  }}
                  className="w-3.5 h-3.5 text-[#B4532A] rounded border-[#D6D0C7] focus:ring-[#B4532A]"
                />
                <span>Bỏ qua số chứa số <strong>4</strong> (VD: 004, 104, 204...)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-[#44403C] select-none">
                <input
                  type="checkbox"
                  checked={batchSkip13}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setBatchSkip13(checked);
                    updateSuggestedStartDigits(batchPrefix, batchBranchId, batchSkip4, checked);
                  }}
                  className="w-3.5 h-3.5 text-[#B4532A] rounded border-[#D6D0C7] focus:ring-[#B4532A]"
                />
                <span>Bỏ qua số <strong>13</strong> (VD: 113, 213...)</span>
              </label>

              <div className="ml-auto">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<IconRefresh className="w-3.5 h-3.5" />}
                  onClick={handleGenerateBatchRooms}
                >
                  Sinh danh sách phòng
                </Button>
              </div>
            </div>
          </div>

          {/* PHẦN 2: BẢNG DANH SÁCH & ĐẶC ĐIỂM RIÊNG TỪNG PHÒNG */}
          {batchRooms.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[#1C1917] flex items-center gap-2">
                  <span className="text-[#B4532A]">2. Danh sách phòng & Đặc điểm riêng từng phòng</span>
                  <span className="text-[11px] font-normal text-[#78716C]">({batchRooms.length} phòng)</span>
                </div>

                {/* Điền mẫu nhanh cho các ô trống */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Đặc điểm chung mẫu..."
                    value={quickFeatureText}
                    onChange={(e) => setQuickFeatureText(e.target.value)}
                    className="border border-[#E5E0D8] rounded-[4px] px-2 py-1 text-[11px] text-[#1C1917] bg-white w-44 focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                  />
                  <Button variant="outline" size="sm" onClick={handleApplyQuickFeatures}>
                    Áp dụng ô trống
                  </Button>
                </div>
              </div>

              {/* Bảng editable */}
              <div className="border border-[#E5E0D8] rounded-[8px] overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#FAF8F5] border-b border-[#E5E0D8] sticky top-0 z-10 text-[11px] text-[#78716C] font-semibold">
                    <tr>
                      <th className="py-2 px-2.5 w-12 text-center">STT</th>
                      <th className="py-2 px-2.5 w-32">Số phòng</th>
                      <th className="py-2 px-2.5 w-32">Trạng thái</th>
                      <th className="py-2 px-2.5">Đặc điểm riêng biệt của phòng</th>
                      <th className="py-2 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F2EE] text-xs">
                    {batchRooms.map((r, idx) => (
                      <tr key={r.id} className={r.isDuplicate ? 'bg-[#FEF2F2]' : 'hover:bg-[#FAF8F5]'}>
                        <td className="py-2 px-2.5 text-center font-mono text-[#78716C]">{idx + 1}</td>
                        <td className="py-2 px-2.5">
                          <input
                            type="text"
                            value={r.room_number}
                            onChange={(e) => handleUpdateBatchRoom(r.id, 'room_number', e.target.value)}
                            className={`w-full font-mono font-bold px-2 py-1 rounded-[4px] border text-xs focus:outline-none ${
                              r.isDuplicate
                                ? 'border-[#DC2626] bg-white text-[#DC2626] focus:ring-1 focus:ring-[#DC2626]'
                                : 'border-[#E5E0D8] bg-white text-[#1C1917] focus:ring-1 focus:ring-[#B4532A]'
                            }`}
                          />
                          {r.isDuplicate && (
                            <div className="text-[10px] text-[#DC2626] mt-0.5 flex items-center gap-0.5">
                              <IconAlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span>Trùng số phòng!</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2.5">
                          <select
                            value={r.status}
                            onChange={(e) => handleUpdateBatchRoom(r.id, 'status', e.target.value)}
                            className="w-full border border-[#E5E0D8] rounded-[4px] px-2 py-1 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                          >
                            <option value="available">Trống</option>
                            <option value="maintenance">Bảo trì</option>
                          </select>
                        </td>
                        <td className="py-2 px-2.5">
                          <input
                            type="text"
                            placeholder="VD: Hướng nắng sáng, View biển, Bồn tắm..."
                            value={r.special_features}
                            onChange={(e) => handleUpdateBatchRoom(r.id, 'special_features', e.target.value)}
                            className="w-full border border-[#E5E0D8] rounded-[4px] px-2.5 py-1 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteBatchRoom(r.id)}
                            className="text-[#78716C] hover:text-[#DC2626] p-1 transition-colors"
                            title="Xóa phòng này"
                          >
                            <IconX className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {batchRooms.some(r => r.isDuplicate) && (
                <div className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-[6px] text-[11px] flex items-center gap-2">
                  <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Một số phòng bị trùng với các phòng đã có sẵn trong chi nhánh. Hãy sửa lại số phòng hoặc bấm <strong>✕</strong> để xóa phòng đó trước khi lưu.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 border border-dashed border-[#E5E0D8] rounded-[8px] text-center text-[#78716C]">
              <div className="text-sm font-medium text-[#44403C]">Chưa có phòng nào trong danh sách</div>
              <div className="text-[11px] mt-1">Chọn chi nhánh, loại phòng và bấm <strong>"Sinh danh sách phòng"</strong> ở trên để tạo dải phòng tự động.</div>
            </div>
          )}
        </div>
      </Modal>

      {/* ===== CONFIRM: VÒNG LẶP TRẠNG THÁI (occupied/cleaning/available) ===== */}
      <ConfirmDialog
        isOpen={showStatusConfirm}
        onClose={() => { setShowStatusConfirm(false); setStatusTarget(null); setStatusTargetNext(null); }}
        onConfirm={handleConfirmStatusChange}
        title={`Chuyển trạng thái phòng ${statusTarget?.room_number || ''}`}
        message={`Xác nhận chuyển phòng ${statusTarget?.room_number} từ "${ROOM_STATUS_CONFIG[statusTarget?.status as RoomStatus]?.label || ''}" sang "${ROOM_STATUS_CONFIG[statusTargetNext as RoomStatus]?.label || ''}"?`}
        confirmLabel={`Chuyển sang ${ROOM_STATUS_CONFIG[statusTargetNext as RoomStatus]?.label || ''}`}
        variant="primary"
        reasonRequired={false}
        reasonValue={statusReason}
        onReasonChange={setStatusReason}
      />

      {/* ===== CONFIRM: BẢO TRÌ ===== */}
      <ConfirmDialog
        isOpen={showMaintenanceConfirm}
        onClose={() => { setShowMaintenanceConfirm(false); setMaintenanceTarget(null); }}
        onConfirm={handleConfirmMaintenance}
        title={maintenanceTarget?.status === 'maintenance' ? 'Bỏ bảo trì phòng' : 'Chuyển sang bảo trì'}
        message={`Bạn có chắc muốn chuyển phòng ${maintenanceTarget?.room_number} sang "${maintenanceTarget?.status === 'maintenance' ? 'Trống' : 'Bảo trì'}"?${maintenanceTarget?.status !== 'maintenance' ? ' Hệ thống sẽ tự động gán lại nếu có booking trùng lịch.' : ''}`}
        confirmLabel={maintenanceTarget?.status === 'maintenance' ? 'Bỏ bảo trì' : 'Chuyển bảo trì'}
        variant={maintenanceTarget?.status === 'maintenance' ? 'primary' : 'danger'}
        reasonRequired={maintenanceTarget?.status !== 'maintenance'}
        reasonValue={maintenanceReason}
        onReasonChange={setMaintenanceReason}
      />
    </div>
  );
};
