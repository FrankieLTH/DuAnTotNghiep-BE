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
} from '../AdminIcons';
import { AdminUser } from '../AdminLayout';
import { adminApi, RoomTypeItem, RoomItem } from '../../../services/adminService';

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
const emptyRoomForm: { apartment_id: number; room_type_id: number; room_number: string; status: RoomStatus } = {
  apartment_id: 0, room_type_id: 0, room_number: '', status: 'available',
};

export const RoomsScreen: React.FC<RoomsScreenProps> = ({ currentUser, selectedBranchId, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'types' | 'rooms'>('types');

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
  const [roomForm, setRoomForm] = useState<{ id?: number; apartment_id: number; room_type_id: number; room_number: string; status: RoomStatus }>(emptyRoomForm);
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

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Top Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-[#E5E0D8] rounded-[6px]">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setActiveTab('types')}
            className={`px-4 py-2 rounded-[4px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'types' ? 'bg-[#B4532A] text-white' : 'bg-[#F4F2EE] text-[#44403C] hover:bg-[#EBE7E0]'
            }`}
          >
            1. Loại phòng ({roomTypes.length})
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-2 rounded-[4px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'rooms' ? 'bg-[#B4532A] text-white' : 'bg-[#F4F2EE] text-[#44403C] hover:bg-[#EBE7E0]'
            }`}
          >
            2. Phòng ({rooms.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'manager' && (
            <Badge variant="warning" size="sm">Chỉ xem • Được đổi trạng thái phòng</Badge>
          )}
          {currentUser.role === 'admin' && activeTab === 'types' && (
            <Button
              variant="primary" size="sm" icon={<IconPlus className="w-4 h-4" />}
              onClick={() => { setIsNewRt(true); setRtForm(emptyRoomTypeForm); setShowRtDrawer(true); }}
            >
              Thêm loại phòng
            </Button>
          )}
          {currentUser.role === 'admin' && activeTab === 'rooms' && (
            <Button
              variant="primary" size="sm" icon={<IconPlus className="w-4 h-4" />}
              onClick={() => { setIsNewRoom(true); setRoomForm(emptyRoomForm); setShowRoomDrawer(true); }}
            >
              Thêm phòng
            </Button>
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
            ) : roomTypes.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-xs text-[#78716C]">Chưa có loại phòng nào.</td></tr>
            ) : roomTypes.map((rt) => (
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
              ) : rooms.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-xs text-[#78716C]">Chưa có phòng nào.</td></tr>
              ) : rooms.map((r) => {
                const statusCfg = ROOM_STATUS_CONFIG[r.status as RoomStatus] || ROOM_STATUS_CONFIG.available;
                const isBlocked = showBlockedTooltip === r.room_id;

                return (
                  <TableRow key={r.room_id} className={r.is_hidden ? 'opacity-50' : ''}>
                    <td className="py-2.5 px-3.5 font-mono text-sm font-bold text-[#1C1917]">
                      {r.room_number}
                      {r.is_hidden && <span className="ml-1 text-[10px] text-[#78716C] font-normal">(ẩn)</span>}
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
                                setRoomForm({ id: r.room_id, apartment_id: r.apartment_id, room_type_id: r.room_type_id, room_number: r.room_number, status: r.status as RoomStatus });
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
        </div>
      </Drawer>

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
