import React, { useEffect, useState } from 'react';
import { customerService, customerError, CustomerBooking, CustomerRequest, CustomerRequestType, CustomerRoomOption, CustomerPin, CustomerScope } from '../services/customerService';

export const requestLabels: Record<CustomerRequestType, string> = { cancel: 'Hủy booking', refund: 'Hoàn tiền', extend: 'Gia hạn lưu trú', change_room: 'Đổi loại phòng' };
export const requestStatusLabels = { pending: 'Chờ tiếp nhận', reviewing: 'Đang xử lý', approved: 'Đã duyệt', resolved: 'Đã phản hồi xong', rejected: 'Không duyệt', processed: 'Đã cộng vào số dư' };
const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const date = (s: string) => new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' });

export function CustomerBookingDetail({ booking: b, canManage, onClose, scope = 'account', onContinue, resuming, onBookRoom, requestsOnly = false }: { booking: CustomerBooking; canManage: boolean; onClose: () => void; scope?: CustomerScope; onContinue?: () => void; resuming?: boolean; onBookRoom?: () => void; requestsOnly?: boolean }) {
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
    customerService.requests(b.id, scope).then(rows => { if (active) setRequests(rows); })
      .catch(err => { if (active) setLoadError(customerError(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [b.id, reload, scope]);
  useEffect(() => {
    if (type !== 'change_room') return;
    let active = true;
    customerService.roomOptions(b.id, scope).then(rows => { if (active) setOptions(rows); }).catch(err => { if (active) setError(customerError(err)); });
    return () => { active = false; };
  }, [type, b.id, scope]);
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
      const data = await customerService.createRequest(b.id, { type, reason: reason.trim(), ...(type === 'extend' ? { requested_end_date: endDate } : {}), ...(type === 'change_room' ? { requested_room_type_id: Number(roomType) } : {}) }, scope);
      setNotice(data.message); setType(''); setReason(''); setReload(n => n + 1);
    } catch (err) { setError(customerError(err)); } finally { setBusy(false); }
  };
  const reveal = async () => {
    setPinBusy(true); setPinError('');
    try { setPins(await customerService.pins(b.id, scope)); } catch (err) { setPinError(customerError(err)); } finally { setPinBusy(false); }
  };
  const active = ['draft', 'pending_payment', 'confirmed', 'checked_in'].includes(b.booking_status) && Date.parse(b.booked_end_time) > Date.now();
  const changeable = ['confirmed', 'checked_in'].includes(b.booking_status) && active;
  const requestTypes = (Object.keys(requestLabels) as CustomerRequestType[]).filter(t => t === 'refund' ? b.paid_amount > 0 && ['confirmed', 'cancelled'].includes(b.booking_status) && Date.parse(b.booked_start_time) > Date.now() : t === 'cancel' ? active && Date.parse(b.booked_start_time) > Date.now() : changeable);
  const labels: Record<string, string> = { draft: 'Chờ hoàn tất thông tin', pending_payment: 'Chờ thanh toán', confirmed: 'Đã xác nhận', checked_in: 'Đang lưu trú', checked_out: 'Đã trả phòng', expired: 'Đã hết hạn giữ phòng', cancelled: 'Đã hủy' };
  const holdEnded = ['draft', 'pending_payment'].includes(b.booking_status) && !!b.hold_expires_at && Date.parse(b.hold_expires_at) <= Date.now();
  return <section aria-label="Chi tiết booking" className="ca-detail-content bd-layout">
    {!requestsOnly && <div className="bd-overview">
      <section className="bd-card bd-stay">
        <p className="bd-eyebrow">THÔNG TIN LƯU TRÚ</p>
        <h2>{b.apartment_name || 'Chưa có chi nhánh'}</h2><p className="ca-muted">{b.address || 'Chưa có địa chỉ'}</p>
        <div className="bd-dates"><div><span>Nhận phòng</span><strong>{date(b.booked_start_time)}</strong></div><div><span>Trả phòng</span><strong>{date(b.booked_end_time)}</strong></div></div>
        <h3>Phòng đã đặt</h3><ul className="ca-rooms">{b.rooms.map((r, i) => <li key={i}><strong>{r.room_type_name || 'Loại phòng'}</strong><span>{r.room_number ? `Số phòng: ${r.room_number}` : 'Số phòng sẽ được thông báo sau khi phân phòng'}</span></li>)}</ul>
        <p className="bd-guest-count">{b.adults} người lớn{b.children > 0 ? ` · ${b.children} trẻ em` : ''}</p>
      </section>
      <aside className="bd-card bd-payment">
        <div className="bd-order"><span>Mã đặt phòng</span><strong>{b.booking_code}</strong></div>
        <span className={`bd-status bd-status-${holdEnded ? 'expired' : b.booking_status}`}>{holdEnded ? 'Đã hết hạn giữ phòng' : labels[b.booking_status] || b.booking_status}</span>
        <dl className="bd-money"><dt>Tổng giá trị đơn</dt><dd>{money(b.total_price)}</dd><dt>Giảm giá</dt><dd>{money(b.discount_amount)}</dd><dt>Đã thanh toán</dt><dd>{money(b.paid_amount)}</dd></dl>
        <div className="bd-balance"><span>Còn lại theo đơn</span><strong>{money(b.remaining_amount)}</strong></div>
        {(holdEnded || b.booking_status === 'expired') && <p className="bd-state-note">{b.can_resume ? 'Thời gian giữ chỗ đã hết. Bấm tiếp tục để kiểm tra lại phòng trống và giá hiện tại, rồi điền tiếp thông tin đã lưu.' : 'Đơn đã hết thời gian giữ chỗ và không thể tiếp tục trực tiếp. Vui lòng chọn lại phòng hoặc liên hệ lễ tân.'}</p>}
        {b.booking_status === 'cancelled' && <p className="bd-state-note">Đơn đã hủy. Liên hệ lễ tân nếu bạn cần hỗ trợ.</p>}
        {b.booking_status === 'pending_payment' && !holdEnded && b.hold_expires_at && <p className="ca-small">Giữ phòng đến {date(b.hold_expires_at)}.</p>}
        {(b.can_continue || b.can_resume) && onContinue && <button className="ca-button" onClick={onContinue} disabled={resuming}>{resuming ? 'Đang kiểm tra phòng…' : b.can_resume ? 'Tiếp tục hoàn tất đơn' : b.booking_status === 'draft' ? 'Hoàn tất thông tin' : 'Tiếp tục thanh toán'}</button>}
        {!b.can_continue && !b.can_resume && onBookRoom && <button className="ca-button" onClick={onBookRoom}>Chọn phòng và ngày ở mới</button>}
      </aside>
    </div>}
    <div className="bd-services">
    {!requestsOnly && <section className="bd-card bd-history"><h3>Lịch sử thanh toán</h3>

    {b.transactions?.length ? b.transactions.map(t => <p className="ca-ledger-row" key={t.id}><span>{t.type === 'refund' ? 'Hoàn tiền' : 'Thu tiền'}<small>{date(t.created_at)}</small></span><strong>{money(t.amount)}</strong></p>) : b.payments?.length ? b.payments.map(p => <p className="ca-ledger-row" key={p.id}><span>{({ pending: 'Chờ thanh toán', paid: 'Đã thanh toán', failed: 'Thất bại', refunded: 'Đã hoàn' } as Record<string, string>)[p.status] || p.status}<small>{p.paid_at ? date(p.paid_at) : 'Chưa ghi nhận ngày thu'}</small></span><strong>{money(p.amount)}</strong></p>) : <p className="ca-muted">Chưa ghi nhận giao dịch.</p>}
    {!!b.refunds?.length && <><h3>Theo dõi hoàn tiền</h3>{b.refunds.map(r => <p className="ca-ledger-row" key={r.id}><span>{({ requested: 'Đã yêu cầu', approved: 'Đã duyệt', rejected: 'Từ chối', processed: 'Đã xử lý' } as Record<string, string>)[r.status] || r.status}<small>{date(r.created_at)}</small></span><strong>{money(r.amount)}</strong></p>)}</>}
    </section>}
    {!requestsOnly && canManage && <section className="bd-card bd-access"><h3>Mã vào cửa</h3><p className="ca-small">Chỉ hiển thị trong thời gian lưu trú, khi thanh toán đủ, giấy tờ được duyệt và mã còn hiệu lực.</p>{pins ? <><ul className="ca-pin-list">{pins.map((p, i) => <li key={i}><span>Phòng {p.room_number}</span><strong>{p.pin}</strong><small>Đến {date(p.valid_until)}</small></li>)}</ul><button className="ca-link" onClick={() => setPins(null)}>Ẩn mã</button></> : <button className="ca-button ca-secondary" disabled={pinBusy} onClick={reveal}>{pinBusy ? 'Đang kiểm tra…' : 'Xem mã vào cửa'}</button>}{pinError && <p className="ca-alert" role="alert">{pinError}</p>}</section>}
    <section className="bd-card bd-support"><div className="ca-row"><h3>Yêu cầu hủy / hoàn và hỗ trợ</h3><button className="ca-link" disabled={loading} onClick={() => setReload(n => n + 1)}>Làm mới</button></div>
      {canManage && requestTypes.length > 0 && <><p className="ca-small">Nhân viên sẽ xác nhận khả năng đáp ứng và chi phí. Yêu cầu hủy/hoàn phải được admin duyệt hoặc từ chối. Nếu được duyệt, 50% tiền đã thanh toán sẽ cộng vào số dư dùng cho đơn sau.</p><div className="ca-request-actions">{requestTypes.map(t => <button key={t} className="ca-button ca-secondary" aria-pressed={type === t} disabled={busy || requests.some(r => r.type === t && ['pending', 'reviewing'].includes(r.status))} onClick={() => { setType(t); setError(''); setNotice(''); }}>{requestLabels[t]}</button>)}</div></>}
      {!canManage && <p className="ca-small">Đăng nhập ở mục tài khoản để cập nhật hồ sơ, xem mã và gửi yêu cầu.</p>}
      {type && <form className="ca-form ca-request-form" onSubmit={send} aria-busy={busy}><h4>{requestLabels[type]}</h4>
        {type === 'extend' && <><label htmlFor="request-end-date">Ngày trả phòng mới</label><input id="request-end-date" type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} disabled={busy} /></>}
        {type === 'change_room' && <><label htmlFor="request-room-type">Loại phòng mong muốn</label><select id="request-room-type" required value={roomType} onChange={e => setRoomType(e.target.value)} disabled={busy}><option value="">Chọn loại phòng cùng chi nhánh</option>{options.map(o => <option key={o.id} value={o.id}>{o.name} · {o.max_occupancy} khách/phòng</option>)}</select></>}
        <label htmlFor="request-reason">Lý do và nhu cầu</label><textarea id="request-reason" minLength={5} maxLength={1000} required rows={3} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} />
        <div className="ca-actions"><button className="ca-button" disabled={busy || reason.trim().length < 5}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button><button className="ca-link" type="button" onClick={() => setType('')} disabled={busy}>Đóng biểu mẫu</button></div>
      </form>}
      {error && <p className="ca-alert" role="alert">{error}</p>}{notice && <p className="ca-notice" role="status">{notice}</p>}
      {loading ? <p role="status">Đang tải yêu cầu…</p> : loadError ? <p className="ca-alert" role="alert">{loadError} <button className="ca-link" onClick={() => setReload(n => n + 1)}>Thử lại</button></p> : requests.length ? <ol className="ca-request-history">{requests.map(r => <li key={r.id}><div className="ca-row"><strong>{requestLabels[r.type]}</strong><span className="ca-status">{requestStatusLabels[r.status]}</span></div><p>{r.reason}</p>{r.refund_amount !== undefined && <p>Dự kiến hoàn 50%: {money(r.refund_amount)}</p>}{r.type === 'refund' && r.status === 'processed' && <p className="ca-small">Đã cộng 50% tiền hoàn vào số dư tài khoản.</p>}{r.requested_end_date && <p>Ngày trả phòng đề nghị: {r.requested_end_date}</p>}{r.requested_room_type_id && <p>Loại phòng đề nghị: #{r.requested_room_type_id}</p>}<small>{date(r.created_at)}</small>{r.staff_reply && <blockquote>Phản hồi: {r.staff_reply}</blockquote>}</li>)}</ol> : <p className="ca-muted">Chưa có yêu cầu hỗ trợ cho đơn này.</p>}
    </section>
    </div>
    <p className="ca-small bd-contact">Cần hỗ trợ gấp? <a className="ca-link" href="tel:0908888888">Gọi 0908.888.888</a></p>
  </section>;
}
