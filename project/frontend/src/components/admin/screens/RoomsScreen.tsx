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
  RoomFeatureItem,
} from '../../../services/adminService';
import {
  suggestFloor,
  computeRoomDisplayStatus,
  normalizeRoomNumber,
} from '@shared/index';

import { RoomBlockModal } from './rooms/RoomBlockModal';
import { ManageGroupsFeaturesModal } from './rooms/ManageGroupsFeaturesModal';
import {getAmenities,AmenityItem} from '../../../services/dataService';
import api from '../../../services/api';

interface RoomsScreenProps {
  currentUser: AdminUser;
  selectedBranchId: number;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const emptyRoomTypeForm = {
  name: '',
  amenity_ids: [] as number[],
  apartment_id: 0,
  max_occupancy: 2,
  description: '',
  bed_config: '1 giường đôi',
  image_urls: [] as string[],
  is_active: true,
};

const emptyRoomForm = {
  apartment_id: 0,
  room_type_parent_id: 0,
  room_type_id: 0,
  room_number: '',
  room_quantity: 1,
  floor: 1,
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

  // ---- Room feature catalog ----
  const [roomFeatures, setRoomFeatures] = useState<RoomFeatureItem[]>([]);
  const [amenityCatalog,setAmenityCatalog] = useState<AmenityItem[]>([]);
  const [newAmenityName,setNewAmenityName] = useState('');
  const [newAmenityCategory,setNewAmenityCategory] = useState('Tiện nghi');
  const [savingAmenity,setSavingAmenity] = useState(false);
  useEffect(()=>{getAmenities().then(setAmenityCatalog).catch(()=>setAmenityCatalog([]));},[]);
  const addAmenity=async()=>{
    if(!newAmenityName.trim())return onShowToast('Nhập tên tiện ích trước khi thêm.','warning');
    setSavingAmenity(true);
    try{
      const {data}=await api.post('/admin/amenities',{name:newAmenityName.trim(),category:newAmenityCategory.trim()});
      setAmenityCatalog(await getAmenities());
      setRtForm(current=>({...current,amenity_ids:[...current.amenity_ids,Number(data.id)]}));
      setNewAmenityName('');
      onShowToast('Đã thêm tiện ích vào danh mục. Hãy lưu loại phòng để gắn tiện ích.','success');
    }catch(error:any){onShowToast(error?.response?.data?.message||'Chưa thêm được tiện ích.','error');}
    finally{setSavingAmenity(false);}
  };

  const loadGroupsAndFeatures = useCallback(async () => {
    try {
      const featuresData = await adminApi.getRoomFeatures(currentUser.role, false);
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
  const [variantEditor, setVariantEditor] = useState<{ id?: number; name: string; price: string } | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
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
  const [filterFeature, setFilterFeature] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ---- Tickbox chọn nhiều phòng ----
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);

  // ---- Modal states ----
  const [showManageModal, setShowManageModal] = useState(false);
  const [blockModalTarget, setBlockModalTarget] = useState<RoomItem | null>(null);

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
      const data = { ...rtForm, base_price: 0, image_urls: rtForm.image_urls.filter(url => url.trim()) };
      if (isNewRt) {
        const created = await adminApi.createRoomType(data, currentUser.role);
        if (created?.id) {
          setRtForm(current => ({ ...current, id: Number(created.id) }));
          setIsNewRt(false);
          onShowToast(`Đã thêm loại phòng "${rtForm.name}". Bạn có thể tạo biến thể bên dưới.`, 'success');
          await loadRoomTypes();
          return;
        }
        onShowToast(`Đã thêm loại phòng "${rtForm.name}"!`, 'success');
      } else if (rtForm.id) {
        const { id, apartment_id, ...updateData } = data;
        await adminApi.updateRoomType(rtForm.id, updateData, currentUser.role);
        onShowToast(`Đã cập nhật loại phòng "${rtForm.name}"!`, 'success');
      }
      setShowRtDrawer(false);
      setVariantEditor(null);
      await loadRoomTypes();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi lưu loại phòng.', 'error');
    } finally {
      setRtSaving(false);
    }
  };

  const saveRoomVariant = async () => {
    if (!rtForm.id || currentUser.role !== 'admin') return;
    const price = Number(variantEditor?.price.replace(/[.,\s]/g, '') || '');
    if (!variantEditor?.name.trim() || !Number.isSafeInteger(price) || price <= 0) {
      onShowToast('Nhập tên biến thể và giá mỗi đêm hợp lệ.', 'error');
      return;
    }
    setRtSaving(true);
    try {
      if (variantEditor.id) {
        await adminApi.updateRoomType(variantEditor.id, { name: variantEditor.name.trim(), base_price: price }, currentUser.role);
        onShowToast('Đã cập nhật biến thể.', 'success');
      } else {
        await adminApi.createRoomType({
          parent_id: rtForm.id,
          apartment_id: rtForm.apartment_id,
          name: variantEditor.name.trim(),
          base_price: price,
          max_occupancy: rtForm.max_occupancy,
          bed_config: rtForm.bed_config,
          is_active: true,
        }, currentUser.role);
        onShowToast('Đã thêm biến thể mới.', 'success');
      }
      setVariantEditor(null);
      await loadRoomTypes();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || 'Lỗi khi lưu biến thể.', 'error');
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

  const generateRoomNumbersPlan = (apartmentId: number, startFloor: number, count: number) => {
    const branchRooms = rooms.filter(room => room.apartment_id === apartmentId && !room.deleted_at);
    const parse = (value: string) => value.match(/^([A-Za-z-]*)(\d+)$/);
    const plan: Array<{ floor: number; roomNumbers: string[] }> = [];
    let remaining = Math.max(0, Math.min(100, Math.floor(count)));
    let floor = startFloor;
    let visitedFloors = 0;

    while (remaining > 0 && visitedFloors < 100) {
      visitedFloors++;
      const floorRooms = branchRooms.filter(room => Number(room.floor) > 0 ? Number(room.floor) === floor : Number(suggestFloor(room.room_number) ?? 0) === floor);
      const prefix = floorRooms.map(room => parse(room.room_number)?.[1]).find(Boolean)
        || branchRooms.map(room => parse(room.room_number)?.[1]).find(Boolean)
        || 'B';
      const floorStart = floor > 0 ? floor * 100 + 1 : 1;
      const floorEnd = floor * 100 + 20;
      const maxExisting = Math.max(0, ...floorRooms.map(room => {
        const match = parse(room.room_number);
        return match && match[1].toUpperCase() === prefix.toUpperCase() ? Number(match[2]) : 0;
      }));
      let nextNumber = maxExisting ? maxExisting + 1 : floorStart;

      while (nextNumber <= floorEnd && floorRooms.length + (plan.find(group => group.floor === floor)?.roomNumbers.length || 0) >= 20) {
        nextNumber = floorEnd + 1;
      }
      const capacityByCount = Math.max(0, 20 - floorRooms.length - (plan.find(group => group.floor === floor)?.roomNumbers.length || 0));
      const capacityByNumber = Math.max(0, floorEnd - nextNumber + 1);
      const allocate = Math.min(remaining, capacityByCount, capacityByNumber);

      if (allocate > 0) {
        const roomNumbers = Array.from({ length: allocate }, (_, index) => `${prefix}${String(nextNumber + index).padStart(3, '0')}`);
        const existingGroup = plan.find(group => group.floor === floor);
        if (existingGroup) existingGroup.roomNumbers.push(...roomNumbers);
        else plan.push({ floor, roomNumbers });
        remaining -= allocate;
      }
      if (remaining > 0) floor++;
    }

    return remaining === 0 ? plan : [];
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
        const count = Number(roomForm.room_quantity);
        if (!Number.isInteger(count) || count < 1 || count > 100 || !Number.isInteger(Number(roomForm.floor)) || Number(roomForm.floor) < 0) {
          onShowToast('Nhập số lượng từ 1 đến 100 và tầng hợp lệ.', 'error');
          return;
        }
        const roomPlan = generateRoomNumbersPlan(roomForm.apartment_id, Number(roomForm.floor), count);
        if (!roomPlan.length || roomPlan.reduce((total, group) => total + group.roomNumbers.length, 0) !== count) {
          onShowToast('Không thể phân bổ số phòng trong giới hạn 20 phòng mỗi tầng.', 'error');
          return;
        }
        await adminApi.newBatchCreateRooms({
          apartment_id: roomForm.apartment_id,
          default_status: roomForm.status,
          initial_block_reason: roomForm.initial_block_reason,
          groups: roomPlan.map(group => ({ label: `Tầng ${group.floor}`, parentRoomTypeId: roomForm.room_type_parent_id, roomTypeId: roomForm.room_type_id, roomNumbers: group.roomNumbers })),
        }, currentUser.role);
        onShowToast(`Đã tạo ${count} phòng trên ${roomPlan.length} tầng.`, 'success');
      } else if (roomForm.id) {
        if (!roomForm.room_number.trim()) {
          onShowToast('Vui lòng nhập số phòng.', 'error');
          return;
        }
        await adminApi.updateRoom(
          roomForm.id,
          {
            apartment_id: roomForm.apartment_id,
            room_type_id: roomForm.room_type_id,
            room_number: normalizeRoomNumber(roomForm.room_number),
            floor: Number(roomForm.floor),
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
  const selectableParents = useMemo(() => roomTypes.filter(parent => parent.is_active && (parent.variants || []).some(variant => variant.is_active)), [roomTypes]);
  const selectedParentType = roomTypes.find(parent => parent.id === roomForm.room_type_parent_id);
  const selectedParentVariants = (selectedParentType?.variants || []).filter(variant => variant.is_active);
  const roomNumberPreview = generateRoomNumbersPlan(roomForm.apartment_id, Number(roomForm.floor), Number(roomForm.room_quantity));

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
  }, [rooms, effectiveBranchId, filterFloor, filterFeature, filterStatus]);

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

          {false && currentUser.role === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManageModal(true)}
            >
              ⚙️ Đặc điểm & Phụ thu
            </Button>
          )}

          {currentUser.role === 'admin' && activeTab === 'types' && (
            <Button
              variant="primary"
              size="sm"
              icon={<IconPlus className="w-4 h-4" />}
              onClick={() => {
                setIsNewRt(true);
                setVariantEditor(null);
                setNewImageUrl('');
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
                variant="primary"
                size="sm"
                icon={<IconPlus className="w-4 h-4" />}
                onClick={() => {
                  setIsNewRoom(true);
                  const bId = effectiveBranchId > 0 ? effectiveBranchId : branches[0]?.id || 1;
                  const firstParent = selectableParents.find((parent) => parent.apartment_id === bId);
                  const firstVariant = firstParent?.variants?.find((variant) => variant.is_active);
                  setRoomForm({
                    ...emptyRoomForm,
                    apartment_id: bId,
                    room_type_parent_id: firstParent?.id || 0,
                    room_type_id: firstVariant?.id || 0,
                    room_number: '',
                    room_quantity: 1,
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
                    {rt.description && <div className="text-[11px] text-[#78716C] line-clamp-1 mt-0.5">{rt.description}</div>}
                  </td>
                  <td className="py-2.5 px-3.5 text-xs text-[#78716C]">{rt.apartment_name}</td>
                  <td className="py-2.5 px-3.5 text-xs"><strong>{rt.max_occupancy}</strong><span className="text-[#78716C]"> suất (&gt;15 tuổi)</span></td>
                  <td className="py-2.5 px-3.5 text-xs text-[#78716C]">{rt.bed_config || '?'}</td>
                  <td className="py-2.5 px-3.5 text-center font-mono font-bold text-xs text-[#1C1917]">{rt.total_rooms} phòng</td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-xs font-bold text-[#B4532A] tabular-nums">
                    {rt.variants?.length ? `Từ ${formatMoney(Math.min(...rt.variants.map(variant => Number(variant.base_price))))}` : 'Chưa có biến thể'}
                  </td>
                  <td className="py-2.5 px-3.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" icon={<IconEdit className="w-3.5 h-3.5" />} onClick={() => {
                        setIsNewRt(false);
                        setVariantEditor(null);
                        setNewImageUrl('');
                        setRtForm({
                          id: rt.id,
                          name: rt.name,
                          amenity_ids: (rt.amenities || []).map(amenity => amenity.id),
                          apartment_id: rt.apartment_id,
                          max_occupancy: rt.max_occupancy,
                          description: rt.description || '',
                          bed_config: rt.bed_config || '',
                          image_urls: Array.isArray(rt.images) ? rt.images.map(image => typeof image === 'string' ? image : (image as any).image_url) : [],
                          is_active: rt.is_active,
                        });
                        setShowRtDrawer(true);
                      }}>{currentUser.role === 'admin' ? 'Sửa' : 'Xem'}</Button>
                      {currentUser.role === 'admin' && <>
                        <Button variant="outline" size="sm" onClick={async () => {
                          try {
                            if (rt.is_active) await adminApi.hideRoomType(rt.id, currentUser.role);
                            else await adminApi.updateRoomType(rt.id, { is_active: true }, currentUser.role);
                            onShowToast(rt.is_active ? 'Đã ngừng bán loại phòng.' : 'Đã mở bán lại loại phòng.', 'success');
                            await loadRoomTypes();
                          } catch (err: any) { onShowToast(err?.response?.data?.message || 'Không thể cập nhật trạng thái loại phòng.', 'error'); }
                        }}>{rt.is_active ? 'Ẩn' : 'Hiện'}</Button>
                        <Button variant="outline" size="sm" onClick={async () => {
                          if (!window.confirm(`Xóa loại phòng “${rt.name}”? Chỉ xóa được khi chưa có phòng hoặc đơn tham chiếu.`)) return;
                          try {
                            await adminApi.deleteRoomType(rt.id, currentUser.role);
                            onShowToast('Đã xóa loại phòng.', 'success');
                            await loadRoomTypes();
                          } catch (err: any) { onShowToast(err?.response?.data?.message || 'Không thể xóa loại phòng.', 'error'); }
                        }}>Xóa</Button>
                      </>}
                    </div>
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
                <span className="flex items-center gap-1">🔴 Bảo trì</span>
                <span>&gt;</span>
                <span className="flex items-center gap-1">🔵 Đang lưu trú</span>
                <span>&gt;</span>
                <span className="flex items-center gap-1">🟡 Cần dọn dẹp</span>
                <span>&gt;</span>
                <span className="flex items-center gap-1">🟢 Sẵn sàng</span>
              </div>

              {/* THANH HÀNH ĐỘNG HÀNG LOẠT KHI TICK CHỌN */}
              {currentUser.role === 'admin' && selectedRoomIds.length > 0 && (
                <div className="flex items-center gap-2 bg-[#FDF7EE] border border-[#F7DCB4] px-2.5 py-1 rounded-[4px] animate-fade-in">
                  <span className="text-xs font-semibold text-[#9C5B14]">
                    Đã tick {selectedRoomIds.length} phòng:
                  </span>

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



              {false && <div className="flex items-center gap-1.5">
                <span className="text-[#78716C] font-medium">Đặc điểm:</span>
                <select
                  value={filterFeature}
                  onChange={(e) => setFilterFeature(e.target.value)}
                  className="bg-[#FAF9F7] border border-[#E5E0D8] rounded px-2 py-1 text-xs text-[#1C1917] focus:outline-none"
                >
                  <option value="all">Tất cả đặc điểm</option>
                  {roomFeatures.map((f) => (
                    <option key={f.id} value={String(f.id)}>
                      {f.name}{Number(f.extra_price_per_night||0)>0?` (+${Number(f.extra_price_per_night).toLocaleString('vi-VN')}đ/đêm)`:''}
                    </option>
                  ))}
                </select>
              </div>}

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

              {(filterFloor !== 'all' || filterFeature !== 'all' || filterStatus !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterFloor('all');
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

                <th className="py-3 px-3">Loại phòng</th>
                <th className="py-3 px-3">Biến thể</th>
                <th className="py-3 px-3 text-center">Trạng thái tính toán</th>
                <th className="py-3 px-3">Khóa TTLock</th>
                <th className="py-3 px-3 text-center">Pin</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </TableHeader>
            <tbody>
              {roomsLoading ? (
                <tr>
                  <td colSpan={currentUser.role === 'admin' ? 9 : 7} className="py-10 text-center text-xs text-[#78716C]">
                    Đang tải danh sách phòng...
                  </td>
                </tr>
              ) : filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={currentUser.role === 'admin' ? 9 : 7} className="py-10 text-center text-xs text-[#78716C]">
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

                      <td className="py-2.5 px-3 text-xs text-[#1C1917] font-medium">
                        {r.room_type_name}
                      </td>
                      <td className="py-2.5 px-3 text-xs">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          <span className="text-[11px] text-[#9C5B14]">{r.variant_name || 'Tiêu chuẩn'}</span>
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
                                    room_type_parent_id: roomTypes.find(parent => (parent.variants || []).some(variant => variant.id === r.room_type_id))?.id || 0,
                                    room_number: r.room_number,
                                    room_quantity: 1,
                                    floor: r.floor ?? suggestFloor(r.room_number) ?? 1,
                                    
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
        onClose={() => { setShowRtDrawer(false); setVariantEditor(null); }}
        title={isNewRt ? 'Thêm loại phòng' : currentUser.role === 'admin' ? 'Chỉnh sửa loại phòng' : 'Chi tiết loại phòng'}
        footer={currentUser.role === 'admin' ? (
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" size="md" onClick={() => { setShowRtDrawer(false); setVariantEditor(null); }} disabled={rtSaving}>Đóng</Button>
            <Button variant="primary" size="md" onClick={handleSaveRoomType} disabled={rtSaving}>{rtSaving ? 'Đang lưu…' : isNewRt ? 'Tạo loại phòng' : 'Lưu loại phòng'}</Button>
          </div>
        ) : <Button variant="outline" size="md" onClick={() => setShowRtDrawer(false)}>Đóng</Button>}
      >
        <div className="space-y-5 text-xs">
          {isNewRt && <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">Chi nhánh *</label>
            <select className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs bg-white" value={rtForm.apartment_id} onChange={e => setRtForm({ ...rtForm, apartment_id: Number(e.target.value) })} disabled={currentUser.role === 'manager'}>
              <option value={0}>-- Chọn chi nhánh --</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </div>}
          <Input label="Tên loại phòng *" value={rtForm.name} disabled={currentUser.role === 'manager'} onChange={e => setRtForm({ ...rtForm, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Sức chứa tối đa (>15 tuổi)" type="number" min={1} value={rtForm.max_occupancy} disabled={currentUser.role === 'manager'} onChange={e => setRtForm({ ...rtForm, max_occupancy: Number(e.target.value) })} />
            <Input label="Cấu hình giường" value={rtForm.bed_config} disabled={currentUser.role === 'manager'} onChange={e => setRtForm({ ...rtForm, bed_config: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">Mô tả phòng</label>
            <textarea className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs bg-white resize-y" rows={3} value={rtForm.description} disabled={currentUser.role === 'manager'} onChange={e => setRtForm({ ...rtForm, description: e.target.value })} />
          </div>
          <section className="space-y-3 border border-[#E5E0D8] rounded-xl p-4">
            <div><h3 className="font-semibold text-sm">Ảnh loại phòng</h3><p className="text-[11px] text-[#78716C] mt-1">Thêm URL ảnh, xem trước, chỉnh URL hoặc xóa ảnh.</p></div>
            {rtForm.image_urls.map((url, index) => <div key={`${index}-${url}`} className="flex gap-3 items-start border rounded-lg p-2">
              <div className="w-20 h-16 rounded overflow-hidden bg-[#F4F2EE] shrink-0">{url && <img src={url} alt={`Ảnh ${index + 1}`} className="w-full h-full object-cover" />}</div>
              <input type="url" value={url} disabled={currentUser.role === 'manager'} onChange={e => setRtForm(current => ({ ...current, image_urls: current.image_urls.map((image, i) => i === index ? e.target.value : image) }))} className="min-w-0 flex-1 border rounded px-2 py-2" placeholder="https://..." />
              {currentUser.role === 'admin' && <Button variant="outline" size="sm" onClick={() => setRtForm(current => ({ ...current, image_urls: current.image_urls.filter((_, i) => i !== index) }))}>Xóa</Button>}
            </div>)}
            {currentUser.role === 'admin' && <div className="flex gap-2"><input type="url" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="Dán URL ảnh mới" className="min-w-0 flex-1 border rounded px-3 py-2" /><Button variant="outline" size="sm" disabled={!newImageUrl.trim()} onClick={() => { setRtForm(current => ({ ...current, image_urls: [...current.image_urls, newImageUrl.trim()] })); setNewImageUrl(''); }}>Thêm ảnh</Button></div>}
          </section>
          <section className="space-y-3 border border-[#E5E0D8] rounded-xl p-4">
            <div><h3 className="font-semibold text-sm">Tiện ích</h3><p className="text-[11px] text-[#78716C] mt-1">Tiện ích được gắn ở loại phòng cha và dùng chung cho mọi biến thể.</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{amenityCatalog.map(amenity => <label key={amenity.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={rtForm.amenity_ids.includes(amenity.id)} disabled={currentUser.role !== 'admin'} onChange={e => setRtForm(current => ({ ...current, amenity_ids: e.target.checked ? [...current.amenity_ids, amenity.id] : current.amenity_ids.filter(id => id !== amenity.id) }))} />{amenity.name}</label>)}</div>
            {!amenityCatalog.length && <p className="text-[11px] text-[#78716C]">Danh mục tiện ích chưa có dữ liệu.</p>}
            {currentUser.role === 'admin' && <div className="flex flex-wrap gap-2 pt-2 border-t"><input value={newAmenityName} onChange={e => setNewAmenityName(e.target.value)} placeholder="Tên tiện ích mới" className="border rounded px-2 py-1 text-xs flex-1 min-w-32" /><input value={newAmenityCategory} onChange={e => setNewAmenityCategory(e.target.value)} placeholder="Nhóm" className="border rounded px-2 py-1 text-xs w-28" /><Button size="sm" variant="outline" onClick={addAmenity} disabled={savingAmenity}>{savingAmenity ? 'Đang thêm…' : 'Thêm tiện ích'}</Button></div>}
          </section>
          {!isNewRt && rtForm.id && <section className="space-y-3 border border-[#E5E0D8] rounded-xl p-4">
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-sm">Biến thể</h3><p className="text-[11px] text-[#78716C] mt-1">Mỗi biến thể có tên và giá riêng; tiện ích kế thừa từ loại phòng này.</p></div>{currentUser.role === 'admin' && <Button variant="primary" size="sm" icon={<IconPlus className="w-4 h-4" />} onClick={() => setVariantEditor({ name: '', price: '' })}>Thêm biến thể mới</Button>}</div>
            {(roomTypes.find(type => type.id === rtForm.id)?.variants || []).map(variant => <div key={variant.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
              <div><strong>{variant.name}</strong><div className="text-[11px] text-[#78716C] mt-1">{formatMoney(variant.base_price)}/đêm · {variant.total_rooms} phòng · {variant.is_active ? 'Đang bán' : 'Ngừng bán'}</div></div>
              {currentUser.role === 'admin' && <Button variant="outline" size="sm" onClick={() => setVariantEditor({ id: variant.id, name: variant.name, price: String(variant.base_price) })}>Sửa</Button>}
            </div>)}
            {!(roomTypes.find(type => type.id === rtForm.id)?.variants || []).length && <p className="text-xs text-[#78716C] border rounded-lg p-3">Loại phòng chưa có biến thể. Hãy thêm biến thể để có thể gán phòng và nhận đặt phòng.</p>}
            {variantEditor && <div className="space-y-3 bg-[#FAF8F5] border border-[#D9C6B8] rounded-xl p-4">
              <div className="font-semibold text-sm">{variantEditor.id ? 'Sửa biến thể' : 'Thêm biến thể mới'}</div>
              <Input label="Tên biến thể *" value={variantEditor.name} onChange={e => setVariantEditor(current => current ? { ...current, name: e.target.value } : current)} placeholder="Ví dụ: Tiêu chuẩn, View biển" />
              <Input label="Giá mỗi đêm (đ) *" type="number" min={1} value={variantEditor.price} onChange={e => setVariantEditor(current => current ? { ...current, price: e.target.value } : current)} helperText="Giá của biến thể; tiện ích dùng chung với loại phòng cha." />
              <div className="flex justify-end gap-2"><Button variant="secondary" size="sm" onClick={() => setVariantEditor(null)} disabled={rtSaving}>Hủy</Button><Button variant="primary" size="sm" onClick={saveRoomVariant} disabled={rtSaving}>{rtSaving ? 'Đang lưu…' : 'Lưu biến thể'}</Button></div>
            </div>}
          </section>}
        </div>
      </Drawer>

      <Drawer
        isOpen={showRoomDrawer}
        onClose={() => setShowRoomDrawer(false)}
        title={isNewRoom ? 'Thêm phòng cụ thể' : 'Chỉnh sửa phòng'}
        footer={<div className="flex justify-end gap-2 w-full"><Button variant="secondary" size="md" onClick={() => setShowRoomDrawer(false)} disabled={roomSaving}>Hủy</Button><Button variant="primary" size="md" onClick={handleSaveRoom} disabled={roomSaving}>{roomSaving ? 'Đang lưu…' : isNewRoom ? 'Tạo phòng' : 'Lưu phòng'}</Button></div>}
      >
        <div className="space-y-4 text-xs">
          {isNewRoom && <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">Chi nhánh *</label>
            <select className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 bg-white" value={roomForm.apartment_id} onChange={e => {
              const apartmentId = Number(e.target.value);
              const firstParent = selectableParents.find(parent => parent.apartment_id === apartmentId);
              const firstVariant = firstParent?.variants?.find(variant => variant.is_active);
              setRoomForm(current => ({ ...current, apartment_id: apartmentId, room_type_parent_id: firstParent?.id || 0, room_type_id: firstVariant?.id || 0 }));
            }}>
              <option value={0}>-- Chọn chi nhánh --</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </div>}
          {isNewRoom && <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">Loại phòng *</label>
            <select className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 bg-white" value={roomForm.room_type_parent_id} onChange={e => {
              const parentId = Number(e.target.value);
              const parent = selectableParents.find(item => item.id === parentId);
              const firstVariant = parent?.variants?.find(variant => variant.is_active);
              setRoomForm(current => ({ ...current, room_type_parent_id: parentId, room_type_id: firstVariant?.id || 0 }));
            }}>
              <option value={0}>-- Chọn loại phòng --</option>
              {selectableParents.filter(parent => parent.apartment_id === roomForm.apartment_id).map(parent => <option key={parent.id} value={parent.id}>{parent.name}</option>)}
            </select>
          </div>}
          <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">Biến thể loại phòng *</label>
            <select className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 bg-white" value={roomForm.room_type_id} onChange={e => setRoomForm(current => ({ ...current, room_type_id: Number(e.target.value) }))}>
              <option value={0}>-- Chọn loại phòng và biến thể --</option>
              {isNewRoom
                ? selectedParentVariants.map(variant => <option key={variant.id} value={variant.id}>{variant.name} · {formatMoney(variant.base_price)}/đêm</option>)
                : roomTypes.filter(parent => parent.is_active).map(parent => <optgroup key={parent.id} label={parent.name}>{(parent.variants || []).filter(variant => variant.is_active).map(variant => <option key={variant.id} value={variant.id}>{variant.name} · {formatMoney(variant.base_price)}/đêm</option>)}</optgroup>)}
            </select>
            {isNewRoom && <p className="mt-1 text-[10px] text-[#78716C]">Chỉ hiển thị biến thể đã khai báo cho loại phòng đang chọn.</p>}
          </div>
          {isNewRoom ? <div className="grid grid-cols-2 gap-3">
            <Input label="Số lượng phòng *" type="number" min={1} max={100} value={roomForm.room_quantity} onChange={e => setRoomForm(current => ({ ...current, room_quantity: Number(e.target.value) }))} />
            <Input label="Tầng *" type="number" min={0} value={roomForm.floor} onChange={e => setRoomForm(current => ({ ...current, floor: Number(e.target.value) }))} />
            <div className="col-span-2 rounded-lg border border-[#E5E0D8] bg-[#FAF8F5] p-3">
              <div className="font-semibold mb-1">Số phòng sẽ tự tạo</div>
              <div className="text-[#78716C] break-words">{roomNumberPreview.length ? roomNumberPreview.map(group => <div key={group.floor}><strong>Tầng {group.floor}:</strong> {group.roomNumbers.join(', ')}</div>) : 'Chọn chi nhánh, loại phòng, tầng và số lượng để xem mã phòng.'}</div>
              <p className="text-[10px] text-[#78716C] mt-1">M&#7895;i t&#7847;ng t&#7889;i &#273;a 20 ph&#242;ng; m&#227; m&#7899;i n&#7889;i ti&#7871;p s&#7889; l&#7899;n nh&#7845;t v&#224; ph&#7847;n c&#242;n l&#7841;i t&#7921; chuy&#7875;n sang t&#7847;ng k&#7871; ti&#7871;p.</p>
            </div>
          </div> : <div className="grid grid-cols-2 gap-3">
            <Input label="Số phòng (mã phòng) *" value={roomForm.room_number} onChange={e => handleRoomNumberChange(e.target.value)} placeholder="Ví dụ: B103" />
            <Input label="Tầng *" type="number" min={0} value={roomForm.floor} onChange={e => setRoomForm(current => ({ ...current, floor: Number(e.target.value) }))} />
          </div>}
          <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">Ghi chú nội bộ</label>
            <textarea className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 resize-y" rows={2} value={roomForm.note} onChange={e => setRoomForm(current => ({ ...current, note: e.target.value }))} placeholder="Ghi chú chỉ dành cho quản trị viên" />
          </div>
          {isNewRoom && <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">Trạng thái ban đầu</label>
            <select className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 bg-white" value={roomForm.status} onChange={e => setRoomForm(current => ({ ...current, status: e.target.value as 'available' | 'maintenance' }))}>
              <option value="available">Sẵn sàng</option><option value="maintenance">Bảo trì</option>
            </select>
            {roomForm.status === 'maintenance' && <Input label="Lý do bảo trì ban đầu *" value={roomForm.initial_block_reason} onChange={e => setRoomForm(current => ({ ...current, initial_block_reason: e.target.value }))} placeholder="Ví dụ: Đang sửa khóa cửa" />}
          </div>}
        </div>
      </Drawer>

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
        roomGroups={[]}
        roomFeatures={roomFeatures}
        onRefreshData={() => {
          loadGroupsAndFeatures();
          loadRooms();
        }}
        onShowToast={onShowToast}
      />

      {/* ===== MODAL: GÁN HÀNG LOẠT (BULK ASSIGN) ===== */}
    </div>
  );
};
