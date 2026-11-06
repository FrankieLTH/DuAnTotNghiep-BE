import React, { useState } from 'react';
import { customerError, customerService } from '../services/customerService';

export function CustomerPasswordForm() {
  const [current, setCurrent] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    const fields = new FormData(event.currentTarget);
    const next = String(fields.get('password') || '');
    if (next !== String(fields.get('confirm') || '')) { setError('Hai mật khẩu mới chưa khớp.'); return; }
    setBusy(true);
    try { await customerService.changePassword(String(fields.get('current_password') || ''), next); }
    catch (err) { setError(customerError(err)); } finally { setBusy(false); }
  };
  return <section className="ca-profile-layout ca-security" aria-labelledby="password-heading"><div><h2 id="password-heading">Bảo mật tài khoản</h2><p className="ca-muted">Đổi mật khẩu sẽ kết thúc các phiên đăng nhập tài khoản hiện có. Sau khi đổi, hãy đăng nhập lại bằng mật khẩu mới.</p></div>
    <form className="ca-form ca-panel" onSubmit={save} aria-busy={busy}>
      <label htmlFor="current-password">Mật khẩu hiện tại</label><input id="current-password" name="current_password" type="password" autoComplete="current-password" required maxLength={72} value={current} onChange={e => setCurrent(e.target.value)} disabled={busy} />
      <label htmlFor="new-password">Mật khẩu mới</label><input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} aria-describedby="change-password-note" /><p id="change-password-note" className="ca-muted">Từ 8 ký tự, tối đa 72 byte.</p>
      <label htmlFor="confirm-password">Nhập lại mật khẩu mới</label><input id="confirm-password" name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy} />
      {error && <p role="alert" className="ca-alert">{error}</p>}<button className="ca-button" disabled={busy}>{busy ? 'Đang đổi…' : 'Đổi mật khẩu và đăng nhập lại'}</button>
    </form>
  </section>;
}
