import React, { useState } from 'react';
import { Modal, Button, Badge } from '../../AdminUI';
import {
  adminApi,
  RoomGroupItem,
  RoomFeatureItem,
  StaffRole,
} from '../../../../services/adminService';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'group' | 'features';
  selectedRoomIds: number[];
  roomGroups: RoomGroupItem[];
  roomFeatures: RoomFeatureItem[];
  currentUserRole: StaffRole;
  onSuccess: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const BulkAssignModal: React.FC<BulkAssignModalProps> = ({
  isOpen,
  onClose,
  type,
  selectedRoomIds,
  roomGroups,
  roomFeatures,
  currentUserRole,
  onSuccess,
  onShowToast,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [addFeatureIds, setAddFeatureIds] = useState<number[]>([]);
  const [removeFeatureIds, setRemoveFeatureIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (selectedRoomIds.length === 0) return;
    setSubmitting(true);
    try {
      if (type === 'group') {
        await adminApi.bulkAssignGroup(
          { room_ids: selectedRoomIds, room_group_id: selectedGroupId },
          currentUserRole
        );
        onShowToast(`Đã gán nhóm phòng cho ${selectedRoomIds.length} phòng!`, 'success');
      } else {
        await adminApi.bulkAssignFeatures(
          {
            room_ids: selectedRoomIds,
            add_feature_ids: addFeatureIds,
            remove_feature_ids: removeFeatureIds,
          },
          currentUserRole
        );
        onShowToast(`Đã cập nhật đặc điểm cho ${selectedRoomIds.length} phòng!`, 'success');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || err?.message || 'Lỗi khi thao tác hàng loạt.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAddFeature = (id: number) => {
    setAddFeatureIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
    // Nếu chọn add thì bỏ khỏi remove
    setRemoveFeatureIds((prev) => prev.filter((f) => f !== id));
  };

  const toggleRemoveFeature = (id: number) => {
    setRemoveFeatureIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
    // Nếu chọn remove thì bỏ khỏi add
    setAddFeatureIds((prev) => prev.filter((f) => f !== id));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        type === 'group'
          ? `Gán Nhóm phòng cho ${selectedRoomIds.length} phòng`
          : `Gán / Gỡ Đặc điểm cho ${selectedRoomIds.length} phòng`
      }
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="secondary" size="md" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button variant="primary" size="md" onClick={handleSave} disabled={submitting}>
            {submitting ? 'Đang lưu...' : 'Xác nhận áp dụng'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E0D8] rounded-[6px] text-[#78716C]">
          Thao tác sẽ được áp dụng cho <strong>{selectedRoomIds.length}</strong> phòng đang được chọn.
        </div>

        {/* TH1: GÁN NHÓM PHÒNG */}
        {type === 'group' && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#44403C]">
              Chọn Nhóm phòng vị trí:
            </label>
            <select
              value={selectedGroupId || 0}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSelectedGroupId(val > 0 ? val : null);
              }}
              className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
            >
              <option value={0}>-- Gỡ khỏi mọi nhóm vị trí (Không phân nhóm) --</option>
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

        {/* TH2: GÁN / GỠ ĐẶC ĐIỂM */}
        {type === 'features' && (
          <div className="space-y-3">
            <div>
              <span className="font-semibold text-[#166534] block mb-1">
                + Thêm đặc điểm vào các phòng:
              </span>
              <div className="flex flex-wrap gap-1.5 p-2 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[6px]">
                {roomFeatures
                  .filter((f) => f.is_active)
                  .map((f) => {
                    const isSelected = addFeatureIds.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleAddFeature(f.id)}
                        className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#16A34A] text-white border-[#16A34A]'
                            : 'bg-white text-[#166534] border-[#BBF7D0] hover:bg-[#DCFCE7]'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {f.name}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div>
              <span className="font-semibold text-[#991B1B] block mb-1">
                - Gỡ đặc điểm khỏi các phòng:
              </span>
              <div className="flex flex-wrap gap-1.5 p-2 bg-[#FEF2F2] border border-[#FECACA] rounded-[6px]">
                {roomFeatures
                  .filter((f) => f.is_active)
                  .map((f) => {
                    const isSelected = removeFeatureIds.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleRemoveFeature(f.id)}
                        className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#DC2626] text-white border-[#DC2626]'
                            : 'bg-white text-[#991B1B] border-[#FECACA] hover:bg-[#FEE2E2]'
                        }`}
                      >
                        {isSelected ? '✓ ' : '- '}
                        {f.name}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
