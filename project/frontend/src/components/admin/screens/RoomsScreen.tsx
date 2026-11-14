import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TableContainer,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Input,
  Drawer,
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
import {
  adminApi,
  RoomTypeItem,
  RoomItem,
  RoomGroupItem,
  RoomFeatureItem,
} from '../../../services/adminService';
import {
  suggestFloor,
  computeRoomDisplayStatus,
  normalizeRoomNumber,
} from '@shared/index';

import { BatchCreateModal } from './rooms/BatchCreateModal';
import { RoomBlockModal } from './rooms/RoomBlockModal';
import { ManageGroupsFeaturesModal } from './rooms/ManageGroupsFeaturesModal';
import { BulkAssignModal } from './rooms/BulkAssignModal';

interface RoomsScreenProps {
  currentUser: AdminUser;
  selectedBranchId: number;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const emptyRoomTypeForm = {
  name: '',
  apartment_id: 0,
  base_price: 600000,
  max_occupancy: 2,
  description: '',
  bed_config: '1 giường đôi',
  area: 30,
  is_active: true,
};

const emptyRoomForm = {
  apartment_id: 0,
  room_type_id: 0,
  room_number: '',
  floor: 1,
  room_group_id: null as number | null,
  note: '',
  status: 'available' as 'available' | 'maintenance',
  initial_block_reason: '',
  feature_ids: [] as number[],
  special_features: '',
};

export const RoomsScreen: React.FC<RoomsScreenProps> = ({
  currentUser,
  selectedBranchId,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'types' | 'rooms'>('rooms');

  // ---- Bộ lọc chi nhánh trên màn hình RoomsScreen ----
  const [screenBranchId, setScreenBranchId] = useState<number>(() => {
    return currentUser.role === 'manager'
      ? currentUser.branchId || 1
      : selectedBranchId || 0;
  });

  useEffect(() => {
    if (currentUser.role === 'manager') {
      setScreenBranchId(currentUser.branchId || 1);
    } else {
      setScreenBranchId(selectedBranchId || 0);
    }
  }, [selectedBranchId, currentUser]);

  const effectiveBranchId =
    currentUser.role === 'manager' ? currentUser.branchId || 1 : screenBranchId;

  // ---- Branches for form ----
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    adminApi
      .getBranches(currentUser.role)
      .then((data) => {
        setBranches(Array.isArray(data) ? data.map((b) => ({ id: b.id, name: b.name })) : []);
      })
      .catch(() => {});
  }, [currentUser.role]);

  // ---- Dữ liệu Danh mục Nhóm phòng & Đặc điểm ----
  const [roomGroups, setRoomGroups] = useState<RoomGroupItem[]>([]);
  const [roomFeatures, setRoomFeatures] = useState<RoomFeatureItem[]>([]);

  const loadGroupsAndFeatures = useCallback(async () => {
    try {
      const [groupsData, featuresData] = await Promise.all([
        adminApi.getRoomGroups(currentUser.role, false),
        adminApi.getRoomFeatures(currentUser.role, false),
      ]);
      setRoomGroups(Array.isArray(groupsData) ? groupsData : []);
      setRoomFeatures(Array.isArray(featuresData) ? featuresData : []);
    } catch {}
  }, [currentUser.role]);

  useEffect(() => {
    loadGroupsAndFeatures();
  }, [loadGroupsAndFeatures]);

  // ---- Loại phòng state ----
  const [roomTypes, setRoomTypes] = useState<RoomTypeItem[]>([]);
  const [rtLoading, setRtLoading] = useState(true);
  const [showRtDrawer, setShowRtDrawer] = useState(false);
  const [isNewRt, setIsNewRt] = useState(false);
  const [rtForm, setRtForm] = useState<typeof emptyRoomTypeForm & { id?: number }>(
    emptyRoomTypeForm
  );
  const [rtSaving, setRtSaving] = useState(false);

  // ---- Phòng cụ thể state ----
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [showRoomDrawer, setShowRoomDrawer] = useState(false);
  const [isNewRoom, setIsNewRoom] = useState(false);
  const [roomForm, setRoomForm] = useState<typeof emptyRoomForm & { id?: number }>(
    emptyRoomForm
  );
  const [roomSaving, setRoomSaving] = useState(false);

