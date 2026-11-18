import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Input, Badge } from '../../AdminUI';
import { IconPlus, IconX, IconCheck, IconAlertTriangle, IconRefresh } from '../../AdminIcons';
import {
  adminApi,
  RoomTypeItem,
  RoomGroupItem,
  RoomFeatureItem,
  RoomItem,
  StaffRole,
} from '../../../../services/adminService';
import {
  parseRoomNumberInput,
  generateRoomNumbers,
  buildBatchPlan,
  suggestFloor,
  normalizeRoomNumber,
  BatchRoomGroup,
  BatchRoomPlan,
} from '@shared/index';

interface BatchCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: StaffRole;
  effectiveBranchId: number;
  branches: { id: number; name: string }[];
  roomTypes: RoomTypeItem[];
  roomGroups: RoomGroupItem[];
  roomFeatures: RoomFeatureItem[];
  existingRooms: RoomItem[];
  onSuccess: (newRoomsCount: number) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

interface GroupCardState {
  id: string;
  label: string;
  roomGroupId: number | string | null;
  roomTypeId: number;
  roomNumbersText: string;
  featureIds: number[];
  note: string;
}

export const BatchCreateModal: React.FC<BatchCreateModalProps> = ({
  isOpen,
  onClose,
  currentUserRole,
  effectiveBranchId,
  branches,
  roomTypes,
  roomGroups,
  roomFeatures,
  existingRooms,
  onSuccess,
  onShowToast,
}) => {
  // Wizard steps: 1: Cấu hình nhóm -> 2: Xem trước & kiểm tra -> 3: Hoàn tất
  const [step, setStep] = useState<1 | 2>(1);

  const [branchId, setBranchId] = useState<number>(() => {
    return effectiveBranchId > 0 ? effectiveBranchId : (branches[0]?.id || 1);
  });
  const [defaultStatus, setDefaultStatus] = useState<'available' | 'maintenance'>('available');
  const [commonFeatureIds, setCommonFeatureIds] = useState<number[]>([]);

  // Danh sách các thẻ nhóm
  const [groups, setGroups] = useState<GroupCardState[]>([
    {
      id: 'g-1',
      label: 'Nhóm 1',
      roomGroupId: null,
      roomTypeId: 0,
      roomNumbersText: '',
      featureIds: [],
      note: '',
    },
  ]);

  // Sub-popover: Sinh theo cấu hình tầng cho 1 nhóm
  const [showGenModal, setShowGenModal] = useState(false);
  const [genTargetGroupId, setGenTargetGroupId] = useState<string | null>(null);
  const [genPrefix, setGenPrefix] = useState('P');
  const [genFloorFrom, setGenFloorFrom] = useState(1);
  const [genFloorTo, setGenFloorTo] = useState(3);
  const [genPerFloor, setGenPerFloor] = useState(5);
  const [genStartIndex, setGenStartIndex] = useState(1);
  const [genSkip4, setGenSkip4] = useState(true);
  const [genSkip13, setGenSkip13] = useState(true);

  // Dry-run & validation state
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [planRooms, setPlanRooms] = useState<BatchRoomPlan[]>([]);
  const [validationErrors, setValidationErrors] = useState<
    Array<{ group: string; roomNumber: string; code: string; message: string }>
  >([]);

  // Lọc room types theo chi nhánh đã chọn
  const branchRoomTypes = useMemo(() => {
    return roomTypes.filter((rt) => rt.apartment_id === branchId);
  }, [roomTypes, branchId]);

  // Phân loại features theo 4 danh mục
  const categorizedFeatures = useMemo(() => {
    return {
      view: roomFeatures.filter((f) => f.category === 'view' && f.is_active),
      sunlight: roomFeatures.filter((f) => f.category === 'sunlight' && f.is_active),
      comfort: roomFeatures.filter((f) => f.category === 'comfort' && f.is_active),
      amenity: roomFeatures.filter((f) => f.category === 'amenity' && f.is_active),
    };
  }, [roomFeatures]);

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      const bId = effectiveBranchId > 0 ? effectiveBranchId : (branches[0]?.id || 1);
      setBranchId(bId);
      setDefaultStatus('available');
      setCommonFeatureIds([]);
      const avTypes = roomTypes.filter((rt) => rt.apartment_id === bId);
      setGroups([
        {
          id: 'g-1',
          label: 'Nhóm 1',
          roomGroupId: null,
          roomTypeId: avTypes[0]?.id || 0,
          roomNumbersText: '',
          featureIds: [],
          note: '',
        },
      ]);
      setValidationErrors([]);
      setPlanRooms([]);
    }
  }, [isOpen, effectiveBranchId, branches, roomTypes]);

  // Thêm nhóm mới
  const handleAddGroup = () => {
    const nextIdx = groups.length + 1;
    setGroups((prev) => [
      ...prev,
      {
        id: `g-${Date.now()}`,
        label: `Nhóm ${nextIdx}`,
        roomGroupId: null,
        roomTypeId: branchRoomTypes[0]?.id || 0,
        roomNumbersText: '',
        featureIds: [],
        note: '',
      },
    ]);
  };

  // Xóa nhóm
  const handleRemoveGroup = (id: string) => {
    if (groups.length <= 1) {
      onShowToast('Cần ít nhất một nhóm phòng.', 'warning');
      return;
    }
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  // Cập nhật trường của nhóm
  const handleUpdateGroup = (id: string, field: keyof GroupCardState, val: any) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: val } : g))
    );
  };

  // Toggle feature chung
  const toggleCommonFeature = (featId: number) => {
    setCommonFeatureIds((prev) =>
      prev.includes(featId) ? prev.filter((id) => id !== featId) : [...prev, featId]
    );
  };

  // Toggle feature riêng của nhóm
  const toggleGroupFeature = (groupId: string, featId: number) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const exists = g.featureIds.includes(featId);
        return {
          ...g,
          featureIds: exists
            ? g.featureIds.filter((id) => id !== featId)
            : [...g.featureIds, featId],
        };
      })
    );
  };

  // Áp dụng sinh theo cấu hình tầng vào nhóm
  const handleApplyGeneratedNumbers = () => {
    if (!genTargetGroupId) return;
    const skipList: string[] = [];
    if (genSkip4) skipList.push('4');
    if (genSkip13) skipList.push('13');

    const generated = generateRoomNumbers({
      prefix: genPrefix.trim(),
      floorFrom: Number(genFloorFrom),
      floorTo: Number(genFloorTo),
      perFloor: Number(genPerFloor),
      startIndex: Number(genStartIndex),
      skipNumbers: skipList,
    });

    handleUpdateGroup(genTargetGroupId, 'roomNumbersText', generated.join(', '));
    setShowGenModal(false);
    onShowToast(`Đã sinh ${generated.length} số phòng vào nhóm!`, 'info');
  };

  // Chuyển sang bước 2: Xem trước và gọi dry-run
  const handleGoToStep2 = async () => {
    // Kiểm tra sơ bộ các nhóm
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (!g.roomTypeId) {
        onShowToast(`Vui lòng chọn loại phòng cho ${g.label}.`, 'warning');
        return;
      }
      const parsed = parseRoomNumberInput(g.roomNumbersText, '');
      if (parsed.errors.length > 0) {
        onShowToast(`Lỗi cú pháp số phòng ở ${g.label}: ${parsed.errors[0]}`, 'error');
        return;
      }
      if (parsed.roomNumbers.length === 0) {
        onShowToast(`Vui lòng nhập ít nhất một số phòng cho ${g.label}.`, 'warning');
        return;
      }
    }

    setIsValidating(true);
    try {
      // Build batch payload
      const payloadGroups = groups.map((g) => {
        const parsed = parseRoomNumberInput(g.roomNumbersText, '');
        return {
          label: g.label,
          roomGroupId: g.roomGroupId || null,
          roomTypeId: g.roomTypeId,
          featureIds: g.featureIds,
          note: g.note,
          roomNumbers: parsed.roomNumbers,
        };
      });

      const payload = {
        apartment_id: branchId,
        default_status: defaultStatus,
        common_feature_ids: commonFeatureIds,
        groups: payloadGroups,
        dry_run: true,
      };

      const res = await adminApi.newBatchCreateRooms(payload, currentUserRole);
      setPlanRooms(res.plan || []);
      setValidationErrors(res.errors || []);
      setStep(2);
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || err?.message || 'Lỗi khi kiểm tra đợt phòng.', 'error');
    } finally {
      setIsValidating(false);
    }
  };

  // Lưu thật ở bước 2
  const handleConfirmSave = async () => {
    if (validationErrors.length > 0) {
      onShowToast('Vẫn còn lỗi trong danh sách xem trước. Vui lòng quay lại sửa trước khi tạo.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadGroups = groups.map((g) => {
        const parsed = parseRoomNumberInput(g.roomNumbersText, '');
        return {
          label: g.label,
          roomGroupId: g.roomGroupId || null,
          roomTypeId: g.roomTypeId,
          featureIds: g.featureIds,
          note: g.note,
          roomNumbers: parsed.roomNumbers,
        };
      });

      const payload = {
        apartment_id: branchId,
        default_status: defaultStatus,
        common_feature_ids: commonFeatureIds,
        groups: payloadGroups,
        dry_run: false,
      };

      const res = await adminApi.newBatchCreateRooms(payload, currentUserRole);
      onShowToast(res?.message || `Đã tạo thành công ${res.createdCount} phòng mới!`, 'success');
      onSuccess(res.createdCount || planRooms.length);
      onClose();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || err?.message || 'Lỗi khi tạo phòng hàng loạt.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper tìm tên loại phòng & nhóm phòng
  const getRoomTypeName = (typeId: number) => {
    return roomTypes.find((rt) => rt.id === typeId)?.name || `#${typeId}`;
  };
  const getRoomGroupName = (groupId?: number | string | null) => {
    if (!groupId) return '—';
    return roomGroups.find((rg) => rg.id === groupId)?.name || `#${groupId}`;
  };
  const getFeatureName = (featId: number) => {
    return roomFeatures.find((f) => f.id === featId)?.name || `#${featId}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Tạo nhiều phòng theo nhóm (Batch Rooms)"
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-[#78716C]">
            {step === 1 ? (
              <span>Bước 1/2: Thiết lập cấu hình chung & các nhóm phòng</span>
            ) : (
              <span>
                Bước 2/2: Xem trước {planRooms.length} phòng & kiểm tra lỗi
                {validationErrors.length > 0 && (
                  <strong className="text-[#DC2626] ml-2">
                    ({validationErrors.length} lỗi cần khắc phục)
                  </strong>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 2 && (
              <Button
                variant="outline"
                size="md"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
              >
                ← Quay lại sửa
              </Button>
            )}
            <Button
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isSubmitting || isValidating}
            >
              Hủy
            </Button>
            {step === 1 ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleGoToStep2}
                disabled={isValidating}
              >
                {isValidating ? 'Đang kiểm tra...' : 'Tiếp tục: Xem trước & Kiểm tra →'}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmSave}
                disabled={isSubmitting || validationErrors.length > 0}
              >
                {isSubmitting ? 'Đang lưu...' : `Xác nhận tạo ${planRooms.length} phòng`}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
        {/* ================= STEP 1: CẤU HÌNH NHÓM ================= */}
        {step === 1 && (
          <div className="space-y-4">
            {/* KHỐI CẤU HÌNH CHUNG CẢ ĐỢT */}
            <div className="p-3.5 bg-[#FAF8F5] border border-[#E5E0D8] rounded-[8px] space-y-3">
              <div className="font-semibold text-[#1C1917] flex items-center justify-between">
                <span className="text-[#B4532A]">1. Cấu hình chung cho cả đợt</span>
                <span className="text-[11px] text-[#78716C] font-normal">
                  Áp dụng cho mọi phòng được tạo
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1">
                    Chi nhánh *
                  </label>
                  <select
                    className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                    value={branchId}
                    onChange={(e) => {
                      const newB = Number(e.target.value);
                      setBranchId(newB);
                      const avTypes = roomTypes.filter((rt) => rt.apartment_id === newB);
                      setGroups((prev) =>
                        prev.map((g) => ({ ...g, roomTypeId: avTypes[0]?.id || 0 }))
                      );
                    }}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1">
                    Trạng thái mặc định ban đầu
                  </label>
                  <select
                    className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                    value={defaultStatus}
                    onChange={(e) => setDefaultStatus(e.target.value as any)}
                  >
                    <option value="available">🟢 Sẵn sàng (available)</option>
                    <option value="maintenance">🔴 Bảo trì (maintenance)</option>
                  </select>
                </div>
              </div>

              {/* ĐẶC ĐIỂM CHUNG CẢ ĐỢT */}
              <div>
                <label className="block text-xs font-medium text-[#44403C] mb-1">
                  Đặc điểm chung cả đợt (áp dụng cho tất cả các phòng)
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-[#E5E0D8] rounded-[6px]">
                  {roomFeatures.filter((f) => f.is_active).length === 0 ? (
                    <span className="text-[#78716C] italic text-[11px]">
                      Chưa có đặc điểm nào trong hệ thống.
                    </span>
                  ) : (
                    roomFeatures
                      .filter((f) => f.is_active)
                      .map((f) => {
                        const isSelected = commonFeatureIds.includes(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => toggleCommonFeature(f.id)}
                            className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#B4532A] text-white border-[#B4532A]'
                                : 'bg-[#FAF9F7] text-[#44403C] border-[#E5E0D8] hover:bg-[#F0ECE1]'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {f.name}{Number(f.extra_price_per_night||0)>0?` (+${Number(f.extra_price_per_night).toLocaleString('vi-VN')}đ/đêm)`:''}
                          </button>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            {/* DANH SÁCH CÁC THẺ NHÓM */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-[#1C1917]">
                  2. Danh sách các nhóm phòng ({groups.length} nhóm)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<IconPlus className="w-3.5 h-3.5" />}
                  onClick={handleAddGroup}
                >
                  Thêm nhóm phòng
                </Button>
              </div>

              {groups.map((group, idx) => {
                const parsed = parseRoomNumberInput(group.roomNumbersText, '');
                return (
                  <div
                    key={group.id}
                    className="p-3.5 bg-white border border-[#E5E0D8] rounded-[8px] space-y-3 shadow-sm relative"
                  >
                    <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#B4532A] text-xs">#{idx + 1}</span>
                        <input
                          type="text"
                          value={group.label}
                          onChange={(e) =>
                            handleUpdateGroup(group.id, 'label', e.target.value)
                          }
                          className="font-semibold text-xs text-[#1C1917] border-b border-dashed border-[#B4532A] focus:outline-none bg-transparent"
                          placeholder="Tên nhóm (VD: Dãy view biển)"
                        />
                      </div>
                      {groups.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGroup(group.id)}
                          className="text-[#DC2626] hover:bg-[#FDF2F2] p-1 rounded transition-colors cursor-pointer text-[11px] flex items-center gap-1"
                        >
                          <IconX className="w-3.5 h-3.5" /> Xóa nhóm
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#44403C] mb-1">
                          Loại phòng *
                        </label>
                        <select
                          className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                          value={group.roomTypeId}
                          onChange={(e) =>
                            handleUpdateGroup(group.id, 'roomTypeId', Number(e.target.value))
                          }
                        >
                          <option value={0}>-- Chọn loại phòng --</option>
                          {branchRoomTypes.map((rt) => (
                            <option key={rt.id} value={rt.id}>
                              {rt.name} ({rt.bed_config || 'Tiêu chuẩn'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Nhóm phòng (Chỉ admin thấy) */}
                      {currentUserRole === 'admin' && (
                        <div>
                          <label className="block text-xs font-medium text-[#44403C] mb-1">
                            Nhóm phòng vị trí (nội bộ, khách không thấy)
                          </label>
                          <input list="batch-room-group-names" value={group.roomGroupId || ''} onChange={e=>handleUpdateGroup(group.id,'roomGroupId',e.target.value||null)} placeholder="Nhập tên nhóm vị trí" maxLength={100} className="w-full border rounded px-2 py-1.5 text-xs" /><datalist id="batch-room-group-names">{roomGroups.map(g=><option key={g.id} value={g.name}/>)}</datalist>
                        </div>
                      )}
                    </div>

                    {/* Ô NHẬP SỐ PHÒNG */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-[#44403C]">
                          Số phòng *{' '}
                          <span className="text-[#78716C] font-normal">
                            (hỗ trợ đơn: "201, 203" hoặc dải: "202-209", tối đa 100 phòng)
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setGenTargetGroupId(group.id);
                            setShowGenModal(true);
                          }}
                          className="text-[#B4532A] hover:underline font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          ⚡ Sinh theo cấu hình tầng
                        </button>
                      </div>
                      <input
                        type="text"
                        value={group.roomNumbersText}
                        onChange={(e) =>
                          handleUpdateGroup(group.id, 'roomNumbersText', e.target.value)
                        }
                        placeholder="VD: 101-105, 108, 110-112"
                        className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A] font-mono"
                      />

                      {/* LIVE PREVIEW PHÂN TÍCH SỐ PHÒNG */}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        {parsed.errors.length > 0 ? (
                          <span className="text-[#DC2626] flex items-center gap-1">
                            <IconAlertTriangle className="w-3.5 h-3.5" /> {parsed.errors[0]}
                          </span>
                        ) : parsed.roomNumbers.length > 0 ? (
                          <span className="text-[#2A694E] font-medium flex items-center gap-1">
                            <IconCheck className="w-3.5 h-3.5" />
                            Đã nhận diện: {parsed.roomNumbers.length} phòng (
                            {parsed.roomNumbers.slice(0, 8).join(', ')}
                            {parsed.roomNumbers.length > 8 ? '...' : ''})
                          </span>
                        ) : (
                          <span className="text-[#78716C] italic">
                            Chưa có số phòng hợp lệ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ĐẶC ĐIỂM RIÊNG CỦA NHÓM */}
                    <div>
                      <label className="block text-xs font-medium text-[#44403C] mb-1">
                        Đặc điểm riêng của nhóm này
                      </label>
                      <div className="flex flex-wrap gap-1.5 p-2 bg-[#FAF9F7] border border-[#E5E0D8] rounded-[6px]">
                        {roomFeatures
                          .filter((f) => f.is_active && !commonFeatureIds.includes(f.id))
                          .map((f) => {
                            const isSelected = group.featureIds.includes(f.id);
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => toggleGroupFeature(group.id, f.id)}
                                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#2A694E] text-white border-[#2A694E]'
                                    : 'bg-white text-[#44403C] border-[#E5E0D8] hover:bg-[#F0ECE1]'
                                }`}
                              >
                                {isSelected ? '✓ ' : '+ '}
                                {f.name}{Number(f.extra_price_per_night||0)>0?` (+${Number(f.extra_price_per_night).toLocaleString('vi-VN')}đ/đêm)`:''}
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* GHI CHÚ NỘI BỘ CỦA NHÓM */}
                    <div>
                      <input
                        type="text"
                        value={group.note}
                        onChange={(e) =>
                          handleUpdateGroup(group.id, 'note', e.target.value)
                        }
                        placeholder="Ghi chú nội bộ cho nhóm này (vd: cạnh cầu thang thoát hiểm, gần kho chăn ga)"
                        className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= STEP 2: XEM TRƯỚC & KIỂM TRA ================= */}
        {step === 2 && (
          <div className="space-y-4">
            {/* THÔNG BÁO LỖI HOẶC THÀNH CÔNG */}
            {validationErrors.length > 0 ? (
              <div className="p-3 bg-[#FDF2F2] border border-[#F87171] rounded-[6px] space-y-1">
                <div className="font-bold text-[#DC2626] flex items-center gap-1.5">
                  <IconAlertTriangle className="w-4 h-4" /> Phát hiện{' '}
                  {validationErrors.length} lỗi cần giải quyết:
                </div>
                <ul className="list-disc list-inside text-xs text-[#991B1B] space-y-0.5">
                  {validationErrors.map((err, i) => (
                    <li key={i}>
                      {err.roomNumber !== '-' ? `Phòng ${err.roomNumber}: ` : ''}
                      {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-[6px] text-[#166534] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconCheck className="w-4 h-4 text-[#16A34A]" />
                  <span>
                    Tất cả <strong>{planRooms.length}</strong> phòng đều hợp lệ và sẵn
                    sàng tạo!
                  </span>
                </div>
                <Badge variant="success" size="sm">
                  Đã kiểm tra Dry-Run
                </Badge>
              </div>
            )}

            {/* BẢNG XEM TRƯỚC GỘP */}
            <div className="border border-[#E5E0D8] rounded-[8px] overflow-hidden">
              <div className="p-2.5 bg-[#F4F2EE] border-b border-[#E5E0D8] font-semibold text-xs text-[#1C1917] flex items-center justify-between">
                <span>Bảng danh sách phòng tổng hợp ({planRooms.length} phòng)</span>
                <span className="text-[11px] text-[#78716C] font-normal">
                  Đặc điểm = Chung cả đợt ∪ Riêng của nhóm
                </span>
              </div>
              <div className="overflow-x-auto max-h-[45vh]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#FAF9F7] text-[#78716C] border-b border-[#E5E0D8] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Số phòng</th>
                      <th className="py-2 px-3 text-center">Tầng</th>
                      <th className="py-2 px-3">Nhóm / Thẻ</th>
                      {currentUserRole === 'admin' && (
                        <th className="py-2 px-3">Vị trí (nhóm)</th>
                      )}
                      <th className="py-2 px-3">Loại phòng</th>
                      <th className="py-2 px-3">Đặc điểm gộp</th>
                      <th className="py-2 px-3">Ghi chú</th>
                      <th className="py-2 px-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E0D8]">
                    {planRooms.map((r, idx) => {
                      const hasError = validationErrors.some(
                        (e) => e.roomNumber === r.roomNumber
                      );
                      const groupObj = groups.find((g) => g.label === r.label);

                      return (
                        <tr
                          key={idx}
                          className={hasError ? 'bg-[#FEF2F2] text-[#991B1B]' : 'hover:bg-[#FAF9F7]'}
                        >
                          <td className="py-2 px-3 font-mono font-bold">
                            {r.roomNumber}
                            {hasError && (
                              <span className="text-[10px] text-[#DC2626] block font-sans font-normal">
                                (Lỗi trùng/cú pháp)
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-mono">
                            {r.floor ?? suggestFloor(r.roomNumber) ?? 0}
                          </td>
                          <td className="py-2 px-3 text-[#78716C]">{r.label}</td>
                          {currentUserRole === 'admin' && (
                            <td className="py-2 px-3">
                              {getRoomGroupName(r.roomGroupId)}
                            </td>
                          )}
                          <td className="py-2 px-3 font-medium">
                            {getRoomTypeName(r.roomTypeId)}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap gap-1">
                              {r.featureIds.length > 0 ? (
                                r.featureIds.map((fId) => (
                                  <span
                                    key={fId}
                                    className="px-1.5 py-0.5 bg-[#FAF9F7] border border-[#E5E0D8] rounded text-[10px] text-[#44403C]"
                                  >
                                    {getFeatureName(fId)}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[#A8A29E] italic text-[11px]">
                                  Không có
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-[#78716C] max-w-[150px] truncate">
                            {r.note || groupObj?.note || '—'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge
                              variant={defaultStatus === 'available' ? 'success' : 'danger'}
                              size="sm"
                            >
                              {defaultStatus === 'available' ? 'Sẵn sàng' : 'Bảo trì'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SUB-MODAL: SINH THEO CẤU HÌNH TẦNG CHO 1 NHÓM */}
      {showGenModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] p-4 max-w-md w-full shadow-xl space-y-3 border border-[#E5E0D8]">
            <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-2">
              <span className="font-bold text-sm text-[#1C1917]">
                ⚡ Sinh số phòng theo cấu hình tầng
              </span>
              <button
                type="button"
                onClick={() => setShowGenModal(false)}
                className="text-[#78716C] hover:text-[#1C1917]"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Tiền tố (prefix)"
                  value={genPrefix}
                  onChange={(e) => setGenPrefix(e.target.value)}
                  placeholder="VD: P, B, A"
                />
                <Input
                  label="Số bắt đầu mỗi tầng"
                  type="number"
                  value={genStartIndex}
                  onChange={(e) => setGenStartIndex(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Input
                  label="Từ tầng"
                  type="number"
                  value={genFloorFrom}
                  onChange={(e) => setGenFloorFrom(Number(e.target.value))}
                />
                <Input
                  label="Đến tầng"
                  type="number"
                  value={genFloorTo}
                  onChange={(e) => setGenFloorTo(Number(e.target.value))}
                />
                <Input
                  label="Số phòng / tầng"
                  type="number"
                  value={genPerFloor}
                  onChange={(e) => setGenPerFloor(Number(e.target.value))}
                />
              </div>

              <div className="p-2.5 bg-[#FAF9F7] rounded border border-[#E5E0D8] space-y-2">
                <span className="font-semibold text-[#44403C] block">
                  Quy tắc bỏ số (phong thủy):
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genSkip4}
                    onChange={(e) => setGenSkip4(e.target.checked)}
                    className="accent-[#B4532A]"
                  />
                  <span>Bỏ số chứa đuôi "4" (vd: 104, 204...)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genSkip13}
                    onChange={(e) => setGenSkip13(e.target.checked)}
                    className="accent-[#B4532A]"
                  />
                  <span>Bỏ số chứa đuôi "13" (vd: 113, 213...)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E0D8]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowGenModal(false)}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyGeneratedNumbers}
              >
                Áp dụng vào nhóm
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
