import React, { useEffect, useState } from 'react';
import { customerService, customerError, CustomerBooking, CustomerRequest, CustomerRequestType, CustomerRoomOption, CustomerPin } from '../services/customerService';

export const requestLabels: Record<CustomerRequestType, string> = { cancel: 'Hủy booking', refund: 'Hoàn tiền', extend: 'Gia hạn lưu trú', change_room: 'Đổi loại phòng' };
export const requestStatusLabels = { pending: 'Chờ tiếp nhận', reviewing: 'Đang xử lý', resolved: 'Đã phản hồi xong', rejected: 'Không chấp thuận' };
const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const date = (s: string) => new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' });

export function CustomerBookingDetail({ booking: b, canManage, onClose }: { booking: CustomerBooking; canManage: boolean; onClose: () => void }) {
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [type, setType] = useState<CustomerRequestType | ''>('');
  const [reason, setReason] = useState('');
  const [endDate, setEndDate] = useState('');
  const [roomType, setRoomType] = useState('');
  const [options, setOptions] = useState<CustomerRoomOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pins, setPins] = useState<CustomerPin[] | null>(null);
  const [pinError, setPinError] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  useEffect(() => {
    let active = true; setLoading(true); setLoadError('');
    customerService.requests(b.id, canManage ? 'account' : 'lookup').then(rows => { if (active) setRequests(rows); })
      .catch(err => { if (active) setLoadError(customerError(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [b.id, reload, canManage]);
  useEffect(() => {
    if (type !== 'change_room') return;
    let active = true;
    customerService.roomOptions(b.id).then(rows => { if (active) setOptions(rows); }).catch(err => { if (active) setError(customerError(err)); });
    return () => { active = false; };
  }, [type, b.id]);
  useEffect(() => {
    if (!pins) return;
    const remaining = Math.min(...pins.map(pin => Date.parse(pin.valid_until))) - Date.now();
    const timer = window.setTimeout(() => setPins(null), Math.max(0, Math.min(remaining, 60000)));
    return () => window.clearTimeout(timer);
  }, [pins]);
  const send = async (event: React.FormEvent) => {
    event.preventDefault(); if (!type) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await customerService.createRequest(b.id, { type, reason: reason.trim(), ...(type === 'extend' ? { requested_end_date: endDate } : {}), ...(type === 'change_room' ? { requested_room_type_id: Number(roomType) } : {}) });
      setNotice(data.message); setType(''); setReason(''); setReload(n => n + 1);
    } catch (err) { setError(customerError(err)); } finally { setBusy(false); }
  };
  const reveal = async () => {
    setPinBusy(true); setPinError('');
    try { setPins(await customerService.pins(b.id)); } catch (err) { setPinError(customerError(err)); } finally { setPinBusy(false); }
  };
  const active = ['draft', 'pending_payment', 'confirmed', 'checked_in'].includes(b.booking_status) && Date.parse(b.booked_end_time) > Date.now();
  const changeable = ['confirmed', 'checked_in'].includes(b.booking_status) && active;
  const requestTypes = (Object.keys(requestLabels) as CustomerRequestType[]).filter(t => t === 'refund' ? b.paid_amount > 0 : t === 'cancel' ? active && Date.parse(b.booked_start_time) > Date.now() : changeable);
  return <section aria-label="Chi tiết booking" className="ca-detail-content">
    <div className="ca-row"><h2>{b.booking_code}</h2><button className="ca-link" onClick={onClose}>Đóng</button></div>
    <h3>{b.apartment_name || 'Chưa có chi nhánh'}</h3><p className="ca-muted">{b.address || 'Chưa có địa chỉ'}</p>
    <dl className="ca-facts"><dt>Nhận phòng</dt><dd>{date(b.booked_start_time)}</dd><dt>Trả phòng</dt><dd>{date(b.booked_end_time)}</dd><dt>Số khách</dt><dd>{b.adults} người lớn · {b.children} trẻ em</dd></dl>
    <h3>Phòng đã đặt</h3><ul className="ca-rooms">{b.rooms.map((r, i) => <li key={i}>{r.room_type_name || 'Loại phòng'}<span>{r.room_number || 'Chưa phân phòng cụ thể'}</span></li>)}</ul>
    <dl className="ca-facts"><dt>Tổng giá trị đơn</dt><dd>{money(b.total_price)}</dd><dt>Đã giảm</dt><dd>{money(b.discount_amount)}</dd><dt>Đã thanh toán (ròng)</dt><dd>{money(b.paid_amount)}</dd><dt>Còn lại theo đơn</dt><dd>{money(b.remaining_amount)}</dd></dl>
    {b.booking_status === 'pending_payment' && b.hold_expires_at && <p className="ca-small">Giữ phòng đến {date(b.hold_expires_at)}. Liên hệ lễ tân nếu cần hỗ trợ thanh toán.</p>}
    <h3>Lịch sử thanh toán</h3>
    {b.transactions?.length ? b.transactions.map(t => <p className="ca-ledger-row" key={t.id}><span>{t.type === 'refund' ? 'Hoàn tiền' : 'Thu tiền'}<small>{date(t.created_at)}</small></span><strong>{money(t.amount)}</strong></p>) : b.payments?.length ? b.payments.map(p => <p className="ca-ledger-row" key={p.id}><span>{({ pending: 'Chờ thanh toán', paid: 'Đã thanh toán', failed: 'Thất bại', refunded: 'Đã hoàn' } as Record<string, string>)[p.status] || p.status}<small>{p.paid_at ? date(p.paid_at) : 'Chưa ghi nhận ngày thu'}</small></span><strong>{money(p.amount)}</strong></p>) : <p className="ca-muted">Chưa ghi nhận giao dịch.</p>}
    {!!b.refunds?.length && <><h3>Theo dõi hoàn tiền</h3>{b.refunds.map(r => <p className="ca-ledger-row" key={r.id}><span>{({ requested: 'Đã yêu cầu', approved: 'Đã duyệt', rejected: 'Từ chối', processed: 'Đã xử lý' } as Record<string, string>)[r.status] || r.status}<small>{date(r.created_at)}</small></span><strong>{money(r.amount)}</strong></p>)}</>}
    {canManage && <section className="ca-detail-section"><h3>Mã vào cửa</h3><p className="ca-small">Chỉ hiển thị trong thời gian lưu trú, khi thanh toán đủ, giấy tờ được duyệt và mã còn hiệu lực.</p>{pins ? <><ul className="ca-pin-list">{pins.map((p, i) => <li key={i}><span>Phòng {p.room_number}</span><strong>{p.pin}</strong><small>Đến {date(p.valid_until)}</small></li>)}</ul><button className="ca-link" onClick={() => setPins(null)}>Ẩn mã</button></> : <button className="ca-button ca-secondary" disabled={pinBusy} onClick={reveal}>{pinBusy ? 'Đang kiểm tra…' : 'Xem mã vào cửa'}</button>}{pinError && <p className="ca-alert" role="alert">{pinError}</p>}</section>}
    <section className="ca-detail-section"><h3>Yêu cầu hỗ trợ booking</h3>
      {canManage && requestTypes.length > 0 && <><p className="ca-small">Nhân viên sẽ xác nhận khả năng đáp ứng và chi phí. Gửi yêu cầu chưa làm thay đổi phòng, ngày ở hoặc hoàn tiền.</p><div className="ca-request-actions">{requestTypes.map(t => <button key={t} className="ca-button ca-secondary" aria-pressed={type === t} disabled={busy || requests.some(r => r.type === t && ['pending', 'reviewing'].includes(r.status))} onClick={() => { setType(t); setError(''); setNotice(''); }}>{requestLabels[t]}</button>)}</div></>}
      {!canManage && <p className="ca-small">Đăng nhập ở mục tài khoản để cập nhật hồ sơ, xem mã và gửi yêu cầu.</p>}
      {type && <form className="ca-form ca-request-form" onSubmit={send} aria-busy={busy}><h4>{requestLabels[type]}</h4>
        {type === 'extend' && <><label htmlFor="request-end-date">Ngày trả phòng mới</label><input id="request-end-date" type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} disabled={busy} /></>}
        {type === 'change_room' && <><label htmlFor="request-room-type">Loại phòng mong muốn</label><select id="request-room-type" required value={roomType} onChange={e => setRoomType(e.target.value)} disabled={busy}><option value="">Chọn loại phòng cùng chi nhánh</option>{options.map(o => <option key={o.id} value={o.id}>{o.name} · {o.max_occupancy} khách/phòng</option>)}</select></>}
        <label htmlFor="request-reason">Lý do và nhu cầu</label><textarea id="request-reason" minLength={5} maxLength={1000} required rows={3} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} />
        <div className="ca-actions"><button className="ca-button" disabled={busy || reason.trim().length < 5}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button><button className="ca-link" type="button" onClick={() => setType('')} disabled={busy}>Đóng biểu mẫu</button></div>
      </form>}
      {error && <p className="ca-alert" role="alert">{error}</p>}{notice && <p className="ca-notice" role="status">{notice}</p>}
      {loading ? <p role="status">Đang tải yêu cầu…</p> : loadError ? <p className="ca-alert" role="alert">{loadError} <button className="ca-link" onClick={() => setReload(n => n + 1)}>Thử lại</button></p> : requests.length ? <ol className="ca-request-history">{requests.map(r => <li key={r.id}><div className="ca-row"><strong>{requestLabels[r.type]}</strong><span className="ca-status">{requestStatusLabels[r.status]}</span></div><p>{r.reason}</p>{r.requested_end_date && <p>Ngày trả phòng đề nghị: {r.requested_end_date}</p>}{r.requested_room_type_id && <p>Loại phòng đề nghị: #{r.requested_room_type_id}</p>}<small>{date(r.created_at)}</small>{r.staff_reply && <blockquote>Phản hồi: {r.staff_reply}</blockquote>}</li>)}</ol> : <p className="ca-muted">Chưa có yêu cầu hỗ trợ cho đơn này.</p>}
    </section>
    <p className="ca-small">Cần hỗ trợ gấp? <a className="ca-link" href="tel:0908888888">Gọi 0908.888.888</a></p>
  </section>;
}