  // ---- Bộ lọc nâng cao cho danh sách phòng ----
  const [filterFloor, setFilterFloor] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterFeature, setFilterFeature] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ---- Tickbox chọn nhiều phòng ----
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);

  // ---- Modal states ----
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [blockModalTarget, setBlockModalTarget] = useState<RoomItem | null>(null);
  const [bulkModalType, setBulkModalType] = useState<'group' | 'features' | null>(null);

  // ---- Load data ----
  const loadRoomTypes = useCallback(async () => {
    setRtLoading(true);
    try {
      const aptId =
        currentUser.role === 'manager'
          ? currentUser.branchId || undefined
          : effectiveBranchId || undefined;
      const data = await adminApi.getAdminRoomTypes(currentUser.role, aptId);
      setRoomTypes(Array.isArray(data) ? data : []);
    } catch {
      onShowToast('Không tải được danh sách loại phòng.', 'error');
    } finally {
      setRtLoading(false);
    }
  }, [currentUser.role, currentUser.branchId, effectiveBranchId, onShowToast]);

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const aptId =
        currentUser.role === 'manager'
          ? currentUser.branchId || undefined
          : effectiveBranchId || undefined;
      const data = await adminApi.getRooms(
        currentUser.role,
        aptId ? { apartment_id: aptId } : undefined
      );
      setRooms(Array.isArray(data) ? data : []);
    } catch {
      onShowToast('Không tải được danh sách phòng.', 'error');
    } finally {
      setRoomsLoading(false);
    }
  }, [currentUser.role, currentUser.branchId, effectiveBranchId, onShowToast]);

  useEffect(() => {
    loadRoomTypes();
  }, [loadRoomTypes]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // ---- Room Type CRUD ----
  const handleSaveRoomType = async () => {
    if (!rtForm.name.trim()) {
      onShowToast('Vui lòng nhập tên loại phòng.', 'error');
      return;
    }
    if (!rtForm.apartment_id) {
      onShowToast('Vui lòng chọn chi nhánh.', 'error');
      return;
    }
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
    } finally {
      setRtSaving(false);
    }
  };

  // ---- Room CRUD (Drawer Thêm/Sửa phòng nâng cấp) ----
  const handleRoomNumberChange = (val: string) => {
    const norm = normalizeRoomNumber(val);
    const suggested = suggestFloor(norm);
    setRoomForm((prev) => ({
      ...prev,
      room_number: val,
      floor: suggested !== null ? suggested : prev.floor,
    }));
  };

  const handleToggleRoomFeature = (featId: number) => {
    setRoomForm((prev) => {
      const exists = prev.feature_ids.includes(featId);
      return {
        ...prev,
        feature_ids: exists
          ? prev.feature_ids.filter((id) => id !== featId)
          : [...prev.feature_ids, featId],
      };
    });
  };

  const handleSaveRoom = async () => {
    if (!roomForm.room_number.trim()) {
      onShowToast('Vui lòng nhập số phòng.', 'error');
      return;
    }
    if (!roomForm.room_type_id) {
      onShowToast('Vui lòng chọn loại phòng.', 'error');
      return;
    }
    if (!roomForm.apartment_id) {
      onShowToast('Vui lòng chọn chi nhánh.', 'error');
      return;
    }
    if (isNewRoom && roomForm.status === 'maintenance' && !roomForm.initial_block_reason.trim()) {
      onShowToast('Bắt buộc nhập lý do bảo trì khi chọn trạng thái Bảo trì ban đầu.', 'warning');
      return;
    }

    setRoomSaving(true);
    try {
      if (isNewRoom) {
        await adminApi.createRoom(
          {
            apartment_id: roomForm.apartment_id,
            room_type_id: roomForm.room_type_id,
            room_number: normalizeRoomNumber(roomForm.room_number),
            floor: Number(roomForm.floor),
            room_group_id: roomForm.room_group_id || null,
            note: roomForm.note.trim() || undefined,
            status: roomForm.status,
            initial_block_reason: roomForm.initial_block_reason.trim() || undefined,
            feature_ids: roomForm.feature_ids,
            special_features: roomForm.special_features.trim() || undefined,
          } as any,
          currentUser.role
        );
        onShowToast(`Đã thêm phòng "${normalizeRoomNumber(roomForm.room_number)}"!`, 'success');
      } else if (roomForm.id) {
        await adminApi.updateRoom(
          roomForm.id,
          {
            apartment_id: roomForm.apartment_id,
            room_type_id: roomForm.room_type_id,
            room_number: normalizeRoomNumber(roomForm.room_number),
            floor: Number(roomForm.floor),
            room_group_id: roomForm.room_group_id || null,
            note: roomForm.note.trim() || undefined,
            status: roomForm.status,
            feature_ids: roomForm.feature_ids,
            special_features: roomForm.special_features.trim() || undefined,
          },
          currentUser.role
        );
        onShowToast(`Đã cập nhật thông tin phòng "${roomForm.room_number}"!`, 'success');
      }
      setShowRoomDrawer(false);
      await loadRooms();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || err?.message || 'Lỗi khi lưu phòng.', 'error');
    } finally {
      setRoomSaving(false);
    }
  };

  // Đổi Housekeeping (Sạch ↔ Cần dọn)
  const handleToggleHousekeeping = async (room: RoomItem) => {
    const nextHk = room.housekeeping === 'dirty' ? 'clean' : 'dirty';
    try {
      await adminApi.updateHousekeeping(room.room_id, nextHk, currentUser.role);
      onShowToast(
        `Phòng ${room.room_number} đã chuyển sang "${nextHk === 'clean' ? 'Sạch sẽ' : 'Cần dọn dẹp'}".`,
        'success'
      );
      await loadRooms();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || err?.message || 'Lỗi khi đổi dọn dẹp.', 'error');
    }
  };

  // Ẩn / Hiện phòng
  const handleHideRoom = async (room: RoomItem) => {
    try {
      if (room.is_hidden) {
        await adminApi.unhideRoom(room.room_id, currentUser.role);
        onShowToast(`Đã mở lại phòng ${room.room_number}.`, 'success');
      } else {
        await adminApi.hideRoom(room.room_id, currentUser.role);
        onShowToast(`Đã tạm ẩn phòng ${room.room_number}.`, 'warning');
      }
      await loadRooms();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || err?.message || 'Không thể thay đổi ẩn phòng.', 'error');
    }
  };

  // Xóa mềm phòng (chỉ admin, không xóa phòng từng có đơn)
  const handleDeleteRoom = async (room: RoomItem) => {
    if (!window.confirm(`Bạn có chắc muốn xóa phòng ${room.room_number}? Thao tác này không thể hoàn tác nếu phòng chưa từng có đơn.`)) {
      return;
    }
    try {
      await adminApi.deleteRoom(room.room_id, currentUser.role);
      onShowToast(`Đã xóa phòng ${room.room_number}.`, 'success');
      await loadRooms();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || err?.message || 'Không thể xóa phòng.', 'error');
    }
  };

  // ---- Quản lý Tickbox nhiều phòng ----
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRoomIds(filteredRooms.map((r) => r.room_id));
    } else {
      setSelectedRoomIds([]);
    }
  };

  const handleToggleSelectRoom = (roomId: number) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };

  // ---- Lọc phòng hiển thị ----
  const filteredRoomTypes = effectiveBranchId > 0
    ? roomTypes.filter((rt) => rt.apartment_id === effectiveBranchId)
    : roomTypes;

  const filteredRooms = useMemo(() => {
    let list = effectiveBranchId > 0
      ? rooms.filter((r) => r.apartment_id === effectiveBranchId)
      : rooms;

    // Lọc theo tầng
    if (filterFloor !== 'all') {
      list = list.filter((r) => String(r.floor ?? suggestFloor(r.room_number) ?? 0) === filterFloor);
    }
    // Lọc theo nhóm phòng
    if (filterGroup !== 'all') {
      if (filterGroup === 'none') {
        list = list.filter((r) => !r.room_group_id);
      } else {
        list = list.filter((r) => String(r.room_group_id) === filterGroup);
      }
    }
    // Lọc theo đặc điểm
    if (filterFeature !== 'all') {
      const featId = Number(filterFeature);
      list = list.filter((r) => r.feature_ids && r.feature_ids.includes(featId));
    }
    // Lọc theo trạng thái tính toán
    if (filterStatus !== 'all') {
      list = list.filter((r) => (r.display_status || computeRoomDisplayStatus({ housekeeping: r.housekeeping }, [], false)) === filterStatus);
    }

    // Sắp xếp tự nhiên: floor trước, room_number sau
    return [...list].sort((a, b) => {
      const floorA = a.floor ?? suggestFloor(a.room_number) ?? 0;
      const floorB = b.floor ?? suggestFloor(b.room_number) ?? 0;
      if (floorA !== floorB) return floorA - floorB;
      return a.room_number.localeCompare(b.room_number, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [rooms, effectiveBranchId, filterFloor, filterGroup, filterFeature, filterStatus]);

  // Danh sách các tầng xuất hiện trong data
  const availableFloors = useMemo(() => {
    const s = new Set<number>();
    rooms.forEach((r) => {
      const f = r.floor ?? suggestFloor(r.room_number) ?? 0;
      s.add(f);
    });
    return Array.from(s).sort((a, b) => a - b);
  }, [rooms]);

  // Helper render badge trạng thái tính toán
  const renderDisplayStatusBadge = (statusLabel?: string) => {
    switch (statusLabel) {
      case 'Bảo trì':
        return <Badge variant="danger" size="sm">🔴 Bảo trì</Badge>;
      case 'Đang lưu trú':
        return <Badge variant="info" size="sm">🔵 Đang lưu trú</Badge>;
      case 'Cần dọn dẹp':
        return <Badge variant="warning" size="sm">🟡 Cần dọn dẹp</Badge>;
      case 'Sẵn sàng':
      default:
        return <Badge variant="success" size="sm">🟢 Sẵn sàng</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Switcher & Top Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-[#E5E0D8] rounded-[6px]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveTab('types')}
              className={`px-4 py-2 rounded-[4px] font-semibold transition-colors cursor-pointer ${
                activeTab === 'types'
                  ? 'bg-[#B4532A] text-white'
                  : 'bg-[#F4F2EE] text-[#44403C] hover:bg-[#EBE7E0]'
              }`}
            >
              1. Loại phòng ({filteredRoomTypes.length})
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-4 py-2 rounded-[4px] font-semibold transition-colors cursor-pointer ${
                activeTab === 'rooms'
                  ? 'bg-[#B4532A] text-white'
                  : 'bg-[#F4F2EE] text-[#44403C] hover:bg-[#EBE7E0]'
              }`}
            >
              2. Phòng ({filteredRooms.length})
            </button>
          </div>

          {/* Bộ lọc chi nhánh trực tiếp */}
          <div className="flex items-center gap-2 border-l border-[#E5E0D8] pl-3">
            <span className="text-xs font-semibold text-[#78716C] whitespace-nowrap">
              🏢 Chi nhánh:
            </span>
            <select
              value={effectiveBranchId}
              disabled={currentUser.role === 'manager'}
              onChange={(e) => setScreenBranchId(Number(e.target.value))}
              className="text-xs bg-[#FAF9F7] border border-[#E5E0D8] rounded-[4px] px-2.5 py-1.5 font-medium text-[#1C1917] focus:outline-none focus:border-[#B4532A] cursor-pointer"
            >
              <option value={0}>Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'manager' && (
            <Badge variant="warning" size="sm">
              Quản lý chi nhánh • Chỉ đổi dọn dẹp (Sạch/Cần dọn)
            </Badge>
          )}

          {currentUser.role === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManageModal(true)}
            >
              ⚙️ Nhóm & Đặc điểm
            </Button>
          )}

          {currentUser.role === 'admin' && activeTab === 'types' && (
            <Button
              variant="primary"
              size="sm"
              icon={<IconPlus className="w-4 h-4" />}
              onClick={() => {
                setIsNewRt(true);
                setRtForm({
                  ...emptyRoomTypeForm,
                  apartment_id: effectiveBranchId > 0 ? effectiveBranchId : branches[0]?.id || 1,
                });
                setShowRtDrawer(true);
              }}
            >
              Thêm loại phòng
            </Button>
          )}

          {currentUser.role === 'admin' && activeTab === 'rooms' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<IconPlus className="w-4 h-4" />}
                onClick={() => setShowBatchModal(true)}
              >
                + Tạo nhiều phòng
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<IconPlus className="w-4 h-4" />}
                onClick={() => {
                  setIsNewRoom(true);
                  const bId = effectiveBranchId > 0 ? effectiveBranchId : branches[0]?.id || 1;
                  const avTypes = roomTypes.filter((rt) => rt.apartment_id === bId);
                  setRoomForm({
                    ...emptyRoomForm,
                    apartment_id: bId,
                    room_type_id: avTypes[0]?.id || 0,
                    feature_ids: [],
                  });
                  setShowRoomDrawer(true);
                }}
              >
                + Thêm phòng
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
              <tr>
                <td colSpan={7} className="py-10 text-center text-xs text-[#78716C]">
                  Đang tải...
                </td>
              </tr>
            ) : filteredRoomTypes.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-xs text-[#78716C]">
                  Không có loại phòng nào phù hợp với chi nhánh đã chọn.
                </td>
              </tr>
            ) : (
              filteredRoomTypes.map((rt) => (
                <TableRow key={rt.id}>
                  <td className="py-2.5 px-3.5">
                    <div className="font-medium text-xs text-[#1C1917]">{rt.name}</div>
                    {rt.description && (
                      <div className="text-[11px] text-[#78716C] line-clamp-1 mt-0.5">
                        {rt.description}
                      </div>
                    )}
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
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<IconEdit className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setIsNewRt(false);
                        setRtForm({
                          id: rt.id,
                          name: rt.name,
                          apartment_id: rt.apartment_id,
                          base_price: rt.base_price,
                          max_occupancy: rt.max_occupancy,
                          description: rt.description || '',
                          bed_config: rt.bed_config || '',
                          area: rt.area || 0,
                          is_active: rt.is_active,
                        });
                        setShowRtDrawer(true);
                      }}
                    >
                      {currentUser.role === 'admin' ? 'Sửa' : 'Xem'}
                    </Button>
                  </td>
                </TableRow>
              ))
            )}
          </tbody>
        </TableContainer>
      )}

      {/* ===== TAB 2: PHÒNG CỤ THỂ ===== */}
      {activeTab === 'rooms' && (
        <div className="space-y-3">
          {/* THANH BỘ LỌC NÂNG CAO VÀ LEGEND */}
          <div className="p-3 bg-white border border-[#E5E0D8] rounded-[6px] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Legend 4 nhãn trạng thái tính toán */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#78716C]">
                <span className="font-semibold text-[#1C1917]">Nhãn tính toán:</span>
                <span className="flex items-center gap-1">🔴 Bảo trì (có block)</span>
                <span>&gt;</span>
                <span className="flex items-center gap-1">🔵 Đang lưu trú (checked-in)</span>
                <span>&gt;</span>
                <span className="flex items-center gap-1">🟡 Cần dọn dẹp (dirty)</span>
                <span>&gt;</span>
                <span className="flex items-center gap-1">🟢 Sẵn sàng</span>
              </div>

              {/* THANH HÀNH ĐỘNG HÀNG LOẠT KHI TICK CHỌN */}
              {currentUser.role === 'admin' && selectedRoomIds.length > 0 && (
                <div className="flex items-center gap-2 bg-[#FDF7EE] border border-[#F7DCB4] px-2.5 py-1 rounded-[4px] animate-fade-in">
                  <span className="text-xs font-semibold text-[#9C5B14]">
                    Đã tick {selectedRoomIds.length} phòng:
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkModalType('group')}
                  >
                    Gán nhóm phòng
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkModalType('features')}
                  >
                    Gán đặc điểm
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelectedRoomIds([])}
                    className="text-[#78716C] hover:text-[#1C1917] text-xs underline cursor-pointer ml-1"
                  >
                    Bỏ chọn
                  </button>
                </div>
              )}
            </div>

            {/* Các dropdown bộ lọc */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#F0ECE1] text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[#78716C] font-medium">Tầng:</span>
                <select
                  value={filterFloor}
                  onChange={(e) => setFilterFloor(e.target.value)}
                  className="bg-[#FAF9F7] border border-[#E5E0D8] rounded px-2 py-1 text-xs text-[#1C1917] focus:outline-none"
                >
                  <option value="all">Tất cả tầng</option>
                  {availableFloors.map((fl) => (
                    <option key={fl} value={String(fl)}>
                      Tầng {fl}
                    </option>
                  ))}
                </select>
              </div>

              {currentUser.role === 'admin' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[#78716C] font-medium">Nhóm phòng:</span>
                  <select
                    value={filterGroup}
                    onChange={(e) => setFilterGroup(e.target.value)}
                    className="bg-[#FAF9F7] border border-[#E5E0D8] rounded px-2 py-1 text-xs text-[#1C1917] focus:outline-none"
                  >
                    <option value="all">Tất cả nhóm</option>
                    <option value="none">Chưa có nhóm</option>
                    {roomGroups.map((g) => (
                      <option key={g.id} value={String(g.id)}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-[#78716C] font-medium">Đặc điểm:</span>
                <select
                  value={filterFeature}
                  onChange={(e) => setFilterFeature(e.target.value)}
                  className="bg-[#FAF9F7] border border-[#E5E0D8] rounded px-2 py-1 text-xs text-[#1C1917] focus:outline-none"
                >
                  <option value="all">Tất cả đặc điểm</option>
                  {roomFeatures.map((f) => (
                    <option key={f.id} value={String(f.id)}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[#78716C] font-medium">Trạng thái:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-[#FAF9F7] border border-[#E5E0D8] rounded px-2 py-1 text-xs text-[#1C1917] focus:outline-none"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="Sẵn sàng">🟢 Sẵn sàng</option>
                  <option value="Đang lưu trú">🔵 Đang lưu trú</option>
                  <option value="Cần dọn dẹp">🟡 Cần dọn dẹp</option>
                  <option value="Bảo trì">🔴 Bảo trì</option>
                </select>
              </div>

              {(filterFloor !== 'all' || filterGroup !== 'all' || filterFeature !== 'all' || filterStatus !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterFloor('all');
                    setFilterGroup('all');
                    setFilterFeature('all');
                    setFilterStatus('all');
                  }}
                  className="text-[#B4532A] hover:underline cursor-pointer font-medium ml-auto"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          {/* BẢNG PHÒNG */}
          <TableContainer>
            <TableHeader>
              <tr>
                {currentUser.role === 'admin' && (
                  <th className="py-3 px-3 text-center w-8">
                    <input
                      type="checkbox"
                      checked={
                        filteredRooms.length > 0 &&
                        selectedRoomIds.length === filteredRooms.length
                      }
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="accent-[#B4532A] cursor-pointer"
                    />
                  </th>
                )}
                <th className="py-3 px-3">Số phòng</th>
                <th className="py-3 px-2 text-center">Tầng</th>
                {currentUser.role === 'admin' && (
                  <th className="py-3 px-3">Nhóm phòng</th>
                )}
                <th className="py-3 px-3">Loại phòng</th>
                <th className="py-3 px-3">Đặc điểm</th>
                <th className="py-3 px-3 text-center">Trạng thái tính toán</th>
                <th className="py-3 px-3">Khóa TTLock</th>
                <th className="py-3 px-3 text-center">Pin</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </TableHeader>
            <tbody>
              {roomsLoading ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-xs text-[#78716C]">
                    Đang tải danh sách phòng...
                  </td>
                </tr>
              ) : filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-xs text-[#78716C]">
                    Không có phòng nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRooms.map((r) => {
                  const isChecked = selectedRoomIds.includes(r.room_id);
                  const displayStatus =
                    r.display_status ||
                    computeRoomDisplayStatus({ housekeeping: r.housekeeping }, [], false);
                  const floorNum = r.floor ?? suggestFloor(r.room_number) ?? 0;

                  return (
                    <TableRow
                      key={r.room_id}
                      className={`${r.is_hidden ? 'opacity-50' : ''} ${
                        isChecked ? 'bg-[#FDF7EE]' : ''
                      }`}
                    >
                      {currentUser.role === 'admin' && (
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectRoom(r.room_id)}
                            className="accent-[#B4532A] cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-2.5 px-3 font-mono text-sm font-bold text-[#1C1917]">
                        <div className="flex items-center gap-1.5">
                          <span>{r.room_number}</span>
                          {!r.lock_id && (
                            <Badge variant="warning" size="sm">
                              Chưa gắn khóa
                            </Badge>
                          )}
                          {r.is_hidden && (
                            <span className="text-[10px] text-[#78716C] font-normal font-sans">
                              (ẩn)
                            </span>
                          )}
                        </div>
                        {r.note && currentUser.role === 'admin' && (
                          <div
                            className="font-sans text-[10px] text-[#78716C] italic mt-0.5 max-w-[200px] truncate"
                            title={r.note}
                          >
                            📝 {r.note}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-xs text-[#44403C]">
                        {floorNum}
                      </td>
                      {currentUser.role === 'admin' && (
                        <td className="py-2.5 px-3 text-xs text-[#44403C]">
                          {r.room_group_name ? (
                            <span className="px-1.5 py-0.5 bg-[#F4F2EE] border border-[#E5E0D8] rounded text-[11px] font-medium text-[#78716C]">
                              {r.room_group_name}
                            </span>
                          ) : (
                            <span className="text-[#A8A29E] italic">—</span>
                          )}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-xs text-[#1C1917] font-medium">
                        {r.room_type_name}
                      </td>
                      <td className="py-2.5 px-3 text-xs">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {r.feature_ids && r.feature_ids.length > 0 ? (
                            r.feature_ids.slice(0, 3).map((fId) => {
                              const f = roomFeatures.find((item) => item.id === fId);
                              return (
                                <span
                                  key={fId}
                                  className="px-1.5 py-0.5 bg-[#FAF9F7] border border-[#E5E0D8] rounded text-[10px] text-[#44403C]"
                                >
                                  {f ? f.name : `#${fId}`}
                                </span>
                              );
                            })
                          ) : r.special_features ? (
                            <span className="text-[11px] text-[#9C5B14] truncate">
                              ✦ {r.special_features}
                            </span>
                          ) : (
                            <span className="text-[#A8A29E] italic">—</span>
                          )}
                          {r.feature_ids && r.feature_ids.length > 3 && (
                            <span className="text-[10px] text-[#78716C]">
                              +{r.feature_ids.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {renderDisplayStatusBadge(displayStatus)}
                        {r.housekeeping && (
                          <div className="text-[10px] text-[#78716C] mt-0.5 font-sans">
                            {r.housekeeping === 'clean' ? '🧼 Đã dọn sạch' : '🧹 Cần dọn phòng'}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-xs">
                        {r.lock_id ? (
                          <>
                            <div className="flex items-center gap-1 font-medium">
                              {r.lock_status === 'online' ? (
                                <>
                                  <IconWifi className="w-3.5 h-3.5 text-[#2A694E]" />
                                  <span className="text-[#2A694E]">Trực tuyến</span>
                                </>
                              ) : (
                                <>
                                  <IconWifiOff className="w-3.5 h-3.5 text-[#DC2626]" />
                                  <span className="text-[#DC2626]">Mất kết nối</span>
                                </>
                              )}
                            </div>
                            <div className="text-[10px] text-[#78716C] truncate max-w-[120px]">
                              {r.lock_name}
                            </div>
                          </>
                        ) : (
                          <span className="text-[#78716C] italic">Chưa gán khóa</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-xs">
                        {r.battery_level !== undefined ? (
                          <div
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                              r.battery_level < 20
                                ? 'bg-[#FDF2F2] text-[#DC2626] font-bold animate-pulse'
                                : 'text-[#44403C]'
                            }`}
                          >
                            <IconBattery className="w-3.5 h-3.5" level={r.battery_level} />
                            {r.battery_level}%
                          </div>
                        ) : (
                          <span className="text-[#78716C]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút đổi dọn dẹp housekeeping: Cả Admin và Manager đều bấm được */}
                          <button
                            type="button"
                            onClick={() => handleToggleHousekeeping(r)}
                            title={r.housekeeping === 'clean' ? 'Đổi sang Cần dọn dẹp' : 'Đánh dấu Đã dọn sạch'}
                            className={`px-2 py-1 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
                              r.housekeeping === 'dirty'
                                ? 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D] hover:bg-[#FDE68A]'
                                : 'bg-[#FAF9F7] text-[#44403C] border-[#E5E0D8] hover:bg-[#F0ECE1]'
                            }`}
                          >
                            {r.housekeeping === 'dirty' ? '🧹 Đã dọn xong' : 'Báo cần dọn'}
                          </button>

                          {/* Nút đặt bảo trì: Mở Modal quản lý bảo trì */}
                          {currentUser.role === 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setBlockModalTarget(r)}
                            >
                              Bảo trì
                            </Button>
                          )}

                          {/* Các nút chỉnh sửa / ẩn / xóa chỉ dành cho Admin */}
                          {currentUser.role === 'admin' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<IconEdit className="w-3.5 h-3.5" />}
                                onClick={() => {
                                  setIsNewRoom(false);
                                  setRoomForm({
                                    id: r.room_id,
                                    apartment_id: r.apartment_id,
                                    room_type_id: r.room_type_id,
                                    room_number: r.room_number,
                                    floor: r.floor ?? suggestFloor(r.room_number) ?? 1,
                                    room_group_id: r.room_group_id || null,
                                    note: r.note || '',
                                    status: (r.status as any) || 'available',
                                    initial_block_reason: '',
                                    feature_ids: r.feature_ids || [],
                                    special_features: r.special_features || '',
                                  });
                                  setShowRoomDrawer(true);
                                }}
                              >
                                Sửa
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={
                                  r.is_hidden ? (
                                    <IconEye className="w-3.5 h-3.5" />
                                  ) : (
                                    <IconEyeOff className="w-3.5 h-3.5" />
                                  )
                                }
                                onClick={() => handleHideRoom(r)}
                              >
                                {r.is_hidden ? 'Hiện' : 'Ẩn'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteRoom(r)}
                                className="text-[#DC2626] border-[#FCA5A5] hover:bg-[#FDF2F2]"
                              >
                                Xóa
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </TableRow>
                  );
                })
              )}
            </tbody>
          </TableContainer>
        </div>
      )}

      {/* ===== DRAWER: LOẠI PHÒNG ===== */}
      <Drawer
        isOpen={showRtDrawer}
        onClose={() => setShowRtDrawer(false)}
        title={
          isNewRt
            ? 'Thêm loại phòng mới'
            : currentUser.role === 'admin'
            ? 'Chỉnh sửa loại phòng'
            : 'Chi tiết loại phòng (Chỉ xem)'
        }
        footer={
          currentUser.role === 'admin' ? (
            <div className="flex justify-end gap-2 w-full">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowRtDrawer(false)}
                disabled={rtSaving}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveRoomType}
                disabled={rtSaving}
              >
                {rtSaving ? 'Đang lưu...' : 'Lưu loại phòng'}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="md" onClick={() => setShowRtDrawer(false)}>
              Đóng
            </Button>
          )
        }
      >
        <div className="space-y-4 text-xs">
          {isNewRt && (
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                Chi nhánh *
              </label>
              <select
                className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                value={rtForm.apartment_id}
                onChange={(e) => setRtForm({ ...rtForm, apartment_id: Number(e.target.value) })}
                disabled={currentUser.role === 'manager'}
              >
                <option value={0}>-- Chọn chi nhánh --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Input
            label="Tên loại phòng *"
            value={rtForm.name}
            disabled={currentUser.role === 'manager'}
            onChange={(e) => setRtForm({ ...rtForm, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Sức chứa tối đa (suất >15t)"
              type="number"
              value={rtForm.max_occupancy}
              disabled={currentUser.role === 'manager'}
              onChange={(e) => setRtForm({ ...rtForm, max_occupancy: Number(e.target.value) })}
            />
            <Input
              label="Cấu hình giường"
              value={rtForm.bed_config}
              disabled={currentUser.role === 'manager'}
              onChange={(e) => setRtForm({ ...rtForm, bed_config: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Giá cơ bản / đêm (đ)"
              type="number"
              value={rtForm.base_price}
              disabled={currentUser.role === 'manager'}
              onChange={(e) => setRtForm({ ...rtForm, base_price: Number(e.target.value) })}
            />
            <Input
              label="Diện tích (m²)"
              type="number"
              value={rtForm.area}
              disabled={currentUser.role === 'manager'}
              onChange={(e) => setRtForm({ ...rtForm, area: Number(e.target.value) })}
            />
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

      {/* ===== DRAWER NÂNG CẤP: THÊM / SỬA PHÒNG CỤ THỂ ===== */}
      <Drawer
        isOpen={showRoomDrawer}
        onClose={() => setShowRoomDrawer(false)}
        title={isNewRoom ? 'Thêm phòng mới' : 'Chỉnh sửa phòng'}
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowRoomDrawer(false)}
              disabled={roomSaving}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveRoom}
              disabled={roomSaving}
            >
              {roomSaving ? 'Đang lưu...' : 'Lưu phòng'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {/* 1. Chi nhánh */}
          {isNewRoom && (
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                Chi nhánh *
              </label>
              <select
                className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                value={roomForm.apartment_id}
                onChange={(e) => {
                  const bId = Number(e.target.value);
                  const avTypes = roomTypes.filter((rt) => rt.apartment_id === bId);
                  setRoomForm({
                    ...roomForm,
                    apartment_id: bId,
                    room_type_id: avTypes[0]?.id || 0,
                  });
                }}
              >
                <option value={0}>-- Chọn chi nhánh --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 2. Loại phòng (lọc theo chi nhánh) */}
          <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">
              Loại phòng *
            </label>
            <select
              className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
              value={roomForm.room_type_id}
              onChange={(e) =>
                setRoomForm({ ...roomForm, room_type_id: Number(e.target.value) })
              }
            >
              <option value={0}>-- Chọn loại phòng --</option>
              {roomTypes
                .filter(
                  (rt) => !roomForm.apartment_id || rt.apartment_id === roomForm.apartment_id
                )
                .map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} ({rt.bed_config || 'Tiêu chuẩn'})
                  </option>
                ))}
            </select>
          </div>

          {/* 3. Nhóm phòng vị trí (chọn 1, tuỳ chọn - chỉ Admin thấy) */}
          {currentUser.role === 'admin' && (
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                Nhóm phòng vị trí trong tòa nhà{' '}
                <span className="text-[#78716C] font-normal">(chỉ quản trị thấy, khách không thấy)</span>
              </label>
              <select
                className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                value={roomForm.room_group_id || 0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setRoomForm({ ...roomForm, room_group_id: val > 0 ? val : null });
                }}
              >
                <option value={0}>-- Không phân nhóm vị trí --</option>
                {roomGroups
                  .filter((g) => g.is_active)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* 4. Số phòng & Tầng */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Số phòng (mã phòng) *"
                value={roomForm.room_number}
                onChange={(e) => handleRoomNumberChange(e.target.value)}
                placeholder="VD: 203, P102"
              />
            </div>
            <div>
              <Input
                label="Tầng *"
                type="number"
                value={roomForm.floor}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, floor: Number(e.target.value) })
                }
                placeholder="VD: 2"
              />
              <span className="text-[10px] text-[#78716C] block mt-0.5">
                Tự động suy từ số phòng, có thể sửa.
              </span>
            </div>
          </div>

          {/* 5. Đặc điểm phòng (chọn nhiều, chia theo 4 danh mục) */}
          <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">
              Đặc điểm phòng (khách và admin đều thấy)
            </label>
            <div className="space-y-2 p-2.5 bg-[#FAF8F5] border border-[#E5E0D8] rounded-[6px]">
              {['view', 'sunlight', 'comfort', 'amenity'].map((catKey) => {
                const featsInCat = roomFeatures.filter(
                  (f) => f.category === catKey && f.is_active
                );
                if (featsInCat.length === 0) return null;
                const catTitleMap: Record<string, string> = {
                  view: 'Tầm nhìn (view)',
                  sunlight: 'Ánh sáng / Gió',
                  comfort: 'Độ thoáng & Tiện nghi',
                  amenity: 'Tiện ích trong phòng',
                };
                return (
                  <div key={catKey}>
                    <span className="text-[11px] font-bold text-[#78716C] block mb-1">
                      {catTitleMap[catKey]}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {featsInCat.map((f) => {
                        const isSelected = roomForm.feature_ids.includes(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => handleToggleRoomFeature(f.id)}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#B4532A] text-white border-[#B4532A]'
                                : 'bg-white text-[#44403C] border-[#E5E0D8] hover:bg-[#F0ECE1]'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {f.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. Ghi chú nội bộ */}
          <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">
              Ghi chú nội bộ{' '}
              <span className="text-[#78716C] font-normal">(chỉ quản trị thấy, vd: gần thang máy)</span>
            </label>
            <textarea
              className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A] resize-none"
              rows={2}
              placeholder="VD: Cửa sổ mở ra giếng trời, gần kho dọn phòng..."
              value={roomForm.note}
              onChange={(e) => setRoomForm({ ...roomForm, note: e.target.value })}
            />
          </div>

          {/* 7. Trạng thái ban đầu & Lý do bảo trì */}
          {isNewRoom && (
            <div className="space-y-2 p-2.5 bg-white border border-[#E5E0D8] rounded-[6px]">
              <div>
                <label className="block text-xs font-medium text-[#44403C] mb-1">
                  Trạng thái ban đầu
                </label>
                <select
                  className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                  value={roomForm.status}
                  onChange={(e) =>
                    setRoomForm({
                      ...roomForm,
                      status: e.target.value as 'available' | 'maintenance',
                    })
                  }
                >
                  <option value="available">🟢 Sẵn sàng (available)</option>
                  <option value="maintenance">🔴 Bảo trì (maintenance)</option>
                </select>
              </div>

              {roomForm.status === 'maintenance' && (
                <div>
                  <label className="block text-xs font-medium text-[#DC2626] mb-1">
                    Lý do bảo trì ban đầu *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Đang sửa khóa thông minh, chờ lắp nệm mới..."
                    value={roomForm.initial_block_reason}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, initial_block_reason: e.target.value })
                    }
                    className="w-full border border-[#FCA5A5] rounded-[6px] px-3 py-1.5 text-xs text-[#1C1917] bg-[#FEF2F2] focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Drawer>

      {/* ===== MODAL: TẠO NHIỀU PHÒNG THEO NHÓM (3 BƯỚC) ===== */}
      <BatchCreateModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        currentUserRole={currentUser.role}
        effectiveBranchId={effectiveBranchId}
        branches={branches}
        roomTypes={roomTypes}
        roomGroups={roomGroups}
        roomFeatures={roomFeatures}
        existingRooms={rooms}
        onSuccess={(count) => {
          loadRooms();
          loadRoomTypes();
        }}
        onShowToast={onShowToast}
      />

      {/* ===== MODAL: QUẢN LÝ BẢO TRÌ THEO KHOẢNG NGÀY ===== */}
      <RoomBlockModal
        isOpen={Boolean(blockModalTarget)}
        onClose={() => setBlockModalTarget(null)}
        room={blockModalTarget}
        currentUserRole={currentUser.role}
        onSuccess={() => loadRooms()}
        onShowToast={onShowToast}
      />

      {/* ===== MODAL: CÀI ĐẶT NHÓM PHÒNG & ĐẶC ĐIỂM (ADMIN) ===== */}
      <ManageGroupsFeaturesModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        currentUserRole={currentUser.role}
        roomGroups={roomGroups}
        roomFeatures={roomFeatures}
        onRefreshData={() => {
          loadGroupsAndFeatures();
          loadRooms();
        }}
        onShowToast={onShowToast}
      />

      {/* ===== MODAL: GÁN HÀNG LOẠT (BULK ASSIGN) ===== */}
      {bulkModalType && (
        <BulkAssignModal
          isOpen={Boolean(bulkModalType)}
          onClose={() => setBulkModalType(null)}
          type={bulkModalType}
          selectedRoomIds={selectedRoomIds}
          roomGroups={roomGroups}
          roomFeatures={roomFeatures}
          currentUserRole={currentUser.role}
          onSuccess={() => {
            setSelectedRoomIds([]);
            loadRooms();
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
