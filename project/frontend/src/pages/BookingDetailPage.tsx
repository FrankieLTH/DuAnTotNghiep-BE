import { paymentService } from '../services/paymentService';
import React, { useEffect, useState } from 'react';
import { customerService, customerError, CustomerBooking, CustomerScope } from '../services/customerService';
import { BookingDraft } from '../services/dataService';
import { CheckoutPage } from './CheckoutPage';
import { CustomerBookingDetail } from '../components/CustomerBookingDetail';
import './customer-account.css';

export function BookingDetailPage({ id, scope, onBack, onBookRoom }: { id: number; scope: CustomerScope; onBack: () => void; onBookRoom: () => void }) {
  const [booking, setBooking] = useState<CustomerBooking | null>(null);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resuming, setResuming] = useState(false);
  const resume = async () => {
    setResuming(true); setError('');
    try { await paymentService.status(id, scope); const saved = await customerService.resume(id, scope); setDraft(saved); setNotice('Đã kiểm tra lại phòng và giữ chỗ trong 15 phút. Bạn có thể điền tiếp thông tin đã lưu; vui lòng kiểm tra tổng tiền theo giá hiện tại trước khi thanh toán.'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (err) { setError(customerError(err)); } finally { setResuming(false); }
  };
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setBooking(null); setDraft(null);
    (async () => {
      try {
        if (new URLSearchParams(window.location.search).has('payment_return')) {
          const result = await paymentService.status(id, scope);
          const paid = result.payments.find(p => p.status === 'paid' || p.review_required);
          if (active) setNotice(paid ? (paid.review_required ? 'Đã ghi nhận khoản thu cần homestay kiểm tra. Vui lòng xem số tiền đã nhận trong đơn và liên hệ hỗ trợ trước khi chuyển thêm.' : 'Thanh toán thành công. Đơn đặt phòng đã được xác nhận.') : 'Chưa ghi nhận thanh toán hoàn tất. Nếu đã chuyển tiền, bấm Kiểm tra thanh toán để cập nhật; không chuyển lại khi chưa kiểm tra.');
        }
        const detail = await customerService.detail(id, scope);
        if (!active) return;
        setBooking(detail);
        if (detail.can_continue) {
          const saved = await customerService.checkout(id, scope);
          if (active) setDraft(saved);
        }
      } catch (err) { if (active) setError(customerError(err)); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [id, scope, retry]);
  const completeGuests = draft?.guests.filter(g => g.full_name?.trim() && g.date_of_birth && (g.guest_type === 'child' || g.id_number?.trim()) && g.slot_status === 'confirmed').length || 0;
  return <main className="booking-detail-page">
    <div className="customer-account ca-booking-intro"><div className="ca-container">
      <button className="ca-back" onClick={onBack}>← Danh sách đơn đặt phòng</button>
      <header className="ca-header"><div><h1>Chi tiết đơn đặt phòng{booking ? ` · ${booking.booking_code}` : ''}</h1>
        {booking && <p className="ca-muted">{booking.apartment_name} · {booking.rooms.map(r => r.room_type_name).filter(Boolean).join(' · ')}</p>}
      </div></header>
      {notice && <p className="ca-notice" role="status">{notice}</p>}
      <button className="ca-link" disabled={loading} onClick={() => { window.history.replaceState({ customerScope: scope }, '', `/tra-cuu/don/${id}?payment_return=1`); setRetry(n => n + 1); }}>Kiểm tra thanh toán</button>
      {loading && <p role="status">Đang tải thông tin đã lưu của đơn…</p>}
      {error && <div className="ca-alert" role="alert">{error} <button className="ca-link" onClick={() => setRetry(n => n + 1)}>Thử lại</button></div>}
      {draft && draft.resume_stage !== 'payment' && <section className="ca-panel ca-checkout-progress" aria-label="Thông tin cần hoàn tất">
        <h2>Thông tin cần hoàn tất</h2>
        <div className="ca-progress-grid">
          <div><h3>1. Người đặt phòng</h3><p>{draft.booker.full_name} · {draft.booker.phone}</p><p className="ca-muted">{draft.booker.email}</p><small>Thông tin đã lưu. Có thể quay lại bước Người đặt để chỉnh sửa.</small></div>
          <div><h3>2. Khách lưu trú</h3><p>{completeGuests}/{draft.num_adults + draft.num_children} người đã xác nhận thông tin</p><small>Điền họ tên, ngày sinh và giấy tờ theo yêu cầu bên dưới; xác nhận từng người để tiếp tục.</small></div>
          <div><h3>3. Thanh toán</h3><p>{draft.status === 'pending_payment' ? 'Đã đủ thông tin để chuyển sang thanh toán' : 'Hoàn tất thông tin khách trước khi thanh toán'}</p><small>Đơn giữ nguyên phòng và ngày ở đã chọn.</small></div>
        </div>
      </section>}
    </div></div>
    {!loading && draft ? <><CheckoutPage bookingData={draft} onDraftChange={setDraft} onGoBack={onBack} onCompleteBooking={onBack} />{booking && <div className="customer-account"><div className="ca-container"><CustomerBookingDetail booking={booking} scope={scope} canManage={true} onClose={onBack} requestsOnly /></div></div>}</> : !loading && booking && <div className="customer-account"><div className="ca-container"><CustomerBookingDetail booking={booking} scope={scope} canManage={true} onClose={onBack} onContinue={booking.can_resume ? resume : undefined} resuming={resuming} onBookRoom={onBookRoom} /></div></div>}
  </main>;
}
