import { paymentService } from '../services/paymentService';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FixedTopBookingBar } from '../components/ui/FixedTopBookingBar';
import {
  BookingDraft,
  BookingGuestSlot,
  SlotStatus,
} from '../services/dataService';
import { customerService, customerError, type CustomerProfile } from '../services/customerService';
import { getCustomerToken } from '../services/customerSession';

interface CheckoutPageProps {
  bookingData?: BookingDraft | any;
  onGoBack: () => void;
  onCompleteBooking: () => void;
  onDraftChange?: (draft: BookingDraft) => void;
}

// Hàm tạo ngẫu nhiên 6 số mật khẩu Smart Lock cho từng booking
const generateBookingPin = (codeOrId?: string | number): string => {
  if (!codeOrId) return '829415';
  const str = String(codeOrId);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  const pinNum = 100000 + (hash % 900000);
  return String(pinNum);
};

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  bookingData,
  onGoBack,
  onCompleteBooking,
  onDraftChange,
}) => {
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
  const checkoutDateObj = new Date(Date.now() + 2 * 86400000);
  const checkoutStr = checkoutDateObj.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });

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
    check_in_date: todayStr,
    check_out_date: checkoutStr,
    nights: 2,
    num_adults: 2,
    num_children: 0,
    children_ages: [],
    price_breakdown: [
      {
        date: todayStr,
        dayOfWeek: 'Ngày nhận phòng',
        basePrice: 550000,
        extraFeePercent: 0,
        extraFeeAmount: 0,
        finalPricePerRoom: 550000,
      },
      {
        date: checkoutStr,
        dayOfWeek: 'Ngày trả phòng',
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
    hold_expires_at: Date.now() + 15 * 60 * 1000,
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

  const initialDraft = (() => {
    const raw = bookingData || fallbackDraft;
    if (!raw.check_in_date || raw.check_in_date < todayStr || !raw.check_out_date || raw.check_out_date <= raw.check_in_date) {
      return {
        ...raw,
        check_in_date: todayStr,
        check_out_date: checkoutStr,
        nights: 2,
      };
    }
    return raw;
  })();

  const [draft, setDraft] = useState<BookingDraft>(initialDraft);

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
      initialSlots = [];
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
  const [currentStage, setCurrentStage] = useState<Stage>(bookingData?.resume_stage || 'booker');

  // Thông tin người đặt
  const [bookerName, setBookerName] = useState(draft.booker.full_name || '');
  const [bookerEmail, setBookerEmail] = useState(draft.booker.email || '');
  const [bookerPhone, setBookerPhone] = useState(draft.booker.phone || '');
  const [isStaying, setIsStaying] = useState(draft.booker.is_staying ?? true);
  const [lockEmail, setLockEmail] = useState(draft.booker.lock_email || '');
  const [consentDataProtection, setConsentDataProtection] = useState(
    draft.booker.consent_data_protection ?? true
  );

  // OTP Email Verification
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [bookingScope, setBookingScope] = useState<'account' | 'lookup'>(bookingData?.customer_scope || 'lookup');
  const [walletAvailable, setWalletAvailable] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [existingPayment, setExistingPayment] = useState(false);
  useEffect(() => {
    if (currentStage !== 'payment' || !getCustomerToken(bookingScope)) return;
    let active = true;
    Promise.all([paymentService.wallet(bookingScope), draft.server_booking_id ? paymentService.status(draft.server_booking_id, bookingScope) : Promise.resolve({ payments: [] })])
      .then(([wallet, status]) => {
        if (!active) return;
        const pending = status.payments.find(payment => payment.status === 'pending');
        const reserved = pending?.wallet_used || 0;
        setExistingPayment(!!pending);
        setWalletAvailable(wallet.available + reserved);
        setUseWallet(reserved > 0);
      }).catch(() => { if (active) { setWalletAvailable(0); setExistingPayment(false); } });
    return () => { active = false; };
  }, [currentStage, bookingScope, draft.server_booking_id]);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [savingBooker, setSavingBooker] = useState(false);
  const [bookerError, setBookerError] = useState<string | null>(null);
  const [accountProfile, setAccountProfile] = useState<CustomerProfile | null>(null);
  const [checkingAccount, setCheckingAccount] = useState(() => !!getCustomerToken('account'));
  const [accountLoginOpen, setAccountLoginOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState(draft.booker.email || '');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  useEffect(() => {
    const scope = !bookingData?.server_booking_id && getCustomerToken('account')
      ? 'account'
      : bookingData?.customer_scope || (getCustomerToken('account') ? 'account' : 'lookup');
    if (!getCustomerToken(scope)) { setCheckingAccount(false); return; }
    let active = true;
    customerService.me(scope).then(({ customer }) => {
      if (active && (!bookingData?.server_booking_id || customer.email.toLowerCase() === bookingData.booker?.email?.toLowerCase())) {
        if (!bookingData?.server_booking_id) { setBookerName(customer.full_name); setBookerEmail(customer.email); setBookerPhone(customer.phone || ''); }
        setBookingScope(scope); setEmailVerified(true);
        if (scope === 'account') setAccountProfile(customer);
      }
    }).catch(() => { if (active) setEmailVerified(false); })
      .finally(() => { if (active) setCheckingAccount(false); });
    return () => { active = false; };
  }, []);

  const handleAccountLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError(null);
    setAccountBusy(true);
    try {
      const { customer } = await customerService.login(accountEmail, accountPassword);
      setAccountProfile(customer);
      setBookerName(customer.full_name);
      setBookerEmail(customer.email);
      setBookerPhone(customer.phone || '');
      setBookingScope('account');
      setEmailVerified(true);
      setOtpSent(false);
      setOtpCode('');
      setOtpError(null);
      setAccountPassword('');
      setAccountLoginOpen(false);
    } catch (error) { setAccountError(customerError(error)); }
    finally { setAccountBusy(false); }
  };

  // Danh sách slot người đi cùng (khởi tạo đầy đủ cả người lớn và trẻ em)
  const [slots, setSlots] = useState<BookingGuestSlot[]>(() => buildInitialSlots(draft));

  const [guestDraftNotice, setGuestDraftNotice] = useState('');
  useEffect(() => {
    if (!draft.server_booking_id || currentStage !== 'guests' || draft.status !== 'pending_info') return;
    let active = true;
    setGuestDraftNotice('Đang lưu thông tin…');
    const timer = window.setTimeout(() => {
      customerService.saveGuestDraft(draft.server_booking_id!, slots.map(g => ({ full_name: g.full_name, date_of_birth: g.date_of_birth, guest_type: g.guest_type, is_booker: g.is_booker, is_foreigner: g.is_foreigner, id_type: g.id_type, id_number: g.id_number, slot_status: g.slot_status })), bookingScope)
        .then(() => { if (active) setGuestDraftNotice('Đã lưu thông tin người ở.'); })
        .catch(error => { if (active) setGuestDraftNotice(customerError(error)); });
    }, 500);
    return () => { active = false; window.clearTimeout(timer); };
  }, [draft.server_booking_id, currentStage, slots, bookingScope, draft.status]);

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
    setOtpError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookerEmail.trim())) {
      setOtpError('Vui lòng nhập địa chỉ email hợp lệ để nhận mã xác thực.');
      return;
    }
    try {
      await customerService.requestOtp(bookerEmail, 'booking');
      setOtpCode('');
      setOtpSent(true);
    }
    catch (error) { setOtpError(customerError(error)); }
  };
  const handleVerifyOtp = async () => {
    setOtpError(null);
    const code = otpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setOtpError('Vui lòng nhập đủ 6 chữ số trong email xác thực mới nhất.');
      return;
    }
    try { await customerService.verifyOtp(bookerEmail, 'booking', code); setBookingScope('lookup'); setEmailVerified(true); }
    catch (error) { setOtpError(customerError(error)); }
  };

  // Xác nhận thông tin người đặt
  const handleBookerSubmit = async (e: React.FormEvent) => {
    if (savingBooker) return;
    e.preventDefault();
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

    if (!emailVerified) {
      setBookerError('Vui lòng xác thực email bằng OTP trước khi tiếp tục. Nếu đã có tài khoản, bạn có thể đăng nhập tại mục Tra cứu.');
      return;
    }

    setSavingBooker(true);
    try {
      const selected = draft.booking_rooms?.length ? draft.booking_rooms.map(r => ({ room_type_id: r.room_type_id, quantity: r.count, room_ids:r.room_ids, extra_beds: r.extra_beds ?? (r.has_extra_bed ? 1 : 0) })) : [{ room_type_id: draft.room_type_id, quantity: draft.num_rooms || 1 }];
      const saved = draft.server_booking_id
        ? await customerService.updateBooker(draft.server_booking_id, { full_name: bookerName, phone: bookerPhone.replace(/[\s.-]/g, ''), is_staying: isStaying }, bookingScope)
        : await customerService.startDraft({ email: bookerEmail, full_name: bookerName, phone: bookerPhone.replace(/[\s.-]/g, ''), is_staying: isStaying, selected_rooms: selected, stay_type: draft.stay_type || 'fullday', adults: draft.num_adults, children: draft.num_children, check_in_date: draft.check_in_date, check_out_date: draft.check_out_date }, bookingScope);
      const next: BookingDraft = { ...draft, server_booking_id: saved.booking_id, booking_code: saved.booking_code, total_price: saved.total_price, room_subtotal: saved.total_price, hold_expires_at: Date.parse(saved.hold_expires_at), customer_scope: bookingScope, resume_stage: 'guests', booker: { full_name: bookerName, email: bookerEmail, phone: bookerPhone, is_staying: isStaying, email_verified: true, consent_data_protection: consentDataProtection }, guests: slots };
      setDraft(next); onDraftChange?.(next);
      setCurrentStage('guests'); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) { setBookerError(customerError(error)); }
    finally { setSavingBooker(false); }
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

  const [savingGuests, setSavingGuests] = useState(false);
  const handleGuestsSubmit = async () => {
    if (savingGuests || !validateGuestsStage()) return;
    if (!draft.server_booking_id) { setGuestsError('Vui lòng quay lại bước người đặt để lưu đơn trước.'); return; }
    setSavingGuests(true);
    try {
      const saved = await customerService.completeCheckout(draft.server_booking_id, slots.map(g => ({ full_name: g.full_name, date_of_birth: g.date_of_birth, guest_type: g.guest_type, is_booker: g.is_booker, is_foreigner: g.is_foreigner, id_type: g.id_type, id_number: g.id_number })), bookingScope);
      const next = await customerService.checkout(draft.server_booking_id, bookingScope);
      setDraft(next); onDraftChange?.(next); setCurrentStage('payment'); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) { setGuestsError(customerError(error)); }
    finally { setSavingGuests(false); }
  };

  // The saved server total already includes any validated discount.
  const finalTotalAmount = draft.remaining_amount ?? draft.total_price;

  const [saveError, setSaveError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Mã PIN mở cửa Smart Lock tạo ngẫu nhiên 6 số duy nhất theo từng mã đơn booking
  const bookingPin = useMemo(() => generateBookingPin(draft.booking_code || draft.server_booking_id), [draft.booking_code, draft.server_booking_id]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFinishPayment = async () => {
    if (isProcessingPayment || !draft.server_booking_id) return;
    setIsProcessingPayment(true); setSaveError('');
    try {
      const result = await paymentService.create(draft.server_booking_id, bookingScope, useWallet);
      // A normal same-tab redirect keeps the guest's sessionStorage OTP session.
      const returnPath = `/tra-cuu/don/${draft.server_booking_id}`;
      sessionStorage.setItem(`payment_scope_${draft.server_booking_id}`, bookingScope);
      if (result.status === 'paid') { window.location.assign(returnPath + '?payment_return=1'); return; }
      if (!result.checkout_url) throw new Error('Missing checkout URL');
      const target = new URL(result.checkout_url);
      if (target.protocol !== 'https:' || !(target.hostname === 'pay.payos.vn' || target.hostname.endsWith('.payos.vn'))) throw new Error('Invalid checkout URL');
      // Back from PayOS goes to this exact saved booking, never a new reservation.
      window.history.replaceState({ customerScope: bookingScope }, '', returnPath);
      window.location.assign(target.href);
    } catch (error) { setSaveError(customerError(error)); }
    finally { setIsProcessingPayment(false); }
  };

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
          <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs bg-[#F8F6F0] p-1.5 rounded-xl border border-[#E2DDD5]">
            <span
              className={`px-2 sm:px-3 py-1 rounded font-semibold whitespace-nowrap transition-colors ${
                currentStage === 'booker'
                  ? 'bg-[#1A1615] text-white'
                  : 'text-[#2A694E] bg-[#EDF5F1]'
              }`}
            >
              Người đặt
            </span>

            <span className="text-[#D0C8BC]">→</span>

            <span
              className={`px-2 sm:px-3 py-1 rounded font-semibold whitespace-nowrap transition-colors ${
                currentStage === 'guests'
                  ? 'bg-[#1A1615] text-white'
                  : currentStage === 'payment'
                  ? 'text-[#2A694E] bg-[#EDF5F1]'
                  : 'text-[#736B63]'
              }`}
            >
              Khách lưu trú ({slots.length})
            </span>

            <span className="text-[#D0C8BC]">→</span>

            <span
              className={`px-2 sm:px-3 py-1 rounded font-semibold whitespace-nowrap transition-colors ${
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

                {accountProfile ? (
                  <div className="rounded-xl border border-[#B9DAC9] bg-[#F0F8F2] px-4 py-3 text-xs text-[#225B42]" role="status">
                    <strong>Đang đặt phòng bằng tài khoản {accountProfile.email}</strong>
                    <span className="block mt-1">Thông tin liên hệ đã được điền từ tài khoản. Bạn không cần xác thực OTP lần nữa.</span>
                  </div>
                ) : !draft.server_booking_id && (
                  <div className="rounded-xl border border-[#E2DDD5] bg-[#F8F6F0] px-4 py-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[#1A1615] font-semibold">Đã có tài khoản? Đăng nhập để tự điền thông tin và bỏ qua OTP.</span>
                      <button type="button" className="font-bold text-[#9E472A] underline" onClick={() => { setAccountLoginOpen(value => !value); setAccountError(null); }}>
                        {accountLoginOpen ? 'Đóng đăng nhập' : 'Đăng nhập tài khoản'}
                      </button>
                    </div>
                    {accountLoginOpen && (
                      <form onSubmit={handleAccountLogin} className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                        <label className="font-semibold">Email tài khoản
                          <input type="email" required autoComplete="username" value={accountEmail} onChange={event => setAccountEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-[#D0C8BC] bg-white px-3 py-2" />
                        </label>
                        <label className="font-semibold">Mật khẩu
                          <input type="password" required autoComplete="current-password" value={accountPassword} onChange={event => setAccountPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-[#D0C8BC] bg-white px-3 py-2" />
                        </label>
                        <button type="submit" disabled={accountBusy} className="rounded-lg bg-[#9E472A] px-4 py-2 text-white font-bold disabled:opacity-50">{accountBusy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
                        {accountError && <p className="sm:col-span-3 text-[#A83232]" role="alert">{accountError}</p>}
                      </form>
                    )}
                  </div>
                )}

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

                <form onSubmit={handleBookerSubmit} aria-busy={savingBooker} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#1A1615] block mb-1">
                        Họ và tên người đặt <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={bookerName}
                        onChange={(e) => setBookerName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Nhật Huy"
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
                          readOnly={!!draft.server_booking_id || !!accountProfile}
                          onChange={(e) => {
                            setBookerEmail(e.target.value);
                            setEmailVerified(false);
                            setOtpSent(false);
                            setOtpCode('');
                            setOtpError(null);
                          }}
                          placeholder="huy.nguyen@homestay.com"
                          className="flex-1 bg-[#F8F6F0] border border-[#D0C8BC] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1615] font-medium outline-none focus:border-[#9E472A]"
                        />
                        {!accountProfile && !checkingAccount && <button
                          type="button"
                          onClick={handleSendOtp}
                          className="bg-[#1A1615] hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                        >
                          {otpSent ? 'Gửi lại mã OTP' : 'Gửi mã OTP'}
                        </button>}
                      </div>

                      {checkingAccount && <p className="text-[11px] text-[#736B63]">Đang kiểm tra phiên đăng nhập…</p>}

                      {otpSent && !emailVerified && (
                        <div className="bg-[#F8F6F0] p-3 rounded-xl border border-[#D0C8BC] space-y-2 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-[#1A1615] block">Mã xác thực OTP (6 chữ số)</span>
                              <span className="text-[10px] text-[#736B63]">
                                Hệ thống đã gửi mã OTP đến <strong>{bookerEmail}</strong>. Vui lòng kiểm tra Hộp thư đến (hoặc Thư rác/Spam). Mã có hiệu lực trong 5 phút.
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                aria-label="Mã xác thực 6 số từ email"
                                placeholder="Nhập 6 số"
                                className="w-28 text-center tracking-widest font-mono font-bold bg-white border border-[#D0C8BC] rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#C85A32]"
                              />
                              <button
                                type="button"
                                onClick={handleVerifyOtp}
                                className="bg-[#2A694E] text-white px-3 py-1.5 rounded-lg font-bold hover:bg-[#1E4D39] text-xs transition-colors cursor-pointer shrink-0"
                              >
                                Xác thực
                              </button>
                            </div>
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

                  <p className="text-xs text-[#736B63]">Nhấn Tiếp tục để lưu đơn giữ chỗ. Sau đó bạn có thể mở lại đơn tại Tra cứu trong thời gian giữ phòng.</p>
                  {/* Nút tiếp tục (không ghi số bước) */}
                  <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#EBE6DE]">
                    <Button variant="ghost" type="button" onClick={onGoBack}>
                      {draft.server_booking_id ? '← Quay lại danh sách đơn' : '← Quay lại chọn phòng'}
                    </Button>
                    <Button variant="primary" type="submit" disabled={savingBooker} className="font-semibold">
                      {savingBooker ? 'Đang lưu đơn giữ chỗ…' : `Tiếp tục: Điền thông tin người đi cùng (${slots.length} người) →`}
                    </Button>
                  </div>
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
                        {draft.num_adults} người lớn (≥ 15 tuổi)
                        {draft.num_children > 0 ? `, ${draft.num_children} trẻ em (< 15 tuổi)` : ''}
                      </span>{' '}
                      ({slots.length} thành viên)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onGoBack}
                    className="text-xs font-semibold text-[#9E472A] hover:underline shrink-0"
                  >
                    {draft.server_booking_id ? 'Quay lại danh sách đơn' : 'Sửa số khách (quay về chọn phòng)'}
                  </button>
                </div>

                <p className="text-xs text-[#736B63]" role="status">{guestDraftNotice} Ảnh giấy tờ chỉ được xem trước trong lần nhập này; thông tin người ở được lưu để tiếp tục đơn.</p>
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
                      disabled={savingGuests}
                    className="font-semibold"
                  >
                    Tiếp tục: Thanh toán →
                  </Button>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* PHƯƠNG THỨC THANH TOÁN */}
            {/* ========================================================= */}
            {currentStage === 'payment' && (
              <div className="space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2DDD5] shadow-xs space-y-6">
                  <div className="border-b border-[#EBE6DE] pb-4">
                    <h2 className="text-xl font-serif font-bold text-[#1A1615]">
                      Chọn phương thức thanh toán
                    </h2>
                    <p className="text-xs text-[#736B63] mt-1">
                      Quét mã VietQR chuyển khoản tức thì hoặc qua cổng thanh toán PayOS
                    </p>
                  </div>

                  {walletAvailable > 0 && (
                    <label className="flex gap-3 rounded-xl border border-[#D7B9A9] bg-[#F8F6F0] p-4 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useWallet}
                        disabled={isProcessingPayment || existingPayment}
                        onChange={(e) => setUseWallet(e.target.checked)}
                      />
                      <span>
                        <strong>Dùng số dư hoàn tiền ví</strong>
                        <br />
                        Có thể dùng {Math.min(walletAvailable, finalTotalAmount).toLocaleString('vi-VN')}đ.
                      </span>
                    </label>
                  )}

                  {/* LỰA CHỌN PHƯƠNG THỨC THANH TOÁN */}
                  <div className="space-y-4">
                    <div className="p-5 sm:p-6 rounded-2xl border border-[#9E472A] bg-[#FCF8F5] ring-1 ring-[#9E472A] shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment_method"
                            checked={true}
                            readOnly
                            className="accent-[#9E472A] w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <span className="text-sm font-bold text-[#1A1615] block">
                              Chuyển khoản ngân hàng qua PayOS (VietQR)
                            </span>
                            <span className="text-xs text-[#736B63]">
                              Bạn sẽ được chuyển đến trang PayOS để quét mã QR hoặc mở ứng dụng ngân hàng. Mã thanh toán gắn với đúng đơn #{draft.booking_code}.
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#9E472A] bg-white px-2.5 py-1 rounded-md border border-[#E2DDD5]">
                          VietQR / PayOS
                        </span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-[#E8DFD1] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <span className="text-[#736B63]">Số tiền thanh toán qua PayOS:</span>
                        <strong className="text-lg font-bold font-serif text-[#9E472A]">
                          {(finalTotalAmount - (useWallet ? Math.min(walletAvailable, finalTotalAmount) : 0)).toLocaleString('vi-VN')}đ
                        </strong>
                      </div>
                      <p className="text-[11px] text-[#736B63] italic mt-2">
                        💡 Hệ thống PayOS tự động xác thực giao dịch trong 3-5 giây và cấp mã mở cửa ngay lập tức.
                      </p>
                    </div>
                  </div>

                  {saveError && <p role="alert" className="text-sm text-red-700 bg-red-50 p-3 rounded-xl border border-red-200">{saveError}</p>}

                  {/* NÚT THAO TÁC THANH TOÁN */}
                  <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#EBE6DE]">
                    <Button variant="ghost" type="button" onClick={() => setCurrentStage('guests')}>
                      ← Thông tin khách
                    </Button>

                    <Button
                      variant="primary"
                      type="button"
                      disabled={isProcessingPayment}
                      onClick={handleFinishPayment}
                      className="font-bold py-3 px-8 shadow-md text-sm"
                    >
                      {isProcessingPayment ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Đang kết nối PayOS…
                        </span>
                      ) : (
                        'Thanh toán qua PayOS →'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* GIAI ĐOẠN ĐẶT PHÒNG & KÍCH HOẠT MÃ PIN THÀNH CÔNG */}
            {/* ========================================================= */}
            {currentStage === 'confirmed' && (
              <div className="bg-white p-6 sm:p-10 rounded-3xl border border-[#E2DDD5] shadow-lg text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-xs">
                  ✓
                </div>

                <div>
                  <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full mb-2">
                    Thanh Toán &amp; Đặt Phòng Thành Công
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1A1615]">
                    Đặt Phòng &amp; Kích Hoạt Mã PIN Thành Công!
                  </h1>
                  <p className="text-xs sm:text-sm text-[#736B63] mt-2">
                    Mã đơn hàng: <strong className="font-mono text-[#9E472A]">#{draft.booking_code}</strong> • {draft.apartment_name}
                  </p>
                </div>

                {/* HỘP HIỂN THỊ MÃ PIN SMART LOCK MỞ CỬA TTLOCK */}
                <div className="bg-[#241812] text-white p-6 sm:p-8 rounded-2xl shadow-inner space-y-3 max-w-lg mx-auto">
                  <span className="text-xs font-bold text-[#F4BE9B] uppercase tracking-widest block">
                    MÃ PIN SMART LOCK MỞ CỬA CỦA BẠN (CÓ HIỆU LỰC TỪ 14:00)
                  </span>
                  <div className="flex items-center justify-center gap-2 sm:gap-3 text-3xl sm:text-4xl font-mono font-bold text-[#F4BE9B] tracking-widest my-3">
                    {bookingPin.split('').map((digit: string, i: number) => (
                      <span key={i} className="bg-white/10 px-3.5 py-2 rounded-xl">{digit}</span>
                    ))}
                  </div>
                  <p className="text-xs text-white/80">
                    Cách mở cửa: Chạm lòng bàn tay bật sáng bàn phím ➔ Nhập <strong className="text-white">{bookingPin}</strong> ➔ Nhấn phím <strong className="text-white">#</strong>
                  </p>
                </div>

                <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E8DFD1] text-xs text-[#5C534B] text-left space-y-1.5 max-w-lg mx-auto">
                  <p>📩 Mã PIN và hướng dẫn nhận phòng đã được gửi tự động qua email <strong>{bookerEmail || 'của bạn'}</strong>.</p>
                  <p>🕒 Nhận phòng: <strong>14:00 ngày {draft.check_in_date.split('-').reverse().join('/')}</strong> | Trả phòng: <strong>12:00 ngày {draft.check_out_date.split('-').reverse().join('/')}</strong></p>
                  <p>📞 Hotline quản gia 24/7 giải đáp trực tiếp: <strong>0908.888.888</strong></p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    variant="primary"
                    type="button"
                    onClick={onCompleteBooking || onGoBack}
                    className="w-full sm:w-auto px-8 font-bold"
                  >
                    Về Trang Chủ
                  </Button>
                  <a
                    href={`/tra-cuu/don/${draft.server_booking_id || ''}`}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-[#D0C8BC] text-xs font-semibold text-[#1A1615] hover:bg-[#FAF8F5] transition-colors"
                  >
                    Xem chi tiết đơn tại Tra cứu →
                  </a>
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
                      {(br.room_type_image || draft.room_type_image) && <img src={br.room_type_image || draft.room_type_image} alt={br.room_type_name} className="w-12 h-12 object-cover rounded-lg shrink-0" />}
                      <div>
                        <h4 className="text-xs font-bold text-[#1A1615] font-serif leading-tight">
                          {br.room_type_name}
                        </h4>
                        <span className="text-[11px] text-[#736B63] block">
                          {br.count} phòng • Sức chứa {br.max_occupancy} khách{br.has_extra_bed ? ' · Có nệm phụ' : ''}
                        </span>
                        <span className="text-[11px] text-[#9E472A] font-semibold block">
                          {Math.round(br.price * br.count * draft.nights + (br.has_extra_bed ? 150000 * draft.nights : 0)).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex gap-2 items-center">
                    {draft.room_type_image && <img src={draft.room_type_image} alt={draft.room_type_name} className="w-12 h-12 object-cover rounded-lg shrink-0" />}
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

              {/* Chi tiết từng đêm theo form chuẩn */}
              {(() => {
                const nightsCount = Math.max(1, draft.nights || 1);
                const nightlyRoomPrice = Math.round((draft.room_subtotal || draft.total_price) / nightsCount);
                const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
                const nightsList = Array.from({ length: nightsCount }, (_, idx) => {
                  const d = new Date(new Date(draft.check_in_date).getTime() + idx * 86400000);
                  const dayName = isNaN(d.getTime()) ? `Đêm ${idx + 1}` : dayNames[d.getDay()];
                  const dateFormatted = isNaN(d.getTime()) ? '' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                  return {
                    label: `Đêm ${idx + 1} · ${dayName} ${dateFormatted}`.trim(),
                    price: nightlyRoomPrice
                  };
                });
                const roomTotalAllNights = nightlyRoomPrice * nightsCount;
                const vatAmount = Math.round(finalTotalAmount * 10 / 110);

                return (
                  <div className="space-y-2.5 text-xs border-t border-[#EBE6DE] pt-4 font-mono">
                    <span className="font-bold text-[#1A1615] text-[12px] block mb-2 font-sans">
                      Chi tiết giá · {draft.num_rooms} phòng · {nightsCount} đêm
                    </span>

                    {/* Từng đêm */}
                    {nightsList.map((night, idx) => (
                      <div key={idx} className="flex justify-between text-[#443E38] py-0.5">
                        <span>{night.label}</span>
                        <span className="font-semibold text-[#1A1615]">{night.price.toLocaleString('vi-VN')}đ</span>
                      </div>
                    ))}

                    {/* Tiền phòng tổng số đêm */}
                    <div className="flex justify-between font-bold text-[#1A1615] pt-1 border-t border-stone-200">
                      <span>Tiền phòng ({nightsCount} đêm)</span>
                      <span>{roomTotalAllNights.toLocaleString('vi-VN')}đ</span>
                    </div>

                    {/* Voucher nếu có */}
                    {draft.discount_amount > 0 && (
                      <div className="flex justify-between text-[#9E472A] font-semibold">
                        <span>Voucher ưu đãi</span>
                        <span>−{draft.discount_amount.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}

                    {/* Đường phân cách */}
                    <div className="border-t border-dashed border-[#B8B0A2] my-2"></div>

                    {/* Tổng thanh toán */}
                    <div className="flex justify-between items-baseline text-sm font-bold text-[#1A1615] pt-1">
                      <span className="font-sans text-base">Tổng thanh toán</span>
                      <span className="text-xl font-serif text-[#9E472A]">
                        {finalTotalAmount.toLocaleString('vi-VN')}đ
                      </span>
                    </div>

                    {/* Dòng VAT */}
                    <div className="flex justify-between text-[11px] text-[#736B63] italic">
                      <span className="pl-2">Đã gồm VAT 10%</span>
                      <span>{vatAmount.toLocaleString('vi-VN')}đ</span>
                    </div>

                    {(draft.paid_amount || 0) > 0 && (
                      <div className="flex justify-between text-[#2A694E] font-semibold pt-1 border-t">
                        <span>Đã nhận thanh toán</span>
                        <span>{draft.paid_amount!.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                  </div>
                );
              })()}

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
