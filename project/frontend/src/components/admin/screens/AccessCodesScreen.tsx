import React, { useState } from 'react';
import {
  TableContainer,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Input,
  Drawer,
  ConfirmDialog,
  Modal,
} from '../AdminUI';
import {
  IconEye,
  IconEyeOff,
  IconRefresh,
  IconLock,
  IconUnlock,
  IconWifi,
  IconWifiOff,
  IconBattery,
  IconPlus,
} from '../AdminIcons';
import { AdminUser } from '../AdminLayout';

export interface AccessCodeItem {
  id: number;
  roomNumber: string;
  branchId: number;
  branchName: string;
  bookingCode: string;
  guestName: string;
  guestPhone: string;
  pin: string;
  validFrom: string;
  validTo: string;
  status: 'active' | 'sent' | 'expired' | 'revoked';
  lockStatus: 'online' | 'offline';
  batteryLevel: number;
  needsChangeToday?: boolean;
}

interface AccessCodesScreenProps {
  currentUser: AdminUser;
  selectedBranchId: number;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onLogAudit: (action: string, entity: string, oldValue: string, newValue: string) => void;
}

export const AccessCodesScreen: React.FC<AccessCodesScreenProps> = ({
  currentUser,
  selectedBranchId,
  onShowToast,
  onLogAudit,
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'change_today'>('active');

  // Track which PINs are currently unmasked: { [id]: boolean }
  const [unmaskedPins, setUnmaskedPins] = useState<Record<number, boolean>>({});

  // Confirmation state for unmasking PIN (Security & Audit requirement)
  const [showUnmaskConfirm, setShowUnmaskConfirm] = useState<boolean>(false);
  const [codeToUnmask, setCodeToUnmask] = useState<AccessCodeItem | null>(null);
  const [unmaskReason, setUnmaskReason] = useState<string>('');

  // Confirmation for Revoke
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<boolean>(false);
  const [codeToRevoke, setCodeToRevoke] = useState<AccessCodeItem | null>(null);
  const [revokeReason, setRevokeReason] = useState<string>('');

  // Edit Expiry Modal
  const [showEditExpiryModal, setShowEditExpiryModal] = useState<boolean>(false);
  const [codeToEditExpiry, setCodeToEditExpiry] = useState<AccessCodeItem | null>(null);
  const [newValidTo, setNewValidTo] = useState<string>('');

  const [codesList, setCodesList] = useState<AccessCodeItem[]>([
    {
      id: 1,
      roomNumber: 'P.201',
      branchId: 1,
      branchName: 'CN1: Triền Núi Nhỏ',
      bookingCode: 'BK-89021',
      guestName: 'Nguyễn Văn An',
      guestPhone: '0903123456',
      pin: '839201',
      validFrom: '03/11/2026 14:00',
      validTo: '04/11/2026 12:00',
      status: 'active',
      lockStatus: 'online',
      batteryLevel: 90,
      needsChangeToday: true, // checkout today!
    },
    {
      id: 2,
      roomNumber: 'P.104',
      branchId: 2,
      branchName: 'CN2: Bãi Trước',
      bookingCode: 'BK-89025',
      guestName: 'Trần Thị Mai',
      guestPhone: '0918765432',
      pin: '492019',
      validFrom: '02/11/2026 14:00',
      validTo: '04/11/2026 12:00',
      status: 'active',
      lockStatus: 'online',
      batteryLevel: 82,
      needsChangeToday: true, // checkout today!
    },
    {
      id: 3,
      roomNumber: 'P.301',
      branchId: 1,
      branchName: 'CN1: Triền Núi Nhỏ',
      bookingCode: 'BK-88914',
      guestName: 'Võ Quốc Huy',
      guestPhone: '0938112233',
      pin: '772183',
      validFrom: '06/11/2026 14:00',
      validTo: '08/11/2026 12:00',
      status: 'sent',
      lockStatus: 'online',
      batteryLevel: 88,
      needsChangeToday: false,
    },
    {
      id: 4,
      roomNumber: 'P.202',
      branchId: 2,
      branchName: 'CN2: Bãi Trước',
      bookingCode: 'BK-88019',
      guestName: 'Lê Hoàng Nam',
      guestPhone: '0982334455',
      pin: '109283',
      validFrom: '26/10/2026 14:00',
      validTo: '27/10/2026 12:00',
      status: 'revoked',
      lockStatus: 'offline', // Offline warning!
      batteryLevel: 14, // Low battery warning!
      needsChangeToday: false,
    },
  ]);

  // Branch filter
  const branchFilteredCodes = codesList.filter((c) => {
    if (currentUser.role === 'manager') {
      return c.branchId === (currentUser.branchId || 1);
    }
    if (selectedBranchId !== 0) {
      return c.branchId === selectedBranchId;
    }
    return true;
  });

  // Tab filter
  const displayCodes = branchFilteredCodes.filter((c) => {
    if (activeTab === 'change_today') {
      return c.needsChangeToday === true;
    }
    return c.status === 'active' || c.status === 'sent';
  });

  // Handle Unmasking with audit log
  const handleConfirmUnmask = () => {
    if (!codeToUnmask) return;

    setUnmaskedPins((prev) => ({ ...prev, [codeToUnmask.id]: true }));

    // Record Audit Log
    onLogAudit(
      'XEM_MA_PIN',
      `Phòng ${codeToUnmask.roomNumber} (${codeToUnmask.bookingCode})`,
      '••••••',
      codeToUnmask.pin
    );

    onShowToast(`Đã hiện mã PIN phòng ${codeToUnmask.roomNumber}. Thao tác đã được ghi vào Nhật ký.`);
    setCodeToUnmask(null);
    setShowUnmaskConfirm(false);
    setUnmaskReason('');
  };

  // Handle Revoke
  const handleConfirmRevoke = () => {
    if (!codeToRevoke) return;
    setCodesList((prev) =>
      prev.map((c) => (c.id === codeToRevoke.id ? { ...c, status: 'revoked' } : c))
    );

    onLogAudit(
      'THU_HOI_MA_PIN',
      `Phòng ${codeToRevoke.roomNumber} (${codeToRevoke.bookingCode})`,
      'active',
      'revoked'
    );

    onShowToast(`Đã vô hiệu hóa mã PIN phòng ${codeToRevoke.roomNumber}. Khóa thông minh đã cập nhật!`, 'warning');
    setCodeToRevoke(null);
    setShowRevokeConfirm(false);
    setRevokeReason('');
  };

  // Handle Resend
  const handleResendPin = (item: AccessCodeItem) => {
    onShowToast(`Đã gửi lại mã PIN ${item.pin} qua SMS & Email cho khách ${item.guestName}.`, 'success');
  };

  // Handle Generate New PIN
  const handleGenerateNewPin = (item: AccessCodeItem) => {
    const newPin = `${Math.floor(100000 + Math.random() * 900000)}`;
    setCodesList((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, pin: newPin, status: 'active' } : c))
    );

    onLogAudit(
      'CAP_MA_PIN_MOI',
      `Phòng ${item.roomNumber} (${item.bookingCode})`,
      item.pin,
      newPin
    );

    onShowToast(`Đã cấp mã PIN mới: ${newPin} cho phòng ${item.roomNumber}. Đã đồng bộ TTLock Gateway!`, 'success');
  };

  // Handle Save New Expiry
  const handleSaveExpiry = () => {
    if (!codeToEditExpiry || !newValidTo) return;
    setCodesList((prev) =>
      prev.map((c) => (c.id === codeToEditExpiry.id ? { ...c, validTo: newValidTo } : c))
    );

    onLogAudit(
      'GIA_HAN_MA_PIN',
      `Phòng ${codeToEditExpiry.roomNumber}`,
      codeToEditExpiry.validTo,
      newValidTo
    );

    onShowToast(`Đã cập nhật thời hạn mã PIN phòng ${codeToEditExpiry.roomNumber} đến ${newValidTo}.`, 'success');
    setShowEditExpiryModal(false);
    setCodeToEditExpiry(null);
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-[#E5E0D8] rounded-[6px]">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-[4px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'active'
                ? 'bg-[#B4532A] text-white'
                : 'bg-[#F4F2EE] text-[#44403C] hover:bg-[#EBE7E0]'
            }`}
          >
            Mã đang hiệu lực ({branchFilteredCodes.filter((c) => c.status === 'active' || c.status === 'sent').length})
          </button>

          <button
            onClick={() => setActiveTab('change_today')}
            className={`px-4 py-2 rounded-[4px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'change_today'
                ? 'bg-[#B4532A] text-white'
                : 'bg-[#F4F2EE] text-[#44403C] hover:bg-[#EBE7E0]'
            }`}
          >
            <span>Cần đổi mã hôm nay</span>
            <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-ping" />
          </button>
        </div>

        <div className="text-xs text-[#78716C]">
          Khóa kết nối qua TTLock Cloud Gateway • Tự động mã hóa
        </div>
      </div>

      {/* Table */}
      <TableContainer>
        <TableHeader>
          <tr>
            <th className="py-3 px-3.5">Phòng / Cơ sở</th>
            <th className="py-3 px-3.5">Mã booking</th>
            <th className="py-3 px-3.5">Người nhận mã</th>
            <th className="py-3 px-3.5">Mã PIN cửa</th>
            <th className="py-3 px-3.5">Hiệu lực từ &rarr; đến</th>
            <th className="py-3 px-3.5 text-center">Trạng thái mã</th>
            <th className="py-3 px-3.5">Tình trạng khóa</th>
            <th className="py-3 px-3.5 text-right">Thao tác</th>
          </tr>
        </TableHeader>
        <tbody>
          {displayCodes.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-12 text-center text-xs text-[#78716C]">
                Không có mã khóa nào trong danh sách này.
              </td>
            </tr>
          ) : (
            displayCodes.map((c) => {
              const isUnmasked = unmaskedPins[c.id] === true;

              return (
                <TableRow key={c.id}>
                  {/* Phòng */}
                  <td className="py-2.5 px-3.5 font-mono text-sm font-bold text-[#1C1917]">
                    {c.roomNumber}
                    <div className="text-[11px] font-normal text-[#78716C]">{c.branchName}</div>
                  </td>

                  {/* Mã booking */}
                  <td className="py-2.5 px-3.5 font-mono text-xs font-semibold text-[#B4532A]">
                    {c.bookingCode}
                  </td>

                  {/* Người nhận */}
                  <td className="py-2.5 px-3.5 text-xs text-[#1C1917]">
                    <div className="font-medium">{c.guestName}</div>
                    <div className="font-mono text-[11px] text-[#78716C]">{c.guestPhone}</div>
                  </td>

                  {/* Mã PIN (Masked with Audit unmask) */}
                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm tracking-widest text-[#1C1917]">
                        {isUnmasked ? c.pin : '••••••'}
                      </span>
                      <button
                        onClick={() => {
                          if (isUnmasked) {
                            setUnmaskedPins((prev) => ({ ...prev, [c.id]: false }));
                          } else {
                            setCodeToUnmask(c);
                            setShowUnmaskConfirm(true);
                          }
                        }}
                        className="p-1 hover:bg-[#F2EFE9] rounded text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer"
                        title={isUnmasked ? 'Ẩn mã' : 'Hiện mã (yêu cầu xác nhận & ghi log)'}
                      >
                        {isUnmasked ? (
                          <IconEyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <IconEye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Thời gian */}
                  <td className="py-2.5 px-3.5 text-xs text-[#44403C]">
                    <div>{c.validFrom}</div>
                    <div className="text-[#78716C]">&rarr; {c.validTo}</div>
                  </td>

                  {/* Trạng thái mã */}
                  <td className="py-2.5 px-3.5 text-center">
                    {c.status === 'active' && (
                      <Badge variant="success" size="sm">
                        Đang hiệu lực
                      </Badge>
                    )}
                    {c.status === 'sent' && (
                      <Badge variant="info" size="sm">
                        Đã gửi khách
                      </Badge>
                    )}
                    {c.status === 'revoked' && (
                      <Badge variant="danger" size="sm">
                        Đã vô hiệu
                      </Badge>
                    )}
                    {c.status === 'expired' && (
                      <Badge variant="neutral" size="sm">
                        Hết hạn
                      </Badge>
                    )}
                  </td>

                  {/* Tình trạng khóa (Wifi / Pin) */}
                  <td className="py-2.5 px-3.5 text-xs">
                    <div className="flex items-center gap-2">
                      {c.lockStatus === 'online' ? (
                        <span className="flex items-center gap-1 text-[#2A694E] font-medium">
                          <IconWifi className="w-3.5 h-3.5" /> Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#DC2626] font-medium">
                          <IconWifiOff className="w-3.5 h-3.5" /> Offline
                        </span>
                      )}

                      <span
                        className={`font-mono flex items-center gap-0.5 ${
                          c.batteryLevel < 20 ? 'text-[#DC2626] font-bold' : 'text-[#78716C]'
                        }`}
                      >
                        <IconBattery className="w-3.5 h-3.5" level={c.batteryLevel} />
                        {c.batteryLevel}%
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendPin(c)}
                        title="Gửi lại mã qua SMS/Email"
                      >
                        Gửi lại
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setCodeToEditExpiry(c);
                          setNewValidTo(c.validTo);
                          setShowEditExpiryModal(true);
                        }}
                        title="Sửa thời hạn hiệu lực"
                      >
                        Hạn dùng
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleGenerateNewPin(c)}
                        title="Cấp mã PIN ngẫu nhiên mới"
                      >
                        Cấp mới
                      </Button>

                      {c.status !== 'revoked' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setCodeToRevoke(c);
                            setShowRevokeConfirm(true);
                          }}
                          title="Vô hiệu hóa mã PIN ngay lập tức"
                        >
                          Vô hiệu
                        </Button>
                      )}
                    </div>
                  </td>
                </TableRow>
              );
            })
          )}
        </tbody>
      </TableContainer>

      {/* Confirmation Dialog for Unmasking PIN (Security & Audit requirement) */}
      <ConfirmDialog
        isOpen={showUnmaskConfirm}
        onClose={() => setShowUnmaskConfirm(false)}
        onConfirm={handleConfirmUnmask}
        title="Xác nhận hiển thị mã PIN khóa"
        message={`Hiển thị mã PIN của phòng ${codeToUnmask?.roomNumber} (Khách: ${codeToUnmask?.guestName}). Để bảo đảm an ninh, thao tác này sẽ ghi nhận trực tiếp vào Nhật ký thao tác (Audit Logs).`}
        confirmLabel="Hiện mã PIN"
        variant="primary"
        reasonRequired={true}
        reasonValue={unmaskReason}
        onReasonChange={setUnmaskReason}
      />

      {/* Confirmation Dialog for Revoke */}
      <ConfirmDialog
        isOpen={showRevokeConfirm}
        onClose={() => setShowRevokeConfirm(false)}
        onConfirm={handleConfirmRevoke}
        title="Vô hiệu hóa mã PIN khóa"
        message={`Bạn có chắc chắn muốn vô hiệu hóa mã PIN của phòng ${codeToRevoke?.roomNumber}? Khách sẽ không thể sử dụng mã này để mở cửa nữa.`}
        confirmLabel="Vô hiệu hóa ngay"
        variant="danger"
        reasonRequired={true}
        reasonValue={revokeReason}
        onReasonChange={setRevokeReason}
      />

      {/* Modal Edit Expiry */}
      <Modal
        isOpen={showEditExpiryModal}
        onClose={() => setShowEditExpiryModal(false)}
        title={`Chỉnh sửa thời hạn mã PIN - ${codeToEditExpiry?.roomNumber}`}
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" size="md" onClick={() => setShowEditExpiryModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="md" onClick={handleSaveExpiry}>
              Cập nhật hạn dùng
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <span className="text-[#78716C] block">Mã booking liên kết:</span>
            <span className="font-mono font-bold text-[#1C1917]">
              {codeToEditExpiry?.bookingCode}
            </span>
          </div>
          <div>
            <span className="text-[#78716C] block">Khách nhận mã:</span>
            <span className="font-semibold text-[#1C1917]">{codeToEditExpiry?.guestName}</span>
          </div>
          <Input
            label="Thời gian hết hạn mới (dd/mm/yyyy hh:mm)"
            value={newValidTo}
            onChange={(e) => setNewValidTo(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
