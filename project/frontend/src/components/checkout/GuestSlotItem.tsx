import React, { useState } from 'react';
import { validateDocumentImage } from '../../utils/imageValidation';

export interface GuestSlotItemData {
  id: string;
  slot_index: number;
  guest_type: 'adult' | 'child';
  is_booker: boolean;
  name: string;
  date_of_birth: string;
  doc_number?: string;
  doc_front_path?: string;
  doc_back_path?: string;
  status: 'empty' | 'uploading' | 'ocr_done' | 'ocr_low_confidence' | 'manual_child' | 'confirmed';
  ocr_confidence?: number;
  error_message?: string;
}

interface GuestSlotProps {
  slot: GuestSlotItemData;
  checkInDate: string;
  onUpdateSlot: (slotId: string, data: Partial<GuestSlotItemData>) => void;
  onConfirmSlot: (slotId: string) => void;
  onModifyGuestsCount: () => void;
}

export const GuestSlotItem: React.FC<GuestSlotProps> = ({
  slot,
  checkInDate,
  onUpdateSlot,
  onConfirmSlot,
  onModifyGuestsCount,
}) => {
  const [blurWarning, setBlurWarning] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Tính tuổi dựa trên ngày check-in
  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    const checkIn = new Date(checkInDate);
    let age = checkIn.getFullYear() - dob.getFullYear();
    const monthDiff = checkIn.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && checkIn.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  // Upload ảnh CCCD (chỉ mặt trước, từ file, validate ảnh rõ nét)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidating(true);
    const validation = await validateDocumentImage(file);
    setIsValidating(false);

    if (!validation.isValid) {
      alert(validation.errorMessage);
      return;
    }

    if (validation.isBlurry) {
      setBlurWarning(validation.errorMessage || null);
    } else {
      setBlurWarning(null);
    }

    const previewUrl = URL.createObjectURL(file);

    onUpdateSlot(slot.id, {
      status: 'uploading',
      doc_front_path: previewUrl,
    });

    // Giả lập OCR quét dữ liệu tự động
    setTimeout(() => {
      const mockNumbers = ['079203004561', '034200001234', '048202008899', '001201009876'];
      const randomId = mockNumbers[slot.slot_index % mockNumbers.length];

      onUpdateSlot(slot.id, {
        name: slot.name || (slot.is_booker ? slot.name : `Nguyễn Văn Khách ${slot.slot_index}`),
        date_of_birth: slot.date_of_birth || '1996-08-20',
        doc_number: slot.doc_number || randomId,
        status: 'ocr_done',
        ocr_confidence: 96,
        error_message: undefined,
      });
    }, 1200);
  };

  // Xử lý khi trẻ em đổi ngày sinh: Nếu >= 10 tuổi -> tự chuyển thành slot người lớn
  const handleChildDobChange = (dob: string) => {
    const age = calculateAge(dob);
    if (age >= 10) {
      alert(`Trẻ sinh ngày ${dob} (${age} tuổi tính đến ngày check-in) thuộc diện từ 10 tuổi trở lên. Hệ thống tự động chuyển thành slot người lớn và yêu cầu tải ảnh CCCD/Hộ chiếu.`);
      onUpdateSlot(slot.id, {
        date_of_birth: dob,
        guest_type: 'adult',
        status: 'empty',
      });
    } else {
      onUpdateSlot(slot.id, {
        date_of_birth: dob,
        status: 'manual_child',
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5 shadow-xs space-y-4">
      {/* Header Slot */}
      <div className="flex items-center justify-between border-b border-[#F2ECE1] pb-3">
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-sm text-[#241C18]">
            {slot.guest_type === 'adult' ? `Người lớn (Thành viên ${slot.slot_index})` : `Trẻ em (Thành viên ${slot.slot_index})`}
          </span>
          {slot.is_booker && (
            <span className="bg-[#FAF6F0] text-[#C4572E] text-[10px] font-bold px-2 py-0.5 rounded">
              Người đặt phòng
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onModifyGuestsCount}
          className="text-[11px] text-[#73665C] hover:text-[#C4572E] underline cursor-pointer"
        >
          Sửa số khách
        </button>
      </div>

      {/* Nhánh 1: Trẻ em dưới 10 tuổi -> Nhập tay Tên + Ngày sinh */}
      {slot.guest_type === 'child' ? (
        <div className="space-y-3">
          <p className="text-xs text-[#73665C]">
            Trẻ em dưới 10 tuổi không yêu cầu giấy tờ CCCD. Vui lòng nhập họ tên và ngày sinh của bé:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#73665C] block mb-1">Họ và tên bé</label>
              <input
                type="text"
                value={slot.name}
                onChange={(e) => onUpdateSlot(slot.id, { name: e.target.value })}
                placeholder="Ví dụ: Nguyễn Minh An"
                className="w-full bg-[#FAF6F0] border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs text-[#241C18] outline-none focus:border-[#C4572E]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#73665C] block mb-1">Ngày sinh của bé</label>
              <input
                type="date"
                value={slot.date_of_birth}
                onChange={(e) => handleChildDobChange(e.target.value)}
                className="w-full bg-[#FAF6F0] border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs text-[#241C18] outline-none focus:border-[#C4572E]"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Nhánh 2: Người lớn (Từ 10 tuổi trở lên) -> Bắt buộc CCCD/Hộ chiếu */
        <div className="space-y-3">
          {/* Ô tải ảnh CCCD (chỉ 1 ảnh mặt trước, từ file) */}
          <div className="border-2 border-dashed border-[#DCD6CC] hover:border-[#C4572E] rounded-xl p-4 text-center cursor-pointer bg-[#FAF6F0]/60 transition-colors">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              id={`upload-${slot.id}`}
            />
            <label htmlFor={`upload-${slot.id}`} className="cursor-pointer block space-y-1">
              <span className="text-xs font-bold text-[#C4572E] block">
                {slot.status === 'empty'
                  ? 'Tải ảnh mặt trước CCCD / Hộ chiếu'
                  : 'Tải lại ảnh mặt trước khác'}
              </span>
              <span className="text-[11px] text-[#8C7A70] block">
                Chụp riêng từng giấy tờ, rõ nét, đủ 4 góc, dung lượng &le; 5MB (chỉ chọn từ file)
              </span>
            </label>
          </div>

          {isValidating && (
            <p className="text-xs text-[#C4572E] font-medium animate-pulse">
              Đang kiểm tra chất lượng và độ nét của ảnh...
            </p>
          )}

          {blurWarning && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] p-2.5 rounded-lg">
              {blurWarning}
            </div>
          )}

          {slot.doc_front_path && (
            <div className="flex items-center gap-3 bg-[#FAF6F0] p-2.5 rounded-xl border border-[#E8E2D8]">
              <img
                src={slot.doc_front_path}
                alt="Mặt trước CCCD"
                className="w-16 h-10 object-cover rounded-md border border-[#DCD6CC]"
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-[#241C18] block truncate">Ảnh mặt trước CCCD</span>
                <span className="text-[10px] text-[#2A694E] block">Đã quét OCR tự động</span>
              </div>
            </div>
          )}

          {/* Form thông tin trích xuất từ OCR */}
          {(slot.status === 'ocr_done' || slot.status === 'confirmed') && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-[#73665C] block mb-1">Họ và tên (OCR)</label>
                <input
                  type="text"
                  value={slot.name}
                  onChange={(e) => onUpdateSlot(slot.id, { name: e.target.value })}
                  className="w-full bg-[#FAF6F0] border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs text-[#241C18] font-semibold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#73665C] block mb-1">Ngày sinh</label>
                <input
                  type="date"
                  value={slot.date_of_birth}
                  onChange={(e) => onUpdateSlot(slot.id, { date_of_birth: e.target.value })}
                  className="w-full bg-[#FAF6F0] border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs text-[#241C18]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#73665C] block mb-1">Số CCCD / Hộ chiếu</label>
                <input
                  type="text"
                  value={slot.doc_number || ''}
                  onChange={(e) => onUpdateSlot(slot.id, { doc_number: e.target.value })}
                  className="w-full bg-[#FAF6F0] border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs text-[#241C18] font-mono"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nút Xác nhận Slot */}
      <div className="flex justify-end pt-2 border-t border-[#F2ECE1]">
        {slot.status === 'confirmed' ? (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            ✓ Đã xác nhận thông tin
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onConfirmSlot(slot.id)}
            disabled={!slot.name}
            className="bg-[#241C18] hover:bg-[#C4572E] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Xác nhận thông tin slot này
          </button>
        )}
      </div>
    </div>
  );
};
