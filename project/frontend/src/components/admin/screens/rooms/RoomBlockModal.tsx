import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Badge } from '../../AdminUI';
import { IconAlertTriangle, IconCheck, IconX, IconClock } from '../../AdminIcons';
import { adminApi, RoomItem, RoomBlockItem, StaffRole } from '../../../../services/adminService';

interface RoomBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomItem | null;
  currentUserRole: StaffRole;
  onSuccess: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const RoomBlockModal: React.FC<RoomBlockModalProps> = ({
  isOpen,
  onClose,
  room,
  currentUserRole,
  onSuccess,
  onShowToast,
}) => {
  const [blocks, setBlocks] = useState<RoomBlockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form đặt lịch bảo trì
  const [fromAt, setFromAt] = useState('');
  const [toAt, setToAt] = useState('');
  const [reason, setReason] = useState('');
  const [confirmNeeded, setConfirmNeeded] = useState(false);
  const [conflictBookings, setConflictBookings] = useState<any[]>([]);

  // Tải danh sách block của phòng
  useEffect(() => {
    if (isOpen && room) {
      setLoading(true);
      setConfirmNeeded(false);
      setConflictBookings([]);
      const nowStr = new Date().toISOString().slice(0, 16);
      setFromAt(nowStr);
      setToAt('');
      setReason('');

      adminApi
        .getRoomBlocks(room.room_id, currentUserRole)
        .then((data) => setBlocks(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, room, currentUserRole]);

  // Gửi tạo lịch bảo trì
  const handleCreateBlock = async (isConfirmed = false) => {
    if (!room) return;
    if (!reason.trim()) {
      onShowToast('Vui lòng nhập lý do bảo trì.', 'warning');
      return;
    }
    if (!fromAt) {
      onShowToast('Vui lòng chọn thời gian bắt đầu bảo trì.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        from_at: new Date(fromAt).toISOString(),
        to_at: toAt ? new Date(toAt).toISOString() : null,
        reason: reason.trim(),
        confirm: isConfirmed,
      };

      const res = await adminApi.createRoomBlock(room.room_id, payload, currentUserRole);

      if (res?.conflict && !isConfirmed) {
        setConfirmNeeded(true);
        setConflictBookings(res.affected_bookings || []);
        onShowToast(
          res.message || 'Phát hiện đơn trùng với lịch bảo trì. Cần xác nhận để tiếp tục.',
          'warning'
        );
        return;
      }

      onShowToast(`Đã thiết lập lịch bảo trì cho phòng ${room.room_number}.`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || err?.message || 'Lỗi khi tạo lịch bảo trì.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Gỡ lịch bảo trì
  const handleDeleteBlock = async (blockId: number) => {
    if (!room) return;
    try {
      await adminApi.deleteRoomBlock(room.room_id, blockId, currentUserRole);
      onShowToast('Đã gỡ lịch bảo trì phòng thành công.', 'success');
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      onSuccess();
    } catch (err: any) {
      onShowToast(err?.response?.data?.message || err?.message || 'Lỗi khi gỡ lịch bảo trì.', 'error');
    }
  };

  if (!room) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Quản lý bảo trì • Phòng ${room.room_number}`}
      maxWidth="lg"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="secondary" size="md" onClick={onClose} disabled={submitting}>
            Đóng
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => handleCreateBlock(confirmNeeded)}
            disabled={submitting}
          >
            {submitting
              ? 'Đang xử lý...'
              : confirmNeeded
              ? 'Xác nhận đặt bảo trì (dù có đơn trùng)'
              : 'Thiết lập bảo trì'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* DANH SÁCH LỊCH BẢO TRÌ ĐANG CÓ */}
        <div className="p-3 bg-[#FAF8F5] border border-[#E5E0D8] rounded-[8px] space-y-2">
          <span className="font-semibold text-[#1C1917] block">
            Lịch bảo trì hiện có ({blocks.length})
          </span>
          {loading ? (
            <div className="text-center py-4 text-[#78716C]">Đang tải...</div>
          ) : blocks.length === 0 ? (
            <div className="text-[#78716C] italic py-2">
              Phòng này hiện không có lịch bảo trì nào được ghi nhận.
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {blocks.map((b) => (
                <div
                  key={b.id}
                  className="p-2 bg-white border border-[#E5E0D8] rounded-[6px] flex items-center justify-between text-xs shadow-sm"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-[#B4532A] flex items-center gap-1.5">
                      <IconClock className="w-3.5 h-3.5" />
                      <span>{new Date(b.from_at).toLocaleString('vi-VN')}</span>
                      <span>→</span>
                      <span>
                        {b.to_at ? new Date(b.to_at).toLocaleString('vi-VN') : 'Chưa rõ ngày kết thúc'}
                      </span>
                    </div>
                    <div className="text-[#44403C]">Lý do: {b.reason}</div>
                    {b.created_by && (
                      <div className="text-[10px] text-[#78716C]">Bởi: {b.created_by}</div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteBlock(b.id)}
                    className="text-[#DC2626] border-[#FCA5A5] hover:bg-[#FDF2F2]"
                  >
                    Gỡ bỏ
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* THIẾT LẬP BẢO TRÌ MỚI */}
        <div className="space-y-3 p-3 bg-white border border-[#E5E0D8] rounded-[8px]">
          <span className="font-semibold text-sm text-[#1C1917] block">
            + Đặt lịch bảo trì mới
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                Từ ngày giờ *
              </label>
              <input
                type="datetime-local"
                value={fromAt}
                onChange={(e) => setFromAt(e.target.value)}
                className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#44403C] mb-1">
                Đến ngày giờ <span className="text-[#78716C] font-normal">(bỏ trống = chưa rõ ngày)</span>
              </label>
              <input
                type="datetime-local"
                value={toAt}
                onChange={(e) => setToAt(e.target.value)}
                className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#44403C] mb-1">
              Lý do bảo trì *
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Sửa điều hòa hỏng lốc, sơn lại tường ban công, thay khóa thông minh..."
              className="w-full border border-[#E5E0D8] rounded-[6px] px-3 py-1.5 text-xs text-[#1C1917] bg-white focus:outline-none focus:ring-1 focus:ring-[#B4532A] resize-none"
            />
          </div>

          {/* CẢNH BÁO ĐƠN TRÙNG (NẾU CÓ) */}
          {confirmNeeded && conflictBookings.length > 0 && (
            <div className="p-3 bg-[#FEF2F2] border border-[#F87171] rounded-[6px] space-y-2">
              <div className="font-bold text-[#DC2626] flex items-center gap-1.5">
                <IconAlertTriangle className="w-4 h-4" />
                Cảnh báo: Có {conflictBookings.length} đơn đặt phòng trùng khung giờ này!
              </div>
              <p className="text-[#991B1B] text-[11px]">
                Nếu tiếp tục đặt bảo trì, quản lý cần chủ động liên hệ đổi phòng cho khách.
              </p>
              <div className="max-h-28 overflow-y-auto space-y-1">
                {conflictBookings.map((cb, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 bg-white rounded border border-[#FECACA] flex justify-between items-center text-[11px]"
                  >
                    <span className="font-mono font-bold text-[#1C1917]">{cb.booking_code}</span>
                    <span className="text-[#78716C]">
                      {new Date(cb.booked_start_time).toLocaleDateString('vi-VN')} →{' '}
                      {new Date(cb.booked_end_time).toLocaleDateString('vi-VN')}
                    </span>
                    <Badge variant="warning" size="sm">
                      {cb.booking_status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
