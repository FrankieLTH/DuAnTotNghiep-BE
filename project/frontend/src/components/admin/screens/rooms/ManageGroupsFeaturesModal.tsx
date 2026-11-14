import React, { useState } from 'react';
import { Modal, Button, Input, Badge } from '../../AdminUI';
import { IconPlus, IconEdit, IconCheck, IconX } from '../../AdminIcons';
import {
  adminApi,
  RoomGroupItem,
  RoomFeatureItem,
  StaffRole,
} from '../../../../services/adminService';

interface ManageGroupsFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: StaffRole;
  roomGroups: RoomGroupItem[];
  roomFeatures: RoomFeatureItem[];
  onRefreshData: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ManageGroupsFeaturesModal: React.FC<ManageGroupsFeaturesModalProps> = ({
  isOpen,
  onClose,
  currentUserRole,
  roomGroups,
  roomFeatures,
  onRefreshData,
  onShowToast,
}) => {
  const [tab, setTab] = useState<'groups' | 'features'>('groups');

  // Form thêm/sửa Nhóm phòng
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  // Form thêm/sửa Đặc điểm phòng
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureCategory, setNewFeatureCategory] = useState<'view' | 'sunlight' | 'comfort' | 'amenity'>('view');
  const [editingFeatureId, setEditingFeatureId] = useState<number | null>(null);
  const [editingFeatureName, setEditingFeatureName] = useState('');
  const [editingFeatureCategory, setEditingFeatureCategory] = useState<'view' | 'sunlight' | 'comfort' | 'amenity'>('view');

  const [saving, setSaving] = useState(false);

  // --- Handlers cho Nhóm phòng ---
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      onShowToast('Vui lòng nhập tên nhóm phòng.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await adminApi.createRoomGroup({ name: newGroupName.trim() }, currentUserRole);
      onShowToast(`Đã tạo nhóm phòng "${newGroupName.trim()}".`, 'success');
      setNewGroupName('');
      onRefreshData();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || err?.message || 'Lỗi khi tạo nhóm phòng.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGroup = async (id: number) => {
    if (!editingGroupName.trim()) {
      onShowToast('Tên nhóm không được để trống.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateRoomGroup(id, editingGroupName.trim(), currentUserRole);
      onShowToast('Đã cập nhật tên nhóm phòng.', 'success');
      setEditingGroupId(null);
      onRefreshData();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || err?.message || 'Lỗi khi cập nhật nhóm.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleGroup = async (id: number) => {
    try {
      const res = await adminApi.toggleRoomGroup(id, currentUserRole);
      onShowToast(res?.message || 'Đã đổi trạng thái nhóm phòng.', 'info');
      onRefreshData();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || err?.message || 'Lỗi khi đổi trạng thái.', 'error');
    }
  };

  // --- Handlers cho Đặc điểm phòng ---
  const handleCreateFeature = async () => {
    if (!newFeatureName.trim()) {
      onShowToast('Vui lòng nhập tên đặc điểm.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await adminApi.createRoomFeature(
        { name: newFeatureName.trim(), category: newFeatureCategory },
        currentUserRole
      );
      onShowToast(`Đã tạo đặc điểm "${newFeatureName.trim()}".`, 'success');
      setNewFeatureName('');
      onRefreshData();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || err?.message || 'Lỗi khi tạo đặc điểm.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFeature = async (id: number) => {
    if (!editingFeatureName.trim()) {
      onShowToast('Tên đặc điểm không được để trống.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateRoomFeature(
        id,
        { name: editingFeatureName.trim(), category: editingFeatureCategory },
        currentUserRole
      );
      onShowToast('Đã cập nhật đặc điểm.', 'success');
      setEditingFeatureId(null);
      onRefreshData();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || err?.message || 'Lỗi khi cập nhật đặc điểm.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeature = async (id: number) => {
    try {
      const res = await adminApi.toggleRoomFeature(id, currentUserRole);
      onShowToast(res?.message || 'Đã đổi trạng thái đặc điểm.', 'info');
      onRefreshData();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || err?.message || 'Lỗi khi đổi trạng thái.', 'error');
    }
  };

  const categoryLabels: Record<string, string> = {
    view: 'Tầm nhìn (view)',
    sunlight: 'Ánh sáng / Gió',
    comfort: 'Tiện nghi / Thoáng',
    amenity: 'Tiện ích trong phòng',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cài đặt Nhóm phòng & Đặc điểm (Admin)"
      maxWidth="2xl"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" size="md" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* TAB SWITCHER */}
        <div className="flex items-center gap-2 border-b border-[#E5E0D8] pb-2">
          <button
            type="button"
            onClick={() => setTab('groups')}
            className={`px-3 py-1.5 rounded font-semibold text-xs cursor-pointer transition-colors ${
              tab === 'groups'
                ? 'bg-[#B4532A] text-white'
                : 'bg-[#F4F2EE] text-[#44403C] hover:bg-[#EBE7E0]'
            }`}
          >
            🏢 Nhóm phòng vị trí ({roomGroups.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('features')}
            className={`px-3 py-1.5 rounded font-semibold text-xs cursor-pointer transition-colors ${
              tab === 'features'
                ? 'bg-[#B4532A] text-white'
                : 'bg-[#F4F2EE] text-[#44403C] hover:bg-[#EBE7E0]'
            }`}
          >
            ✨ Đặc điểm phòng ({roomFeatures.length})
          </button>
        </div>

        {/* ================= TAB 1: NHÓM PHÒNG ================= */}
        {tab === 'groups' && (
          <div className="space-y-3">
            <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E0D8] rounded-[6px] text-[#78716C] text-[11px]">
              Nhóm phòng thể hiện vị trí của phòng trong tòa nhà (VD: Phòng góc, Hành lang, Cuối dãy, Gần thang máy).
              <strong> Khách không thấy thông tin này</strong>, chỉ Admin và Quản lý thấy trong quản trị.
            </div>

            {/* FORM THÊM NHÓM */}
            <div className="flex items-center gap-2 p-2.5 bg-white border border-[#E5E0D8] rounded-[6px]">
              <input
                type="text"
                placeholder="Nhập tên nhóm phòng mới (VD: Ban công góc, Cạnh lễ tân)..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1 border border-[#E5E0D8] rounded px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
              />
              <Button
                variant="primary"
                size="sm"
                icon={<IconPlus className="w-3.5 h-3.5" />}
                onClick={handleCreateGroup}
                disabled={saving || !newGroupName.trim()}
              >
                Thêm nhóm
              </Button>
            </div>

            {/* DANH SÁCH NHÓM */}
            <div className="border border-[#E5E0D8] rounded-[6px] overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAF9F7] text-[#78716C] border-b border-[#E5E0D8]">
                  <tr>
                    <th className="py-2 px-3">Tên nhóm</th>
                    <th className="py-2 px-3 text-center">Trạng thái</th>
                    <th className="py-2 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D8]">
                  {roomGroups.map((g) => (
                    <tr key={g.id} className={!g.is_active ? 'opacity-50 bg-[#FAF9F7]' : ''}>
                      <td className="py-2 px-3 font-medium">
                        {editingGroupId === g.id ? (
                          <input
                            type="text"
                            value={editingGroupName}
                            onChange={(e) => setEditingGroupName(e.target.value)}
                            className="border border-[#B4532A] rounded px-2 py-1 text-xs w-full"
                          />
                        ) : (
                          g.name
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant={g.is_active ? 'success' : 'danger'} size="sm">
                          {g.is_active ? 'Đang dùng' : 'Tạm tắt'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {editingGroupId === g.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateGroup(g.id)}
                                className="text-[#16A34A] hover:bg-[#F0FDF4] p-1 rounded cursor-pointer"
                              >
                                <IconCheck className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingGroupId(null)}
                                className="text-[#DC2626] hover:bg-[#FEF2F2] p-1 rounded cursor-pointer"
                              >
                                <IconX className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingGroupId(g.id);
                                  setEditingGroupName(g.name);
                                }}
                                className="text-[#78716C] hover:text-[#1C1917] p-1 rounded cursor-pointer"
                                title="Sửa tên"
                              >
                                <IconEdit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleGroup(g.id)}
                                className={`text-[11px] px-2 py-0.5 rounded cursor-pointer border ${
                                  g.is_active
                                    ? 'text-[#DC2626] border-[#FECACA] hover:bg-[#FEF2F2]'
                                    : 'text-[#16A34A] border-[#BBF7D0] hover:bg-[#F0FDF4]'
                                }`}
                              >
                                {g.is_active ? 'Tắt' : 'Bật'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 2: ĐẶC ĐIỂM PHÒNG ================= */}
        {tab === 'features' && (
          <div className="space-y-3">
            <div className="p-2.5 bg-[#FAF8F5] border border-[#E5E0D8] rounded-[6px] text-[#78716C] text-[11px]">
              Đặc điểm là thứ khách trải nghiệm thực tế trong phòng (VD: View biển, Đón nắng sáng, Yên tĩnh, Ban công riêng).
              <strong> Mọi đặc điểm đều được khách nhìn thấy</strong> và tổng hợp theo loại phòng.
            </div>

            {/* FORM THÊM ĐẶC ĐIỂM */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2.5 bg-white border border-[#E5E0D8] rounded-[6px]">
              <input
                type="text"
                placeholder="Tên đặc điểm mới..."
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
                className="border border-[#E5E0D8] rounded px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
              />
              <select
                value={newFeatureCategory}
                onChange={(e) => setNewFeatureCategory(e.target.value as any)}
                className="border border-[#E5E0D8] rounded px-3 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
              >
                <option value="view">Tầm nhìn (view)</option>
                <option value="sunlight">Ánh sáng / Gió</option>
                <option value="comfort">Tiện nghi / Thoáng</option>
                <option value="amenity">Tiện ích trong phòng</option>
              </select>
              <Button
                variant="primary"
                size="sm"
                icon={<IconPlus className="w-3.5 h-3.5" />}
                onClick={handleCreateFeature}
                disabled={saving || !newFeatureName.trim()}
              >
                Thêm đặc điểm
              </Button>
            </div>

            {/* DANH SÁCH ĐẶC ĐIỂM */}
            <div className="border border-[#E5E0D8] rounded-[6px] overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAF9F7] text-[#78716C] border-b border-[#E5E0D8]">
                  <tr>
                    <th className="py-2 px-3">Tên đặc điểm</th>
                    <th className="py-2 px-3">Danh mục</th>
                    <th className="py-2 px-3 text-center">Trạng thái</th>
                    <th className="py-2 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D8]">
                  {roomFeatures.map((f) => (
                    <tr key={f.id} className={!f.is_active ? 'opacity-50 bg-[#FAF9F7]' : ''}>
                      <td className="py-2 px-3 font-medium">
                        {editingFeatureId === f.id ? (
                          <input
                            type="text"
                            value={editingFeatureName}
                            onChange={(e) => setEditingFeatureName(e.target.value)}
                            className="border border-[#B4532A] rounded px-2 py-1 text-xs w-full"
                          />
                        ) : (
                          f.name
                        )}
                      </td>
                      <td className="py-2 px-3 text-[#78716C]">
                        {editingFeatureId === f.id ? (
                          <select
                            value={editingFeatureCategory}
                            onChange={(e) => setEditingFeatureCategory(e.target.value as any)}
                            className="border border-[#B4532A] rounded px-2 py-1 text-xs"
                          >
                            <option value="view">Tầm nhìn (view)</option>
                            <option value="sunlight">Ánh sáng / Gió</option>
                            <option value="comfort">Tiện nghi / Thoáng</option>
                            <option value="amenity">Tiện ích trong phòng</option>
                          </select>
                        ) : (
                          categoryLabels[f.category] || f.category
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant={f.is_active ? 'success' : 'danger'} size="sm">
                          {f.is_active ? 'Đang bật' : 'Tạm tắt'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {editingFeatureId === f.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateFeature(f.id)}
                                className="text-[#16A34A] hover:bg-[#F0FDF4] p-1 rounded cursor-pointer"
                              >
                                <IconCheck className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingFeatureId(null)}
                                className="text-[#DC2626] hover:bg-[#FEF2F2] p-1 rounded cursor-pointer"
                              >
                                <IconX className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingFeatureId(f.id);
                                  setEditingFeatureName(f.name);
                                  setEditingFeatureCategory(f.category);
                                }}
                                className="text-[#78716C] hover:text-[#1C1917] p-1 rounded cursor-pointer"
                                title="Sửa"
                              >
                                <IconEdit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleFeature(f.id)}
                                className={`text-[11px] px-2 py-0.5 rounded cursor-pointer border ${
                                  f.is_active
                                    ? 'text-[#DC2626] border-[#FECACA] hover:bg-[#FEF2F2]'
                                    : 'text-[#16A34A] border-[#BBF7D0] hover:bg-[#F0FDF4]'
                                }`}
                              >
                                {f.is_active ? 'Tắt' : 'Bật'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
