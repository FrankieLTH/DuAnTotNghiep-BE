import React, { useEffect, useState } from 'react';
import { customerError, customerService, CustomerProfile, CustomerScope } from '../services/customerService';

type FormMode = 'login' | 'register' | 'forgot' | 'verifyCode' | 'resetCode' | 'verify' | 'reset';
type PendingFlow = { kind: 'register' | 'reset'; email: string; retryAt: number };
const FLOW_KEY = 'customer_pending_verification';
function restoredFlow(): PendingFlow | null {
  try {
    const flow = JSON.parse(sessionStorage.getItem(FLOW_KEY) || 'null');
    return flow && ['register', 'reset'].includes(flow.kind) && typeof flow.email === 'string' && Number.isFinite(flow.retryAt) ? flow : null;
  } catch { return null; }
}
export function CustomerAccessForm({ onAuthenticated }: { onAuthenticated: (data: { customer: CustomerProfile; scope: CustomerScope }) => void }) {
  const [link] = useState(() => { const p = new URLSearchParams(window.location.search); return { email: p.get('email') || '', verify: p.get('verify_token') || '', reset: p.get('reset_token') || '', registrationEmail: p.get('verify_email') || '', resetEmail: p.get('reset_email') || '' }; });
  const [restored] = useState(restoredFlow);
  const [mode, setMode] = useState<FormMode>(link.verify ? 'verify' : link.reset ? 'reset' : link.resetEmail ? 'resetCode' : link.registrationEmail || restored?.kind === 'register' ? 'verifyCode' : restored?.kind === 'reset' ? 'resetCode' : 'login');
  const [email, setEmail] = useState(link.email || link.registrationEmail || link.resetEmail || restored?.email || '');
  const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [code, setCode] = useState('');
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false);
  const [resendWait, setResendWait] = useState(() => Math.max(0, Math.min(60, Math.ceil(((restored?.retryAt || 0) - Date.now()) / 1000))));
  const [error, setError] = useState(''); const [notice, setNotice] = useState(() => sessionStorage.getItem('customer_account_notice') || '');
  const titles: Record<FormMode, string> = { login: 'Đăng nhập tài khoản', register: 'Tạo tài khoản', forgot: 'Quên mật khẩu', verifyCode: 'Kiểm tra email của bạn', resetCode: 'Đặt mật khẩu mới', verify: 'Xác minh email', reset: 'Đặt mật khẩu mới' };
  const codeStep = mode === 'verifyCode' || mode === 'resetCode';
  useEffect(() => { if (!resendWait) return; const timer = window.setTimeout(() => setResendWait(n => Math.max(0, n - 1)), 1000); return () => clearTimeout(timer); }, [resendWait]);
  const clearFlow = () => sessionStorage.removeItem(FLOW_KEY);
  const change = (next: FormMode) => { clearFlow(); setMode(next); setPassword(''); setConfirm(''); setCode(''); setError(''); setNotice(''); };
  const finishLink = () => window.history.replaceState(null, '', '/account');
  const pending = (kind: PendingFlow['kind'], target: string, retryAfter = 60) => {
    setEmail(target); setResendWait(retryAfter); setCode(''); setPassword(''); setConfirm('');
    sessionStorage.setItem(FLOW_KEY, JSON.stringify({ kind, email: target, retryAt: Date.now() + retryAfter * 1000 }));
    setMode(kind === 'register' ? 'verifyCode' : 'resetCode');
  };
  const authenticated = (data: { customer: CustomerProfile; scope: CustomerScope }) => { clearFlow(); finishLink(); setPassword(''); setConfirm(''); setCode(''); onAuthenticated(data); };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setNotice(''); sessionStorage.removeItem('customer_account_notice');
    const fields = new FormData(event.currentTarget);
    const submittedEmail = String(fields.get('email') || email).trim().toLowerCase();
    const submittedPassword = String(fields.get('password') || '');
    const submittedCode = String(fields.get('code') || '').replace(/\D/g, '');
    if (codeStep && !/^\d{6}$/.test(submittedCode)) { setError('Vui lòng nhập đủ 6 chữ số trong email mới nhất.'); return; }
    if (['register', 'reset', 'resetCode'].includes(mode)) {
      if (submittedPassword.length < 8 || new TextEncoder().encode(submittedPassword).length > 72) { setError('Mật khẩu cần từ 8 ký tự và tối đa 72 byte.'); return; }
      if (submittedPassword !== String(fields.get('confirm') || '')) { setError('Hai mật khẩu chưa khớp.'); return; }
    }
    setBusy(true);
    try {
      if (mode === 'login') authenticated(await customerService.login(submittedEmail, submittedPassword));
      else if (mode === 'register') {
        const data = await customerService.register({ full_name: String(fields.get('full_name') || '').trim(), email: submittedEmail, phone: String(fields.get('phone') || '').replace(/[\s.-]/g, ''), password: submittedPassword });
        pending('register', submittedEmail, data.retry_after || 60);
      } else if (mode === 'verifyCode') authenticated(await customerService.verifyRegistration(submittedEmail, submittedCode));
      else if (mode === 'forgot') { const data = await customerService.forgotPassword(submittedEmail); pending('reset', submittedEmail, data.retry_after || 60); }
      else if (mode === 'verify') { const data = await customerService.verifyEmail(link.email, link.verify); finishLink(); change('login'); setNotice(data.message); }
      else {
        const data = mode === 'resetCode' ? await customerService.resetPasswordCode(submittedEmail, submittedCode, submittedPassword) : await customerService.resetPassword(link.email, link.reset, submittedPassword);
        finishLink(); change('login'); setNotice(data.message);
      }
    } catch (err) { setError(customerError(err)); } finally { setBusy(false); }
  };
  const resend = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const data = mode === 'verifyCode' ? await customerService.resendVerification(email) : await customerService.forgotPassword(email);
      pending(mode === 'verifyCode' ? 'register' : 'reset', email, data.retry_after || 60); setNotice('Đã yêu cầu gửi mã mới. Bạn kiểm tra email, gồm cả thư rác.');
    } catch (err) { setError(customerError(err)); } finally { setBusy(false); }
  };
  const needsPassword = ['login', 'register', 'reset', 'resetCode'].includes(mode);
  return <div className="ca-access">
    <div className="ca-row"><h2>{titles[mode]}</h2>{!['login', 'register'].includes(mode) && <button className="ca-link" type="button" disabled={busy} onClick={() => { finishLink(); change('login'); }}>Về đăng nhập</button>}</div>
    {['login', 'register'].includes(mode) && <div className="ca-tabs" aria-label="Tài khoản đã đăng ký"><button type="button" aria-pressed={mode === 'login'} onClick={() => change('login')} disabled={busy}>Đăng nhập</button><button type="button" aria-pressed={mode === 'register'} onClick={() => change('register')} disabled={busy}>Tạo tài khoản</button></div>}
    {codeStep && <p className="ca-code-intro">Nhập mã 6 số gửi tới <strong>{email}</strong>. Bạn có thể đọc email trên điện thoại rồi nhập mã tại đây.</p>}
    {error && <p className="ca-alert" role="alert">{error}</p>}{notice && <p className="ca-notice" role="status">{notice}</p>}
    <form onSubmit={submit} className="ca-form" aria-busy={busy} noValidate={codeStep}>
      {mode === 'register' && <><label htmlFor="account-name">Họ và tên</label><input id="account-name" name="full_name" autoComplete="name" required maxLength={150} value={name} onChange={e => setName(e.target.value)} disabled={busy} /><label htmlFor="account-phone">Số điện thoại (không bắt buộc)</label><input id="account-phone" name="phone" type="tel" autoComplete="tel" maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} disabled={busy} /></>}
      {!codeStep && <><label htmlFor="account-email">Email</label><input id="account-email" name="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} readOnly={mode === 'verify' || mode === 'reset'} /></>}
      {codeStep && <><label htmlFor="account-code">Mã xác minh</label><input id="account-code" className="ca-code-input" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} disabled={busy} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} onPaste={e => { const value = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); if (value) { e.preventDefault(); setCode(value); setError(''); } }} aria-describedby="account-code-note" autoFocus /><p id="account-code-note" className="ca-muted">Mã có hiệu lực 5 phút. Mỗi lần gửi lại sẽ thay mã trước.</p></>}
      {needsPassword && <><label htmlFor="account-password">{['reset', 'resetCode'].includes(mode) ? 'Mật khẩu mới' : 'Mật khẩu'}</label><div className="ca-password-field"><input id="account-password" name="password" type={show ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? 1 : 8} maxLength={72} required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} aria-describedby={mode !== 'login' ? 'account-password-note' : undefined} /><button type="button" className="ca-link" aria-pressed={show} onClick={() => setShow(v => !v)} disabled={busy}>{show ? 'Ẩn' : 'Hiện'}</button></div></>}
      {['register', 'reset', 'resetCode'].includes(mode) && <><p id="account-password-note" className="ca-muted">Từ 8 ký tự, tối đa 72 byte.</p><label htmlFor="account-confirm">Nhập lại mật khẩu</label><input id="account-confirm" name="confirm" type={show ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={72} value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy} /></>}
      {mode === 'verify' && <p className="ca-muted">Xác nhận địa chỉ email này để hoàn tất đăng ký.</p>}
      <button type="submit" className="ca-button" disabled={busy}>{busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : mode === 'register' ? 'Tạo tài khoản' : mode === 'forgot' ? 'Gửi mã đặt lại mật khẩu' : mode === 'verifyCode' ? 'Xác minh và vào tài khoản' : mode === 'verify' ? 'Xác minh email' : 'Lưu mật khẩu mới'}</button>
      {mode === 'login' && <button className="ca-link" type="button" onClick={() => change('forgot')} disabled={busy}>Quên mật khẩu?</button>}
    </form>
    {codeStep && <div className="ca-code-actions"><button type="button" className="ca-link" disabled={busy || resendWait > 0} onClick={resend}>{resendWait ? `Gửi lại mã sau ${resendWait}s` : 'Gửi lại mã'}</button><button type="button" className="ca-link" disabled={busy} onClick={() => change(mode === 'verifyCode' ? 'register' : 'forgot')}>Đổi email</button></div>}
    {mode === 'verifyCode' && <p className="ca-small">Chỉ xác minh một lần khi tạo tài khoản. Những lần sau bạn đăng nhập bằng email và mật khẩu.</p>}
    {mode === 'register' && <p className="ca-small">Đăng ký bằng email từng đặt phòng để liên kết các đơn cũ sau khi xác minh.</p>}
  </div>;
}
