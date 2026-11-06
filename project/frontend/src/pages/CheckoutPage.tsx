import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FixedTopBookingBar } from '../components/ui/FixedTopBookingBar';
import { customerService, customerError } from '../services/customerService';
import { getCustomerToken } from '../services/customerSession';
import {
  BookingDraft,
  BookingGuestSlot,
  SlotStatus,
  PAYMENT_METHODS,
  SEED_VOUCHERS,
} from '../services/dataService';

interface CheckoutPageProps {
  bookingData?: BookingDraft | any;
  onGoBack: () => void;
  onCompleteBooking: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  bookingData,
  onGoBack,
  onCompleteBooking,
}) => {
  const fallbackDraft: BookingDraft = {
    id: 'draft_default',
    booking_code: 'BK-202611-8942',
    apartment_id: 1,
    apartment_name: 'Sunshine Villa Phố Cổ',
    apartment_address: '123 Phố Hàng Bạc, Hoàn Kiếm, Hà Nội',
    room_type_id: 1,
    room_type_name: 'Studio Cozy Standard',
    room_type_image:
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    num_rooms: 1,
    check_in_date: '2026-11-15',
    check_out_date: '2026-11-17',
    nights: 2,
    num_adults: 2,
    num_children: 0,
    children_ages: [],
    price_breakdown: [
      {
        date: '2026-11-15',
        dayOfWeek: 'Chủ Nhật',
        basePrice: 550000,
        extraFeePercent: 0,
        extraFeeAmount: 0,
        finalPricePerRoom: 550000,
      },
      {
        date: '2026-11-16',
        dayOfWeek: 'Thứ Hai',
        basePrice: 550000,
        extraFeePercent: 0,
        extraFeeAmount: 0,
        finalPricePerRoom: 550000,
      },
    ],
    room_subtotal: 1100000,
    extra_fee_total: 0,
    service_total: 0,
    discount_amount: 0,
    total_price: 1100000,
    hold_expires_at: Date.now() + 30 * 60 * 1000,
    status: 'pending_info',
    booker: {
      full_name: '',
      email: '',
      phone: '',
      is_staying: true,
      email_verified: false,
      consent_data_protection: false,
    },
    guests: [
      {
        id: 'slot-1',
        slot_index: 1,
        guest_type: 'adult',
        is_booker: true,
        is_foreigner: false,
        full_name: '',
        date_of_birth: '',
        id_type: 'cccd',
        id_number: '',
        slot_status: 'empty',
        retry_count: 0,
      },
      {
        id: 'slot-2',
        slot_index: 2,
        guest_type: 'adult',
        is_booker: false,
        is_foreigner: false,
        full_name: '',
        date_of_birth: '',
        id_type: 'cccd',
        id_number: '',
        slot_status: 'empty',
        retry_count: 0,
      },
    ],
  };

  const [draft, setDraft] = useState<BookingDraft>(bookingData || fallbackDraft);

  // Helper tính tuổi tại thời điểm check-in
  const calculateAgeAtCheckIn = (dobString: string, checkInString?: string): number => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return 0;
    const ref = checkInString ? new Date(checkInString) : new Date();
    let age = ref.getFullYear() - dob.getFullYear();
    const m = ref.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  // Hàm sinh slot đồng bộ đảm bảo đủ số lượng adults & children
  const buildInitialSlots = (currentDraft: BookingDraft): BookingGuestSlot[] => {
    let initialSlots: BookingGuestSlot[] = [];
    if (currentDraft.guests && currentDraft.guests.length > 0) {
      initialSlots = currentDraft.guests.map((g) => ({ ...g }));
    } else {
      initialSlots = fallbackDraft.guests.map((g) => ({ ...g }));
    }

    const requiredAdults = Math.max(1, currentDraft.num_adults || 1);
    const requiredChildren = currentDraft.num_children || 0;

    // Đảm bảo số lượng slot người lớn
    const adultSlots = initialSlots.filter((s) => s.guest_type === 'adult');
    if (adultSlots.length < requiredAdults) {
      for (let i = adultSlots.length + 1; i <= requiredAdults; i++) {
        initialSlots.push({
          id: `slot-adult-${i}`,
          slot_index: i,
          guest_type: 'adult',
          is_booker: false,
          is_foreigner: false,
          full_name: '',
          date_of_birth: '',
          id_type: 'cccd',
          id_number: '',
          slot_status: 'empty',
          retry_count: 0,
        });
      }
    }

    // Đảm bảo sinh sẵn slot cho trẻ em theo draft.num_children
    const childSlots = initialSlots.filter((s) => s.guest_type === 'child');
    if (childSlots.length < requiredChildren) {
      for (let c = childSlots.length + 1; c <= requiredChildren; c++) {
        const childAge = currentDraft.children_ages?.[c - 1] ?? 5;
        initialSlots.push({
          id: `slot-child-${c}`,
          slot_index: requiredAdults + c,
          guest_type: 'child',
          is_booker: false,
          is_foreigner: false,
          full_name: '',
          date_of_birth: '',
          age: childAge,
          id_type: 'cccd',
          id_number: '',
          slot_status: 'empty',
          retry_count: 0,
        });
      }
    }

    return initialSlots;
  };

  // Giai đoạn hiện tại (không dùng số bước 3, 4, 5... trên giao diện)
  type Stage = 'booker' | 'guests' | 'payment' | 'confirmed';
  const [currentStage, setCurrentStage] = useState<Stage>('booker');

  // Thông tin người đặt
  const [bookerName, setBookerName] = useState(getCustomerToken() ? '' : draft.booker.full_name || '');
  const [bookerEmail, setBookerEmail] = useState(getCustomerToken() ? '' : draft.booker.email || '');
  const [bookerPhone, setBookerPhone] = useState(getCustomerToken() ? '' : draft.booker.phone || '');
  const [isStaying, setIsStaying] = useState(draft.booker.is_staying ?? true);
  const [lockEmail, setLockEmail] = useState(draft.booker.lock_email || '');
  const [consentDataProtection, setConsentDataProtection] = useState(
    draft.booker.consent_data_protection ?? true
  );

  // OTP Email Verification
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [bookerError, setBookerError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(Boolean(getCustomerToken()));
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileRetry, setProfileRetry] = useState(0);

  useEffect(() => {
    if (!getCustomerToken()) return;
    let active = true;
    setProfileLoading(true);
    setProfileError(null);
    customerService.me().then(({ customer }) => {
      if (!active) return;
      setBookerName(customer.full_name || '');
      setBookerEmail(customer.email);
      setBookerPhone(customer.phone || '');
      setEmailVerified(true);
      setOtpSent(false);
      setOtpCode('');
    }).catch(error => {
      if (!active) return;
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setEmailVerified(false);
      } else {
        setProfileError(customerError(error));
      }
    }).finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [profileRetry]);

  // Danh sách slot người đi cùng (khởi tạo đầy đủ cả người lớn và trẻ em)
  const [slots, setSlots] = useState<BookingGuestSlot[]>(() => buildInitialSlots(draft));

  // Đồng bộ lại slots và draft nếu bookingData thay đổi
  useEffect(() => {
    if (bookingData) {
      setDraft(bookingData);
      setSlots(buildInitialSlots(bookingData));
      if (bookingData.booker?.full_name) setBookerName(bookingData.booker.full_name);
      if (bookingData.booker?.email) setBookerEmail(bookingData.booker.email);
      if (bookingData.booker?.phone) setBookerPhone(bookingData.booker.phone);
    }
  }, [bookingData]);

  // Modal xem trước ảnh mặt trước
  const [previewImage, setPreviewImage] = useState<{ title: string; url: string } | null>(null);
  const [guestsError, setGuestsError] = useState<string | null>(null);

  // Thanh toán
  const [paymentMethod, setPaymentMethod] = useState<string>('vietqr');
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [voucherMsg, setVoucherMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Hết hạn giữ phòng
  const [holdExpiredModal, setHoldExpiredModal] = useState(false);

  // Khi isStaying thay đổi, cập nhật slot 1
  useEffect(() => {
    setSlots((prev) => {
      const copy = [...prev];
      if (copy.length > 0) {
        if (isStaying) {
          copy[0].is_booker = true;
          if (!copy[0].full_name && bookerName) {
            copy[0].full_name = bookerName;
          }
        } else {
          copy[0].is_booker = false;
        }
      }
      return copy;
    });
  }, [isStaying, bookerName]);

  // Xử lý gửi và xác thực OTP
  const handleSendOtp = async () => {
    if (!bookerEmail || !bookerEmail.includes('@')) {
      setBookerError('Vui lòng nhập địa chỉ Email hợp lệ trước khi gửi mã xác thực.');
      return;
    }
    setOtpError(null);
    setBookerError(null);
    try { await customerService.requestOtp(bookerEmail, 'booking'); setOtpSent(true); }
    catch (error) { setOtpError(customerError(error)); }
  };

  const handleVerifyOtp = async () => {
    try {
      await customerService.verifyOtp(bookerEmail, 'booking', otpCode);
      setEmailVerified(true);
      setOtpError(null);
    } catch (error) {
      setOtpError(customerError(error));
    }
  };

  // Xác nhận thông tin người đặt
  const handleBookerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (profileLoading || profileError) return;
    setBookerError(null);

    if (!bookerName.trim()) {
      setBookerError('Họ và tên người đặt là thông tin bắt buộc.');
      return;
    }

    if (!bookerEmail.trim() || !bookerEmail.includes('@')) {
      setBookerError('Địa chỉ email bắt buộc và phải đúng định dạng.');
      return;
    }

    const phoneRegex = /^(0|\+84)\d{9}$/;
    if (!phoneRegex.test(bookerPhone.replace(/[\s.-]/g, ''))) {
      setBookerError('Số điện thoại không đúng định dạng Việt Nam (Ví dụ: 0901234567 hoặc +84901234567).');
      return;
    }

    if (!consentDataProtection) {
      setBookerError(
        'Bạn cần xác nhận đồng ý xử lý dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP để hoàn tất đặt phòng.'
      );
      return;
    }

    setDraft((prev) => ({
      ...prev,
      booker: {
        full_name: bookerName,
        email: bookerEmail,
        phone: bookerPhone,
        is_staying: isStaying,
        email_verified: emailVerified,
        consent_data_protection: consentDataProtection,
      },
    }));

    setCurrentStage('guests');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Chỉ tải 1 ảnh mặt trước CCCD lên từ file, không chụp camera (Yêu cầu 5)
  const handleUploadFrontDoc = (slotId: string, file: File | null) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp ảnh định dạng JPG, PNG hoặc WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Dung lượng tệp vượt quá 5MB. Vui lòng chọn ảnh có kích thước nhỏ hơn.');
      return;
    }

    const mockUrl = URL.createObjectURL(file);

    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== slotId) return slot;

        const updated = {
          ...slot,
          doc_front_path: mockUrl,
          slot_status: 'ocr_processing' as SlotStatus,
        };

        // Giả lập OCR quét dữ liệu trong 1.4s
        setTimeout(() => {
          setSlots((currentSlots) =>
            currentSlots.map((s) => {
              if (s.id !== slotId) return s;

              if (s.retry_count >= 2) {
                return {
                  ...s,
                  slot_status: 'pending_admin',
                  ocr_confidence: 58,
                  error_message: 'Hồ sơ chuyển sang trạng thái chờ admin duyệt thủ công.',
                };
              }

              const mockNumbers = ['001201009876', '079203004561', '034200001234', '048202008899'];
              const randomId = mockNumbers[s.slot_index % mockNumbers.length];

              return {
                ...s,
                full_name: s.full_name || (s.is_booker ? bookerName : `Khách lưu trú ${s.slot_index}`),
                date_of_birth: s.date_of_birth || (s.guest_type === 'adult' ? '1995-08-20' : '2014-05-10'),
                id_number: s.id_number || randomId,
                slot_status: 'ocr_done',
                ocr_confidence: 96,
                retry_count: s.retry_count + 1,
                error_message: undefined,
              };
            })
          );
        }, 1400);

        return updated;
      })
    );
  };

  // Cập nhật thông tin thủ công
  const handleUpdateSlotField = (
    slotId: string,
    field: keyof BookingGuestSlot,
    val: any
  ) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;

        // Nếu cập nhật ngày sinh, tự động tính lại tuổi theo ngày check-in
        if (field === 'date_of_birth') {
          const ageAtCheckIn = calculateAgeAtCheckIn(val, draft.check_in_date);

          // Quy tắc mới cho trẻ em:
          // - Dưới 10 tuổi: không cần CCCD, không tính là 1 khách
          // - 10 đến 15 tuổi: cần CCCD, không tính là 1 khách
          // - Trên 15 tuổi: cần CCCD, tính là 1 khách
          if (s.guest_type === 'child') {
            if (ageAtCheckIn < 10 && ageAtCheckIn >= 0) {
              return {
                ...s,
                date_of_birth: val,
                age: ageAtCheckIn,
                error_message: undefined,
              };
            } else if (ageAtCheckIn >= 10 && ageAtCheckIn <= 15) {
              return {
                ...s,
                date_of_birth: val,
                age: ageAtCheckIn,
                error_message: `Bé ${ageAtCheckIn} tuổi (10-15 tuổi): Bắt buộc tải ảnh mặt trước CCCD/Hộ chiếu; được miễn tính 1 khách vào sức chứa.`,
              };
            } else if (ageAtCheckIn > 15) {
              return {
                ...s,
                date_of_birth: val,
                age: ageAtCheckIn,
                error_message: `Khách ${ageAtCheckIn} tuổi (trên 15 tuổi): Bắt buộc tải CCCD/Hộ chiếu và tính là 1 khách vào sức chứa phòng.`,
              };
            }
          }

          // Quy tắc: Slot "người lớn" mà ngày sinh < 10 tuổi -> cảnh báo
          if (s.guest_type === 'adult' && ageAtCheckIn < 10 && ageAtCheckIn >= 0 && val) {
            return {
              ...s,
              date_of_birth: val,
              age: ageAtCheckIn,
              error_message: `Ngày sinh cho thấy khách ${ageAtCheckIn} tuổi (dưới 10 tuổi). Trẻ em dưới 10 tuổi được miễn CCCD và miễn tính sức chứa.`,
            };
          }

          return {
            ...s,
            date_of_birth: val,
            age: ageAtCheckIn >= 0 ? ageAtCheckIn : s.age,
            error_message: undefined,
          };
        }

        return { ...s, [field]: val };
      })
    );
  };

  // Xác nhận từng slot
  const handleConfirmSlot = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;

    if (!slot.full_name.trim()) {
      alert(
        slot.guest_type === 'child'
          ? 'Vui lòng nhập họ và tên của bé ở mục này.'
          : 'Vui lòng nhập họ và tên của khách ở mục này.'
      );
      return;
    }

    if (!slot.date_of_birth) {
      alert('Vui lòng chọn ngày sinh của khách ở mục này.');
      return;
    }

    const isAdultOrRequiredDoc =
      slot.guest_type === 'adult' || (slot.age !== undefined && slot.age >= 10);

    if (isAdultOrRequiredDoc) {
      if (!slot.id_number.trim()) {
        alert('Khách từ 10 tuổi trở lên bắt buộc cần số CCCD hoặc Hộ chiếu.');
        return;
      }
      if (!slot.doc_front_path) {
        alert('Vui lòng tải lên ảnh mặt trước CCCD hoặc Hộ chiếu để hoàn tất xác thực.');
        return;
      }
    }

    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, slot_status: 'confirmed', error_message: undefined }
          : s
      )
    );
  };

  // Kiểm tra trước khi sang thanh toán
  const validateGuestsStage = (): boolean => {
    setGuestsError(null);

    const adultConfirmed = slots.some(
      (s) => s.guest_type === 'adult' && (s.slot_status === 'confirmed' || s.slot_status === 'pending_admin')
    );
    if (!adultConfirmed) {
      setGuestsError('Đoàn lưu trú cần ít nhất 1 người lớn đã được xác nhận thông tin.');
      return false;
    }

    // Kiểm tra trùng lặp số CCCD
    const idMap: Record<string, string[]> = {};
    slots.forEach((s) => {
      if (s.id_number && s.id_number.trim()) {
        const num = s.id_number.trim();
        idMap[num] = idMap[num] || [];
        idMap[num].push(s.id);
      }
    });

    let hasDuplicate = false;
    for (const [idNum, slotIds] of Object.entries(idMap)) {
      if (slotIds.length > 1) {
        hasDuplicate = true;
        setGuestsError(`Số giấy tờ ${idNum} bị trùng lặp giữa các thành viên trong đoàn.`);
        setSlots((prev) =>
          prev.map((s) =>
            slotIds.includes(s.id)
              ? {
                  ...s,
                  slot_status: 'error',
                  error_message: 'Số giấy tờ bị trùng lặp với thành viên khác.',
                }
              : s
          )
        );
      }
    }
    if (hasDuplicate) return false;

    // Toàn bộ slot phải confirmed hoặc pending_admin
    const allConfirmed = slots.every(
      (s) => s.slot_status === 'confirmed' || s.slot_status === 'pending_admin'
    );
    if (!allConfirmed) {
      setGuestsError('Vui lòng kiểm tra và xác nhận toàn bộ thông tin các thành viên trong đoàn.');
      return false;
    }

    return true;
  };

  const handleGuestsSubmit = () => {
    if (validateGuestsStage()) {
      setDraft((prev) => ({ ...prev, guests: slots, status: 'pending_payment' }));
      setCurrentStage('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Áp dụng voucher
  const handleApplyVoucher = () => {
    if (!voucherInput.trim()) return;
    const match = SEED_VOUCHERS.find(
      (v) => v.code.toUpperCase() === voucherInput.trim().toUpperCase()
    );
    if (match) {
      let discount = 0;
      if (match.discount_type === 'percentage') {
        discount = (draft.total_price * match.discount_value) / 100;
        if (match.max_discount_amount) {
          discount = Math.min(discount, match.max_discount_amount);
        }
      } else {
        discount = match.discount_value;
      }
      setAppliedVoucher({ code: match.code, discount });
      setVoucherMsg({
        text: `Đã áp dụng mã ${match.code}: Giảm ${discount.toLocaleString('vi-VN')}đ`,
        isError: false,
      });
    } else {
      setVoucherMsg({ text: 'Mã ưu đãi không hợp lệ hoặc đã hết hạn.', isError: true });
    }
  };

  const finalTotalAmount = Math.max(
    0,
    draft.total_price - (appliedVoucher?.discount || 0)
  );

  const [saveError, setSaveError] = useState('');
  const [savedBooking, setSavedBooking] = useState<{ booking_code: string; total_price: number; hold_expires_at: string } | null>(null);
  const handleFinishPayment = async () => {
    setIsProcessingPayment(true);
    setSaveError('');
    try {
      if (draft.booking_rooms && draft.booking_rooms.length > 1) {
        setSaveError('Luồng lưu đơn hiện hỗ trợ một loại phòng mỗi lần. Vui lòng tách thành các đơn riêng.');
        return;
      }
      const selected = draft.booking_rooms?.[0];
      const saved = await customerService.createGuestBooking({
        email: bookerEmail, full_name: bookerName, phone: bookerPhone,
        room_type_id: Number(selected?.room_type_id || draft.room_type_id),
        num_rooms: Number(selected?.count || draft.num_rooms || 1),
        adults: draft.num_adults, children: draft.num_children,
        check_in_date: draft.check_in_date, check_out_date: draft.check_out_date,
      });
      setSavedBooking(saved);
      setCurrentStage('confirmed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) { setSaveError(customerError(error)); }
    finally { setIsProcessingPayment(false); }
  };

  // MÀN HÌNH XÁC NHẬN ĐẶT PHÒNG THÀNH CÔNG
  if (currentStage === 'confirmed' && savedBooking) {
    return <div className="max-w-2xl mx-auto px-6 py-16 space-y-5">
      <h1 className="text-3xl font-serif">Đã lưu đơn đặt phòng</h1>
      <p>Mã booking: <strong>{savedBooking.booking_code}</strong></p>
      <p>Đơn đang chờ thanh toán. Chưa phát sinh giao dịch hoặc cấp mã khóa.</p>
      <p>Tổng tiền phòng do máy chủ tính: <strong>{savedBooking.total_price.toLocaleString('vi-VN')}đ</strong>.</p>
      <p>Giữ phòng đến {new Date(savedBooking.hold_expires_at).toLocaleString('vi-VN')}.</p>
      <p>Dùng email <strong>{bookerEmail}</strong> và OTP để xem lại đơn.</p>
      <Button onClick={onCompleteBooking}>Xem booking của tôi</Button>
    </div>;
  }

  return (
    <div className="bg-[#F8F6F0] min-h-screen pb-20 font-sans">
      {/* Thanh cố định phía trên */}
      <FixedTopBookingBar
        draft={draft}
        onEditSearch={onGoBack}
        onHoldExpired={() => setHoldExpiredModal(true)}
      />

      {/* Stepper Header: KHÔNG ĐÁNH SỐ BƯỚC 3, 4, 5 (Yêu cầu 4) */}
      <div className="bg-white border-b border-[#E2DDD5] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#1A1615]">
              Thông tin đặt phòng & Check-in
            </h1>
            <p className="text-xs text-[#736B63] mt-0.5">
              Khai báo thông tin lưu trú bảo mật theo Nghị định 13/2023/NĐ-CP
            </p>
          </div>

          {/* Stepper pills thuần tên mục */}
          <div className="flex items-center gap-2 text-xs bg-[#F8F6F0] p-1.5 rounded-xl border border-[#E2DDD5] overflow-x-auto">
            <span
              className={`px-3 py-1 rounded font-semibold whitespace-nowrap transition-colors ${
                currentStage === 'booker'
                  ? 'bg-[#1A1615] text-white'
                  : 'text-[#2A694E] bg-[#EDF5F1]'
              }`}
            >
              Người đặt
            </span>

            <span className="text-[#D0C8BC]">→</span>

            <span
              className={`px-3 py-1 rounded font-semibold whitespace-nowrap transition-colors ${
                currentStage === 'guests'
                  ? 'bg-[#1A1615] text-white'
                  : currentStage === 'payment'
                  ? 'text-[#2A694E] bg-[#EDF5F1]'
                  : 'text-[#736B63]'
              }`}
            >
              Người đi cùng ({slots.length} người)
            </span>

            <span className="text-[#D0C8BC]">→</span>

            <span
              className={`px-3 py-1 rounded font-semibold whitespace-nowrap transition-colors ${
                currentStage === 'payment'
                  ? 'bg-[#1A1615] text-white'
                  : 'text-[#736B63]'
              }`}
            >
              Thanh toán
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* CỘT TRÁI */}
          <div className="lg:col-span-8 space-y-6">
            {/* ========================================================= */}
            {/* THÔNG TIN NGƯỜI ĐẶT PHÒNG (KHÔNG GHI BƯỚC 3) */}
            {/* ========================================================= */}
            {currentStage === 'booker' && (
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2DDD5] shadow-xs space-y-6">
                <div className="border-b border-[#EBE6DE] pb-4">
                  <h2 className="text-lg font-serif font-bold text-[#1A1615]">
                    Thông tin người đại diện đặt phòng
                  </h2>
                  <p className="text-xs text-[#736B63] mt-1">
                    Thông tin liên hệ để nhận mã mở cửa phòng và hóa đơn điện tử
                  </p>
                </div>

                {bookerError && (
                  <div className="p-3 bg-[#FDF2F2] border border-[#F3CECE] text-[#A83232] text-xs rounded-xl flex items-center justify-between">
                    <span>{bookerError}</span>
                    <button
                      type="button"
                      onClick={() => setBookerError(null)}
                      className="text-[#A83232] font-bold ml-2"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {profileLoading && <p role="status" className="text-xs">Đang tải thông tin tài khoản…</p>}
                {profileError && <div role="alert" className="text-xs text-[#A83232]">
                  {profileError}{' '}
                  <button type="button" onClick={() => setProfileRetry(n => n + 1)} className="underline">Thử lại</button>
                </div>}
                <form onSubmit={handleBookerSubmit} className="space-y-5">
                  <fieldset disabled={profileLoading || Boolean(profileError)} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#1A1615] block mb-1">
                        Họ và tên người đặt <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={bookerName}
                        onChange={(e) => setBookerName(e.target.value)}
                        placeholder="Nhập họ và tên của bạn"
                        className="w-full bg-[#F8F6F0] border border-[#D0C8BC] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1615] font-medium outline-none focus:border-[#9E472A]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#1A1615] block mb-1">
                        Số điện thoại (Nhận SMS mã PIN) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={bookerPhone}
                        onChange={(e) => setBookerPhone(e.target.value)}
                        placeholder="Ví dụ: 0901234567"
                        className="w-full bg-[#F8F6F0] border border-[#D0C8BC] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1615] font-medium outline-none focus:border-[#9E472A]"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-[#1A1615] block">
                        Địa chỉ Email <span className="text-red-500">*</span>{' '}
                        <span className="text-[11px] text-[#9E472A] font-medium">
                          (Mã khóa sẽ gửi tới: {bookerEmail || 'email của bạn'})
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={bookerEmail}
                          onChange={(e) => {
                            setBookerEmail(e.target.value);
                            setEmailVerified(false);
                            setOtpSent(false);
                            setOtpCode('');
                          }}
                          placeholder="ban@example.com"
                          className="flex-1 bg-[#F8F6F0] border border-[#D0C8BC] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1615] font-medium outline-none focus:border-[#9E472A]"
                        />
                        {!emailVerified && <button
                          type="button"
                          onClick={handleSendOtp}
                          className="bg-[#1A1615] hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                        >
                          {otpSent ? 'Gửi lại mã OTP' : 'Gửi mã OTP'}
                        </button>}
                      </div>

                      {otpSent && !emailVerified && (
                        <div className="bg-[#F8F6F0] p-3 rounded-xl border border-[#D0C8BC] flex items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="font-bold text-[#1A1615] block">Mã xác thực 6 số</span>
                            <span className="text-[10px] text-[#736B63]">
                              Mã OTP đã gửi đến {bookerEmail}, có hiệu lực 5 phút.
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                              placeholder="123456"
                              className="w-24 text-center tracking-widest font-mono font-bold bg-white border border-[#D0C8BC] rounded-lg px-2 py-1.5 text-xs"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyOtp}
                              className="bg-[#2A694E] text-white px-3 py-1.5 rounded-lg font-bold hover:bg-[#1E4D39]"
                            >
                              Xác thực
                            </button>
                          </div>
                        </div>
                      )}

                      {emailVerified && (
                        <div className="text-[11px] font-semibold text-[#2A694E]">
                          ✓ Email đã được xác thực thành công.
                        </div>
                      )}

                      {otpError && (
                        <div className="text-[11px] font-semibold text-[#A83232]">
                          {otpError}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Radio: Tôi sẽ ở / Tôi đặt hộ người khác */}
                  <div className="p-4 bg-[#F8F6F0] rounded-xl border border-[#E2DDD5] space-y-3">
                    <span className="text-xs font-bold text-[#1A1615] block">
                      Hình thức lưu trú của bạn:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer bg-white transition-all hover:border-[#9E472A]">
                        <input
                          type="radio"
                          name="stayingType"
                          checked={isStaying}
                          onChange={() => setIsStaying(true)}
                          className="w-4 h-4 accent-[#9E472A] cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-[#1A1615] block">
                            Tôi sẽ ở lại homestay
                          </span>
                          <span className="text-[10px] text-[#736B63] block">
                            Bạn là khách lưu trú số 1 trong đoàn
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer bg-white transition-all hover:border-[#9E472A]">
                        <input
                          type="radio"
                          name="stayingType"
                          checked={!isStaying}
                          onChange={() => setIsStaying(false)}
                          className="w-4 h-4 accent-[#9E472A] cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-[#1A1615] block">
                            Tôi đặt hộ người khác
                          </span>
                          <span className="text-[10px] text-[#736B63] block">
                            Bạn không ở, nhận phòng là người khác
                          </span>
                        </div>
                      </label>
                    </div>

                    {!isStaying && (
                      <div className="pt-2 border-t border-[#EBE6DE] space-y-1">
                        <label className="text-[11px] font-bold text-[#1A1615] block">
                          Email nhận mã khóa phòng của người ở (Tùy chọn):
                        </label>
                        <input
                          type="email"
                          value={lockEmail}
                          onChange={(e) => setLockEmail(e.target.value)}
                          placeholder="nguoi_o@example.com (để trống nếu gửi về email người đặt)"
                          className="w-full bg-white border border-[#D0C8BC] rounded-lg px-3 py-2 text-xs text-[#1A1615] outline-none focus:border-[#9E472A]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Đồng ý Nghị định 13/2023 */}
                  <div className="p-4 bg-[#FDF7EE] rounded-xl border border-[#F6E1C5]">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentDataProtection}
                        onChange={(e) => setConsentDataProtection(e.target.checked)}
                        className="mt-1 w-4 h-4 accent-[#9E472A] rounded cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-[#1A1615] block">
                          Đồng ý xử lý dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP) <span className="text-red-500">*</span>
                        </span>
                        <p className="text-[11px] text-[#736B63] mt-1 leading-relaxed">
                          Hình ảnh giấy tờ tùy thân của khách lưu trú sẽ được mã hóa và <strong>tự động xóa vĩnh viễn</strong> ngay sau khi hoàn tất thủ tục đăng ký tạm trú với cơ quan có thẩm quyền.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Nút tiếp tục (không ghi số bước) */}
                  <div className="pt-4 flex items-center justify-between border-t border-[#EBE6DE]">
                    <Button variant="ghost" type="button" onClick={onGoBack}>
                      ← Quay lại chọn phòng
                    </Button>
                    <Button variant="primary" type="submit" className="font-semibold">
                      Tiếp tục: Điền thông tin người đi cùng ({slots.length} người) →
                    </Button>
                  </div>
                  </fieldset>
                </form>
              </div>
            )}

            {/* ========================================================= */}
            {/* THÔNG TIN NGƯỜI ĐI CÙNG (KHÔNG GHI BƯỚC 4) */}
            {/* CHỈ TẢI 1 ẢNH MẶT TRƯỚC, KHÔNG CHỤP CAMERA (Yêu cầu 4, 5) */}
            {/* ========================================================= */}
            {currentStage === 'guests' && (
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2DDD5] shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EBE6DE] pb-4">
                  <div>
                    <h2 className="text-lg font-serif font-bold text-[#1A1615]">
                      Thông tin khách lưu trú & người đi cùng
                    </h2>
                    <p className="text-xs text-[#736B63] mt-1 font-medium">
                      Đoàn của bạn:{' '}
                      <span className="text-[#1A1615] font-bold">
                        {draft.num_adults} người lớn
                        {draft.num_children > 0 ? `, ${draft.num_children} trẻ em (< 10 tuổi)` : ''}
                      </span>{' '}
                      ({slots.length} thành viên)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onGoBack}
                    className="text-xs font-semibold text-[#9E472A] hover:underline shrink-0"
                  >
                    Sửa số khách (quay về chọn phòng)
                  </button>
                </div>

                {guestsError && (
                  <div className="p-3 bg-[#FDF2F2] border border-[#F3CECE] text-[#A83232] text-xs rounded-xl flex items-center justify-between">
                    <span>{guestsError}</span>
                    <button
                      type="button"
                      onClick={() => setGuestsError(null)}
                      className="text-[#A83232] font-bold ml-2"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Ghi chú tải ảnh - Chỉ tải 1 ảnh mặt trước từ máy, không chụp camera */}
                <div className="bg-[#F8F6F0] p-4 rounded-xl border border-[#E2DDD5] text-xs text-[#736B63] space-y-1">
                  <span className="font-bold text-[#1A1615] block">
                    Quy định tải ảnh giấy tờ (CCCD / Hộ chiếu):
                  </span>
                  <p>• Chỉ cần tải lên <strong>1 ảnh mặt trước</strong> của giấy tờ từ thiết bị của bạn (hỗ trợ JPG, PNG, WEBP, tối đa 5MB).</p>
                  <p>• Người lớn & Trẻ từ 10 tuổi trở lên: Bắt buộc tải ảnh mặt trước CCCD để hệ thống nhận dạng thông tin.</p>
                  <p>• Trẻ em dưới 10 tuổi: Chỉ cần điền họ tên và ngày sinh, không bắt buộc tải giấy tờ.</p>
                </div>

                {/* Danh sách các slot */}
                <div className="space-y-6">
                  {slots.map((slot, index) => {
                    const isAdultOrRequiredDoc = slot.guest_type === 'adult' || (slot.age !== undefined && slot.age >= 10);

                    const getStatusBadge = (status: SlotStatus) => {
                      switch (status) {
                        case 'empty':
                          return (
                            <span className="bg-[#EBE6DE] text-[#736B63] text-[10px] font-semibold px-2.5 py-0.5 rounded">
                              Chưa điền
                            </span>
                          );
                        case 'ocr_processing':
                          return (
                            <span className="bg-[#EDF5F1] text-[#2A694E] text-[10px] font-semibold px-2.5 py-0.5 rounded">
                              Đang nhận dạng OCR...
                            </span>
                          );
                        case 'ocr_done':
                          return (
                            <span className="bg-[#FDF7EE] text-[#B86A1B] text-[10px] font-semibold px-2.5 py-0.5 rounded">
                              Chờ xem lại ({slot.ocr_confidence}%)
                            </span>
                          );
                        case 'confirmed':
                          return (
                            <span className="bg-[#EDF5F1] text-[#2A694E] text-[10px] font-semibold px-2.5 py-0.5 rounded">
                              ✓ Đã xác nhận
                            </span>
                          );
                        case 'pending_admin':
                          return (
                            <span className="bg-purple-100 text-purple-800 text-[10px] font-semibold px-2.5 py-0.5 rounded">
                              Chờ duyệt thủ công
                            </span>
                          );
                        case 'error':
                          return (
                            <span className="bg-[#FDF2F2] text-[#A83232] text-[10px] font-semibold px-2.5 py-0.5 rounded">
                              Cần kiểm tra lại
                            </span>
                          );
                        default:
                          return null;
                      }
                    };

                    return (
                      <div
                        key={slot.id}
                        className={`p-5 rounded-2xl border transition-colors ${
                          slot.slot_status === 'confirmed'
                            ? 'bg-white border-[#2A694E]/40'
                            : slot.slot_status === 'error'
                            ? 'bg-[#FDF2F2]/30 border-[#A83232]/40'
                            : 'bg-white border-[#E2DDD5]'
                        }`}
                      >
                        {/* Tiêu đề slot */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EBE6DE] pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#1A1615] text-white flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="font-serif font-bold text-sm text-[#1A1615]">
                              Thành viên {index + 1}:{' '}
                              {slot.guest_type === 'adult'
                                ? 'Người lớn'
                                : slot.age !== undefined && slot.age > 15
                                ? `Trẻ em (${slot.age} tuổi) • Cần CCCD • Tính 1 khách`
                                : slot.age !== undefined && slot.age >= 10
                                ? `Trẻ em (${slot.age} tuổi) • Cần CCCD • Miễn sức chứa`
                                : `Trẻ em (Dưới 10 tuổi${slot.age !== undefined ? ` - ${slot.age} tuổi` : ''}) • Miễn CCCD & sức chứa`}
                              {slot.is_booker && (
                                <span className="ml-2 text-[10px] bg-[#F7EDE8] text-[#9E472A] font-semibold px-2 py-0.5 rounded">
                                  Người đại diện
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {isAdultOrRequiredDoc ? (
                              <select
                                value={slot.id_type}
                                onChange={(e) =>
                                  handleUpdateSlotField(slot.id, 'id_type', e.target.value)
                                }
                                className="text-[11px] bg-[#F8F6F0] border border-[#D0C8BC] rounded px-2 py-1 font-semibold text-[#1A1615]"
                              >
                                <option value="cccd">CCCD Việt Nam</option>
                                <option value="passport">Hộ chiếu (Passport)</option>
                              </select>
                            ) : (
                              <span className="text-[11px] bg-[#EBE6DE] text-[#5C534B] border border-[#DCD5C9] rounded px-2.5 py-1 font-semibold">
                                Miễn CCCD (Trẻ em &lt; 10t)
                              </span>
                            )}

                            {getStatusBadge(slot.slot_status)}
                          </div>
                        </div>

                        {slot.error_message && (
                          <div className="mb-4 p-2.5 bg-[#FDF2F2] text-[#A83232] text-xs rounded-lg font-medium">
                            {slot.error_message}
                          </div>
                        )}

                        {/* Hướng dẫn nhập thông tin riêng cho trẻ em dưới 10 tuổi */}
                        {!isAdultOrRequiredDoc && (
                          <div className="mb-4 p-3.5 bg-[#FAF6F0] rounded-xl border border-[#E8E2D8] flex items-center justify-between gap-3 text-xs text-[#73665C]">
                            <div>
                              <strong className="text-[#241C18] block mb-0.5">
                                Trẻ em dưới 10 tuổi (theo ngày nhận phòng)
                              </strong>
                              <span>
                                Miễn tải ảnh giấy tờ CCCD và không tính vào sức chứa phòng. Chỉ cần nhập Họ tên và Ngày sinh của bé.
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-[#2A694E] bg-[#EDF5F1] px-2.5 py-1 rounded-md shrink-0 whitespace-nowrap">
                              ✓ Miễn CCCD &amp; Sức chứa
                            </span>
                          </div>
                        )}

                        {/* Hướng dẫn riêng cho trẻ em từ 10 đến 15 tuổi */}
                        {slot.guest_type === 'child' && slot.age !== undefined && slot.age >= 10 && slot.age <= 15 && (
                          <div className="mb-4 p-3 bg-[#EEF4FF] rounded-xl border border-[#D2E1FC] flex items-center justify-between gap-3 text-xs text-[#2452A6]">
                            <div>
                              <strong className="block mb-0.5">
                                Trẻ em từ 10 đến 15 tuổi (theo ngày nhận phòng)
                              </strong>
                              <span>
                                Bắt buộc tải ảnh mặt trước CCCD/Hộ chiếu của bé; được <strong>miễn tính 1 khách</strong> vào sức chứa phòng.
                              </span>
                            </div>
                            <span className="text-[11px] font-semibold bg-white text-[#2452A6] border border-[#B6D0F8] px-2.5 py-1 rounded-md shrink-0 whitespace-nowrap">
                              Cần CCCD • Miễn sức chứa
                            </span>
                          </div>
                        )}

                        {/* CHỈ TẢI 1 ẢNH MẶT TRƯỚC, KHÔNG CÓ MẶT SAU, KHÔNG CHỤP CAMERA (Yêu cầu 5) */}
                        {isAdultOrRequiredDoc && (
                          <div className="mb-4">
                            <span className="text-xs font-bold text-[#1A1615] block mb-2">
                              Tải ảnh mặt trước {slot.id_type === 'cccd' ? 'CCCD' : 'Hộ chiếu'}{' '}
                              <span className="text-red-500">*</span>
                            </span>

                            {slot.doc_front_path ? (
                              <div className="flex items-center gap-4 p-3 bg-[#F8F6F0] rounded-xl border border-[#E2DDD5]">
                                <img
                                  src={slot.doc_front_path}
                                  alt="Mặt trước giấy tờ"
                                  className="h-20 w-32 object-cover rounded-lg border border-[#D0C8BC]"
                                />
                                <div className="space-y-1.5 text-xs">
                                  <div className="font-medium text-[#1A1615]">
                                    Đã tải lên ảnh mặt trước thành công
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewImage({
                                          title: `Ảnh mặt trước của thành viên ${index + 1}`,
                                          url: slot.doc_front_path!,
                                        })
                                      }
                                      className="text-[#9E472A] font-semibold hover:underline cursor-pointer"
                                    >
                                      Xem ảnh phóng to
                                    </button>
                                    <span className="text-[#D0C8BC]">•</span>
                                    <label className="text-[#9E472A] font-semibold hover:underline cursor-pointer">
                                      Chọn tệp ảnh khác từ máy
                                      <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={(e) =>
                                          handleUploadFrontDoc(
                                            slot.id,
                                            e.target.files?.[0] || null
                                          )
                                        }
                                      />
                                    </label>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center p-6 bg-[#F8F6F0] rounded-xl border border-dashed border-[#D0C8BC] hover:border-[#9E472A] cursor-pointer transition-colors text-center">
                                <span className="text-xs font-bold text-[#9E472A] block">
                                  Nhấn để chọn tệp ảnh từ thiết bị
                                </span>
                                <span className="text-[11px] text-[#736B63] block mt-1">
                                  Hỗ trợ JPG, PNG, WEBP (tối đa 5MB) — Chỉ tải 1 ảnh mặt trước
                                </span>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleUploadFrontDoc(
                                      slot.id,
                                      e.target.files?.[0] || null
                                    )
                                  }
                                />
                              </label>
                            )}
                          </div>
                        )}

                        {/* Trường thông tin bóc tách / nhập tay */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="font-bold text-[#1A1615] block mb-1">
                              {slot.guest_type === 'child' ? 'Họ và tên của bé' : 'Họ và tên'}{' '}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={slot.full_name}
                              onChange={(e) =>
                                handleUpdateSlotField(slot.id, 'full_name', e.target.value)
                              }
                              placeholder={
                                slot.guest_type === 'child'
                                  ? 'Nhập họ và tên bé'
                                  : 'Họ tên trên giấy tờ'
                              }
                              className="w-full bg-[#F8F6F0] border border-[#D0C8BC] rounded-lg px-3 py-2 font-medium text-[#1A1615]"
                            />
                          </div>

                          <div>
                            <label className="font-bold text-[#1A1615] block mb-1">
                              Ngày sinh <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={slot.date_of_birth}
                              onChange={(e) =>
                                handleUpdateSlotField(slot.id, 'date_of_birth', e.target.value)
                              }
                              className="w-full bg-[#F8F6F0] border border-[#D0C8BC] rounded-lg px-3 py-2 font-medium text-[#1A1615]"
                            />
                            {slot.guest_type === 'child' && (
                              <span className="text-[10px] text-[#73665C] mt-1 block">
                                Tuổi tính đến ngày check-in:{' '}
                                <strong>
                                  {slot.age !== undefined && slot.age >= 0
                                    ? `${slot.age} tuổi`
                                    : 'Vui lòng chọn ngày sinh'}
                                </strong>
                              </span>
                            )}
                          </div>

                          <div>
                            <label className="font-bold text-[#1A1615] block mb-1">
                              {isAdultOrRequiredDoc
                                ? `Số ${slot.id_type === 'cccd' ? 'CCCD' : 'Hộ chiếu'} `
                                : 'Mã định danh / Số khai sinh '}
                              {isAdultOrRequiredDoc ? (
                                <span className="text-red-500">*</span>
                              ) : (
                                <span className="text-[10px] text-[#736B63] font-normal">
                                  (Không bắt buộc)
                                </span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={slot.id_number}
                              onChange={(e) =>
                                handleUpdateSlotField(slot.id, 'id_number', e.target.value)
                              }
                              placeholder={
                                isAdultOrRequiredDoc
                                  ? '001201009876'
                                  : 'Không bắt buộc đối với trẻ em'
                              }
                              className="w-full bg-[#F8F6F0] border border-[#D0C8BC] rounded-lg px-3 py-2 font-mono font-medium text-[#1A1615]"
                            />
                          </div>
                        </div>

                        {/* Nút xác nhận slot này */}
                        <div className="mt-4 pt-3 border-t border-[#EBE6DE] flex items-center justify-between">
                          <span className="text-[11px] text-[#736B63]">
                            {slot.slot_status === 'confirmed'
                              ? 'Đã xác nhận đầy đủ thông tin'
                              : 'Vui lòng kiểm tra kỹ trước khi bấm xác nhận'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleConfirmSlot(slot.id)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              slot.slot_status === 'confirmed'
                                ? 'bg-[#2A694E] text-white hover:bg-[#1E4D39]'
                                : 'bg-[#1A1615] text-white hover:bg-black'
                            }`}
                          >
                            {slot.slot_status === 'confirmed' ? '✓ Đã xác nhận' : 'Xác nhận thông tin'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Nút điều hướng tiếp tục (không ghi số bước) */}
                <div className="pt-4 flex items-center justify-between border-t border-[#EBE6DE]">
                  <Button variant="ghost" type="button" onClick={() => setCurrentStage('booker')}>
                    ← Quay lại thông tin người đặt
                  </Button>
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleGuestsSubmit}
                    className="font-semibold"
                  >
                    Tiếp tục: Thanh toán →
                  </Button>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* PHƯƠNG THỨC THANH TOÁN (KHÔNG GHI BƯỚC 5) */}
            {/* ========================================================= */}
            {currentStage === 'payment' && (
              <div className="space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2DDD5] shadow-xs space-y-6">
                  <div className="border-b border-[#EBE6DE] pb-4">
                    <h2 className="text-lg font-serif font-bold text-[#1A1615]">
                      Chọn phương thức thanh toán
                    </h2>
                    <p className="text-xs text-[#736B63] mt-1">
                      Thanh toán trực tiếp qua cổng thanh toán bảo mật PayOS
                    </p>
                  </div>

                  {/* Danh sách phương thức */}
                  <div className="space-y-3">
                    {/* VietQR */}
                    <div
                      onClick={() => setPaymentMethod('vietqr')}
                      className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                        paymentMethod === 'vietqr'
                          ? 'border-[#9E472A] bg-[#F7EDE8]/30 shadow-xs'
                          : 'border-[#E2DDD5] hover:bg-[#F8F6F0]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === 'vietqr'}
                            onChange={() => setPaymentMethod('vietqr')}
                            className="accent-[#9E472A] w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-bold text-[#1A1615] block">
                              Chuyển khoản VietQR tự động (PayOS)
                            </span>
                            <span className="text-[11px] text-[#736B63]">
                              Quét mã QR từ ứng dụng ngân hàng di động
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-[#EDF5F1] text-[#2A694E] px-2 py-0.5 rounded font-bold">
                          Khuyên dùng
                        </span>
                      </div>

                      {paymentMethod === 'vietqr' && (
                        <div className="mt-4 pt-4 border-t border-[#E2DDD5] grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                          <div className="md:col-span-5 flex flex-col items-center justify-center bg-white p-4 rounded-xl border border-[#D0C8BC]">
                            <div className="w-36 h-36 bg-[#1A1615] text-white flex flex-col items-center justify-center rounded-lg p-2 text-center">
                              <span className="text-xs font-mono text-white/80">VIETQR PAY</span>
                              <span className="text-sm font-bold text-amber-300 mt-2">
                                {finalTotalAmount.toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                            <span className="text-[10px] text-[#736B63] mt-2 font-mono">
                              Nội dung: <strong>{draft.booking_code}</strong>
                            </span>
                          </div>

                          <div className="md:col-span-7 space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-[#EBE6DE]">
                              <span className="text-[#736B63]">Ngân hàng:</span>
                              <strong className="text-[#1A1615]">Vietcombank (VCB)</strong>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#EBE6DE]">
                              <span className="text-[#736B63]">Số tài khoản:</span>
                              <strong className="text-[#1A1615] font-mono text-sm">1028 988 888</strong>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#EBE6DE]">
                              <span className="text-[#736B63]">Chủ tài khoản:</span>
                              <strong className="text-[#1A1615]">HOMESTAY DOI BONG GON</strong>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#EBE6DE]">
                              <span className="text-[#736B63]">Số tiền:</span>
                              <strong className="text-[#9E472A] font-mono font-bold text-sm">
                                {finalTotalAmount.toLocaleString('vi-VN')}đ
                              </strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Thẻ ATM nội địa */}
                    <div
                      onClick={() => setPaymentMethod('atm')}
                      className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                        paymentMethod === 'atm'
                          ? 'border-[#9E472A] bg-[#F7EDE8]/30 shadow-xs'
                          : 'border-[#E2DDD5] hover:bg-[#F8F6F0]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'atm'}
                          onChange={() => setPaymentMethod('atm')}
                          className="accent-[#9E472A] w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-[#1A1615] block">
                            Thẻ ATM nội địa (Napas)
                          </span>
                          <span className="text-[11px] text-[#736B63]">Hỗ trợ qua thẻ ngân hàng nội địa</span>
                        </div>
                      </div>
                    </div>

                    {/* Thẻ quốc tế */}
                    <div
                      onClick={() => setPaymentMethod('card')}
                      className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                        paymentMethod === 'card'
                          ? 'border-[#9E472A] bg-[#F7EDE8]/30 shadow-xs'
                          : 'border-[#E2DDD5] hover:bg-[#F8F6F0]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'card'}
                          onChange={() => setPaymentMethod('card')}
                          className="accent-[#9E472A] w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-[#1A1615] block">
                            Thẻ quốc tế (Visa, MasterCard, JCB)
                          </span>
                          <span className="text-[11px] text-[#736B63]">Thanh toán an toàn tiêu chuẩn 3D Secure</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nút thanh toán (không ghi số bước) */}
                  <div className="pt-4 flex items-center justify-between border-t border-[#EBE6DE]">
                    <Button variant="ghost" type="button" onClick={() => setCurrentStage('guests')}>
                      ← Quay lại danh sách người đi cùng
                    </Button>
                    {saveError && <p role="alert" className="text-red-700 text-sm mb-3">{saveError}</p>}
                    <p className="text-sm text-stone-600">Lưu đơn chờ thanh toán theo giá phòng của máy chủ. Voucher, phụ phí và thanh toán trực tuyến chưa áp dụng trong luồng này.</p>
                    <Button
                      variant="primary"
                      type="button"
                      disabled={isProcessingPayment || savedBooking !== null}
                      onClick={handleFinishPayment}
                      className="font-semibold"
                    >
                      {isProcessingPayment ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Đang lưu booking...
                        </span>
                      ) : (
                        'Lưu booking chờ thanh toán'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: TÓM TẮT CHUYẾN ĐI & GIÁ */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2DDD5] shadow-xs sticky top-16 space-y-5">
              <div className="flex items-center justify-between border-b border-[#EBE6DE] pb-3">
                <h3 className="font-serif font-bold text-base text-[#1A1615]">
                  Tóm tắt chuyến đi
                </h3>
                <span className="text-[10px] font-mono text-[#9E472A] bg-[#F7EDE8] px-2 py-0.5 rounded font-bold">
                  {draft.booking_code}
                </span>
              </div>

              {/* Thong tin phong - hien danh sach tu booking_rooms neu co */}
              {/* booking_rooms_display */}
              <div className="bg-[#F8F6F0] p-3 rounded-xl border border-[#E2DDD5] space-y-2">
                <span className="text-[10px] font-bold uppercase text-[#9E472A] block">
                  {draft.apartment_name}
                </span>
                {draft.booking_rooms && draft.booking_rooms.length > 0 ? (
                  draft.booking_rooms.map((br, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <img
                        src={br.room_type_image || draft.room_type_image}
                        alt={br.room_type_name}
                        className="w-12 h-12 object-cover rounded-lg shrink-0"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1615] font-serif leading-tight">
                          {br.room_type_name}
                        </h4>
                        <span className="text-[11px] text-[#736B63] block">
                          {br.count} phòng • Sức chứa {br.max_occupancy} khách
                        </span>
                        <span className="text-[11px] text-[#9E472A] font-semibold block">
                          {(br.price * br.count * draft.nights).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex gap-2 items-center">
                    <img
                      src={draft.room_type_image}
                      alt={draft.room_type_name}
                      className="w-12 h-12 object-cover rounded-lg shrink-0"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-[#1A1615] font-serif">
                        {draft.room_type_name}
                      </h4>
                      <span className="text-[11px] text-[#736B63] block">
                        {draft.num_rooms} phòng • {draft.nights} đêm
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Ngày */}
              <div className="grid grid-cols-2 gap-2 bg-[#F8F6F0] p-3 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-[#736B63] block">Nhận phòng</span>
                  <strong className="text-[#1A1615] block">{draft.check_in_date}</strong>
                  <span className="text-[10px] text-[#9E472A]">Từ 14:00</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#736B63] block">Trả phòng</span>
                  <strong className="text-[#1A1615] block">{draft.check_out_date}</strong>
                  <span className="text-[10px] text-[#736B63]">Trước 12:00</span>
                </div>
              </div>

              {/* Chi tiết từng đêm */}
              <div className="space-y-2 text-xs border-t border-[#EBE6DE] pt-3">
                <span className="font-bold text-[#1A1615] text-[11px] uppercase block mb-1">
                  Giá từng đêm ({draft.num_rooms} phòng):
                </span>
                {draft.price_breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[#736B63]">
                    <span>
                      Đêm {idx + 1} ({item.date}):
                    </span>
                    <span>{(item.finalPricePerRoom * draft.num_rooms).toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}

                {appliedVoucher && (
                  <div className="flex justify-between text-[#9E472A] font-semibold">
                    <span>Ưu đãi ({appliedVoucher.code}):</span>
                    <span>-{appliedVoucher.discount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
              </div>

              {/* Mã ưu đãi */}
              <div className="pt-2 border-t border-[#EBE6DE] space-y-2">
                <label className="text-[11px] font-bold text-[#1A1615] block">
                  Mã ưu đãi (Voucher):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value)}
                    placeholder="Nhập mã..."
                    className="flex-1 bg-[#F8F6F0] border border-[#D0C8BC] rounded-lg px-3 py-1.5 text-xs uppercase font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    className="bg-[#1A1615] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-black"
                  >
                    Áp dụng
                  </button>
                </div>
                {voucherMsg && (
                  <p
                    className={`text-[10px] ${
                      voucherMsg.isError ? 'text-[#A83232]' : 'text-[#2A694E]'
                    } font-semibold`}
                  >
                    {voucherMsg.text}
                  </p>
                )}
              </div>

              {/* Tổng cộng */}
              <div className="bg-[#F8F6F0] p-4 rounded-xl border border-[#D0C8BC] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#1A1615] block">Tổng thanh toán:</span>
                  <span className="text-[10px] text-[#736B63]">Đã bao gồm VAT & phụ thu</span>
                </div>
                <span className="text-xl font-serif font-bold text-[#9E472A]">
                  {finalTotalAmount.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL XEM TRƯỚC ẢNH PHÓNG TO */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EBE6DE] pb-2">
              <span className="font-bold text-sm text-[#1A1615]">{previewImage.title}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-gray-500 hover:text-black font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <img
              src={previewImage.url}
              alt="Ảnh phóng to"
              className="w-full max-h-96 object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* MODAL HẾT HẠN GIỮ CHỖ */}
      {holdExpiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <h4 className="font-serif font-bold text-lg text-[#A83232]">
              Hết hạn giữ chỗ
            </h4>
            <p className="text-xs text-[#736B63] leading-relaxed">
              Thời gian giữ phòng tự động đã kết thúc. Phòng đã được trả lại kho tìm kiếm để đảm bảo tính sẵn sàng cho khách hàng khác.
            </p>
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                setHoldExpiredModal(false);
                onGoBack();
              }}
            >
              Quay lại tìm phòng mới
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
