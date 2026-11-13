import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { customerError, customerService, CustomerBooking, CustomerProfile, CustomerScope } from '../services/customerService';
import './customer-account.css';
import { clearCustomerToken, getCustomerToken } from '../services/customerSession';
import { useCustomerToken } from '../hooks/useCustomerToken';
import { CustomerProfileForm } from '../components/CustomerProfileForm';
import { CustomerAccessForm } from '../components/CustomerAccessForm';
import { CustomerPasswordForm } from '../components/CustomerPasswordForm';
const statuses: Record<string, string> = { draft: 'Chờ hoàn tất thông tin', pending_payment: 'Chờ thanh toán', confirmed: 'Đã xác nhận', checked_in: 'Đang lưu trú', checked_out: 'Đã trả phòng', expired: 'Hết hạn', cancelled: 'Đã hủy' };
const paymentLabels: Record<string, string> = { unpaid: 'Chưa thanh toán', partial: 'Thanh toán một phần', paid: 'Đã thanh toán' };
const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const date = (s: string) => new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' });
interface Props { onGoHome: () => void; onBookRoom: () => void; initialMode?: CustomerScope; onResumeCheckout?: (id: number, scope: CustomerScope) => Promise<void> }
export const CustomerAccountPage: React.FC<Props> = ({ onGoHome, onBookRoom, onResumeCheckout, initialMode = getCustomerToken('account') || window.location.pathname === '/account' || /[?&](verify_token|reset_token|verify_email|reset_email)=/.test(window.location.search) ? 'account' : 'lookup' }) => {
  const [section, setSection] = useState<'bookings' | 'profile'>('bookings');
  const [mode, setMode] = useState<CustomerScope>(initialMode);
  const token = useCustomerToken(mode);
  const [accountAction, setAccountAction] = useState(() => /[?&](verify_token|reset_token|verify_email|reset_email)=/.test(window.location.search));
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [email, setEmail] = useState(''); const [code, setCode] = useState('');
  const emailInput = useRef<HTMLInputElement>(null);
  const otpInput = useRef<HTMLInputElement>(null);
  const lookupResult = useRef<HTMLElement>(null);
  const [sent, setSent] = useState(false); const [cooldown, setCooldown] = useState(0);
  const [challenge, setChallenge] = useState<{ email: string; purpose: 'lookup' } | null>(null);
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [emptyLookupEmail, setEmptyLookupEmail] = useState<string | null>(null);
  useEffect(() => { if (emptyLookupEmail) lookupResult.current?.focus(); }, [emptyLookupEmail]);
  const [items, setItems] = useState<CustomerBooking[]>([]); const [total, setTotal] = useState(0);
  const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    if (!token) { setProfile(null); setItems([]); setLoading(false); return; }
    setProfile(null); setItems([]);
    setLoading(true);
    customerService.me(mode).then(data => { if (active) { setProfile(data.customer); } })
      .catch(err => { if (active && !(axios.isAxiosError(err) && err.response?.status === 401)) setError(customerError(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, mode]);
  useEffect(() => { if (!cooldown) return; const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);
  useEffect(() => {
    if (!profile) return; let active = true; setLoading(true); setError(''); setItems([]);
    customerService.list(status, page, mode).then(data => { if (active) { setItems(data.items); setTotal(data.total); } })
      .catch(err => { if (!active) return; if (axios.isAxiosError(err) && err.response?.status === 401) { clearCustomerToken(undefined, mode); setProfile(null); } setError(customerError(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profile, status, page, refresh, mode]);
  const send = async (e: React.FormEvent) => {
    const submittedEmail = (emailInput.current?.value ?? email).trim().toLowerCase();
    e.preventDefault(); setBusy(true); setError(''); setNotice(''); setEmptyLookupEmail(null);
    setEmail(submittedEmail);
    try { const data = await customerService.requestOtp(submittedEmail, 'lookup'); setChallenge({ email: submittedEmail, purpose: 'lookup' }); setSent(true); setCode(''); setCooldown(data.retry_after); setNotice(`${data.message} (${submittedEmail})`); }
    catch (err) { setError(customerError(err)); } finally { setBusy(false); }
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setNotice('');
    const submittedCode = (otpInput.current?.value ?? code).replace(/\D/g, '');
    setCode(submittedCode);
    if (!/^\d{6}$/.test(submittedCode)) { setError('Vui lòng nhập đủ 6 chữ số trong email mới nhất.'); return; }
    if (!challenge) { setError('Vui lòng gửi mã xác thực trước.'); return; }
    const visibleEmail = (emailInput.current?.value ?? email).trim().toLowerCase();
    if (visibleEmail !== challenge.email) {
      setEmail(visibleEmail); setSent(false); setChallenge(null); setCode('');
      setError('Email hiển thị đã thay đổi. Vui lòng gửi mã mới cho email này.'); return;
    }
    setBusy(true);
    try {
      const data = await customerService.verifyOtp(challenge.email, challenge.purpose, submittedCode);
      setCode('');
      if (!data.customer && data.verified) {
        setSent(false); setChallenge(null);
        setEmptyLookupEmail(challenge.email);
        setNotice('Xác thực email thành công.');
        return;
      }
      setProfile(data.customer); setMode(data.scope); setNotice('');
    }
    catch (err) { setError(customerError(err)); } finally { setBusy(false); }
  };
  const logout = async () => {
    setBusy(true); setError('');
    try { await customerService.logout(mode); setProfile(null); setItems([]); setSent(false); setCode(''); setPage(1); }
    catch (err) { setError(customerError(err)); } finally { setBusy(false); }
  };
  const openDetail = (id: number) => { onResumeCheckout?.(id, mode).catch(err => setError(customerError(err))); };
  const [resuming, setResuming] = useState<number | null>(null);
  const continueBooking = async (id: number) => {
    if (!onResumeCheckout || resuming) return;
    setResuming(id); setError('');
    try { await onResumeCheckout(id, mode); } catch (err) { setError(customerError(err)); }
    finally { setResuming(null); }
  };
  const switchMode = (value: CustomerScope) => { setMode(value); setProfile(null); setSection('bookings'); setSent(false); setChallenge(null); setCode(''); setError(''); setNotice(''); setEmptyLookupEmail(null); window.history.replaceState(null, '', '/tra-cuu'); setPage(1); setStatus(''); };
  return <main className="customer-account"><div className="ca-container">
    <button className="ca-back" onClick={onGoHome}>← Trang chủ</button>
    <header className="ca-header"><div><h1>{emptyLookupEmail ? 'Kết quả tra cứu' : profile ? 'Đơn đặt phòng của bạn' : 'Tra cứu đặt phòng'}</h1><p className="ca-muted">{profile ? `${profile.full_name} · ${profile.email}` : 'Đồi Bông Gòn · Tìm lại những chuyến đi của bạn.'}</p></div>{profile && <button className="ca-button ca-secondary" onClick={logout} disabled={busy}>Đăng xuất</button>}</header>
    {error && (mode === 'account' || profile) && <div className="ca-alert" role="alert">{error}</div>}{notice && <p className="ca-notice" role="status">{notice}</p>}
    {!profile && <nav className="ca-access-tabs" aria-label="Cách tra cứu"><button type="button" aria-pressed={mode === 'lookup'} disabled={busy || loading} onClick={() => switchMode('lookup')}>Khách vãng lai · Email + OTP</button><button type="button" aria-pressed={mode === 'account'} disabled={busy || loading} onClick={() => switchMode('account')}>Khách có tài khoản · Đăng nhập</button></nav>}
    {emptyLookupEmail && mode === 'lookup' ? <section className="ca-panel ca-lookup-result" ref={lookupResult} tabIndex={-1} aria-labelledby="lookup-empty-heading" role="status">
      <span className="ca-verified-badge">✓ Email đã xác thực</span>
      <h2 id="lookup-empty-heading">Xác thực thành công — chưa có đơn đặt phòng</h2>
      <p className="ca-muted">Chưa tìm thấy đơn được lưu trong hệ thống với email <strong>{emptyLookupEmail}</strong>. Bạn không cần nhập lại OTP cho lần tra cứu này.</p>
      <p className="ca-small">Nếu đã đặt phòng bằng email khác, hãy tra cứu bằng đúng email người đặt. Bạn vẫn có thể đặt phòng mới mà không cần tạo tài khoản.</p>
      <div className="ca-actions"><button className="ca-button" onClick={onBookRoom}>Tìm phòng</button><button className="ca-button ca-secondary" onClick={() => switchMode('lookup')}>Tra cứu email khác</button></div>
    </section> : !profile || (mode === 'account' && accountAction) ? <section className="ca-auth" aria-busy={busy || loading}>
      <div className="ca-auth-copy"><h2>{mode === 'account' ? 'Tài khoản cho những chuyến đi.' : 'Tìm lại chuyến đi của bạn.'}</h2><p>{mode === 'account' ? 'Đăng nhập bằng email và mật khẩu để quản lý booking, cập nhật hồ sơ và gửi yêu cầu hỗ trợ cho kỳ lưu trú.' : 'Xác thực email đã đặt phòng để xem đơn, thanh toán, mã PIN và gửi yêu cầu hỗ trợ theo điều kiện của đơn.'}</p><p>{mode === 'account' ? 'Đăng ký bằng email từng đặt phòng sẽ liên kết các booking trước đó sau khi bạn xác minh email.' : 'Mã xác thực có hiệu lực 5 phút và chỉ sử dụng một lần.'}</p></div>
      <div className="ca-panel">{mode === 'lookup' && <h2 className="ca-auth-title">Tra cứu đặt phòng</h2>}
      {loading ? <p role="status">Đang kiểm tra phiên đăng nhập…</p> : mode === 'account' ? <CustomerAccessForm onAuthenticated={data => { setAccountAction(false); setProfile(data.customer); setMode('account'); }} /> : <>
        <form onSubmit={send} className="ca-form"><label htmlFor="customer-email">Email {mode === 'lookup' ? 'đã dùng để đặt phòng' : 'của bạn'}</label><input ref={emailInput} id="customer-email" name="email" type="email" autoComplete="email" maxLength={254} required value={email} disabled={busy} readOnly={sent} onChange={e => setEmail(e.target.value)} placeholder="Nhập email của bạn" />
        {!sent ? <button className="ca-button" disabled={busy || cooldown > 0}>{busy ? 'Đang gửi…' : cooldown ? `Gửi lại sau ${cooldown}s` : 'Gửi mã xác thực'}</button> : <div className="ca-actions"><button className="ca-link" type="button" onClick={() => { setSent(false); setCode(''); setNotice(''); }} disabled={busy}>Đổi email</button><button className="ca-link" disabled={busy || cooldown > 0}>{cooldown ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã'}</button></div>}</form>
        {error && <p className="ca-alert" role="alert">{error}</p>}
        {sent && <form onSubmit={verify} className="ca-form ca-otp" noValidate><label htmlFor="customer-otp">Mã xác thực gồm 6 chữ số</label><input ref={otpInput} id="customer-otp" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} disabled={busy} aria-describedby="customer-otp-note" onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} onPaste={e => { const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); if (digits) { e.preventDefault(); setCode(digits); setError(''); } }} autoFocus /><p id="customer-otp-note" className="ca-muted">Dùng 6 chữ số từ email mới nhất. Mỗi lần gửi lại sẽ thay thế mã trước.</p><button type="submit" className="ca-button" disabled={busy}>{busy ? 'Đang xác thực…' : challenge?.purpose === 'lookup' ? 'Xác thực và tra cứu' : 'Xác thực và đăng nhập'}</button></form>}
        <p className="ca-small">Mã xác thực sẽ được gửi đến email bạn đã dùng để đặt phòng.</p>
      </>}
      <p className="ca-auth-switch">{mode === 'lookup' ? 'Muốn quản lý các chuyến đi?' : 'Chỉ cần xem lại một đơn đặt phòng?'}{' '}<button type="button" className="ca-link" disabled={busy || loading} onClick={() => switchMode(mode === 'lookup' ? 'account' : 'lookup')}>{mode === 'lookup' ? 'Đăng nhập hoặc tạo tài khoản' : 'Tra cứu đặt phòng'}</button></p></div>
    </section> : <>
      <nav className="ca-tabs ca-account-tabs" aria-label="Quản lý tài khoản"><button aria-pressed={section === 'bookings'} onClick={() => setSection('bookings')}>{mode === 'account' ? 'Booking của tôi' : 'Các đơn đã tra cứu'}</button>{mode === 'account' && <button aria-pressed={section === 'profile'} onClick={() => setSection('profile')}>Thông tin cá nhân</button>}{mode === 'lookup' && <button onClick={() => switchMode('account')}>Đăng nhập / Tạo tài khoản</button>}<button onClick={onBookRoom}>Đặt phòng mới</button></nav>
      {section === 'profile' && mode === 'account' ? <><CustomerProfileForm key={profile.id} profile={profile} onSaved={setProfile} /><CustomerPasswordForm /></> : <>
      <div className="ca-toolbar"><label htmlFor="booking-status">Trạng thái booking <select id="booking-status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả</option>{Object.entries(statuses).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label><button className="ca-link" onClick={() => setRefresh(n => n + 1)} disabled={loading}>Làm mới</button></div>
      <div className="ca-workspace ca-workspace-list"><section className="ca-list" aria-label="Danh sách booking" aria-busy={loading}><div className="ca-section-title"><h2>Các đơn đặt phòng</h2><span>{loading ? 'Đang tải…' : `${total} đơn`}</span></div>
        {loading ? <p className="ca-empty" role="status">Đang tải booking…</p> : !items.length ? <div className="ca-empty"><h3>{error ? 'Chưa tải được booking' : 'Chưa có booking phù hợp'}</h3><p>{error ? 'Vui lòng thử làm mới danh sách.' : 'Booking liên kết theo email người đặt. Nếu đặt hộ, hãy dùng email đứng tên đặt phòng.'}</p><button className="ca-button" onClick={onBookRoom}>Tìm phòng cho chuyến đi</button></div> : items.map(b => <article key={b.id} className="ca-booking">
          <div className="ca-row"><span className="ca-code">{b.booking_code}</span><span className={`ca-status ca-status-${b.booking_status}`}>{statuses[b.booking_status] || b.booking_status}</span></div><h3>{b.apartment_name || 'Chưa có chi nhánh'}</h3><p className="ca-muted">{b.rooms.map(r => r.room_type_name || 'Loại phòng').join(' · ') || 'Chưa phân phòng'}</p><p className="ca-dates">{date(b.booked_start_time)} → {date(b.booked_end_time)}</p><div className="ca-row"><div><strong>{money(b.total_price)}</strong><span className="ca-payment">{paymentLabels[b.payment_status]}</span></div><div className="ca-actions ca-booking-actions">{b.can_continue && onResumeCheckout && <button className="ca-button" disabled={resuming !== null} onClick={() => continueBooking(b.id)}>{resuming === b.id ? 'Đang mở đơn…' : b.booking_status === 'draft' ? 'Hoàn tất thông tin' : 'Tiếp tục thanh toán'}</button>}<button className="ca-button ca-secondary" onClick={() => openDetail(b.id)}>Xem chi tiết</button></div></div>
        </article>)}
        {total > 10 && <nav className="ca-pagination" aria-label="Phân trang booking"><button className="ca-link" disabled={page === 1 || loading} onClick={() => { setPage(page - 1); }}>Trang trước</button><span>Trang {page} / {Math.ceil(total / 10)}</span><button className="ca-link" disabled={page * 10 >= total || loading} onClick={() => { setPage(page + 1); }}>Trang sau</button></nav>}
      </section></div>
      </>}
    </>}
  </div></main>;
};
