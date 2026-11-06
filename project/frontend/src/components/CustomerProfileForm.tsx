import React, { useState } from 'react';
import { customerError, customerService, CustomerProfile } from '../services/customerService';

export function CustomerProfileForm({ profile, onSaved }: { profile: CustomerProfile; onSaved: (profile: CustomerProfile) => void }) {
  const [name, setName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const data = await customerService.updateProfile({ full_name: name.trim(), phone: phone.replace(/[\s.-]/g, '') });
      onSaved(data.customer); setNotice('Đã lưu thông tin tài khoản.');
    } catch (err) { setError(customerError(err)); } finally { setBusy(false); }
  };
  return <section className="ca-profile-layout" aria-labelledby="profile-heading">
    <div><h2 id="profile-heading">Thông tin cá nhân</h2><p className="ca-muted">Thông tin này được dùng khi bạn đặt phòng. Email đã xác thực là địa chỉ sở hữu các booking của bạn.</p><p className="ca-small">Cần đổi email? Liên hệ lễ tân để xác minh và hỗ trợ chuyển thông tin.</p></div>
    <form className="ca-panel ca-form" onSubmit={save} aria-busy={busy}>
      <label htmlFor="profile-name">Họ và tên</label><input id="profile-name" autoComplete="name" maxLength={150} required value={name} onChange={e => { setName(e.target.value); setNotice(''); }} disabled={busy} />
      <label htmlFor="profile-email">Email đã xác thực</label><input id="profile-email" type="email" value={profile.email} readOnly aria-describedby="profile-email-note" /><p id="profile-email-note" className="ca-muted">Email được giữ cố định để bảo vệ quyền truy cập booking.</p>
      <label htmlFor="profile-phone">Số điện thoại</label><input id="profile-phone" type="tel" autoComplete="tel" maxLength={30} value={phone} onChange={e => { setPhone(e.target.value); setNotice(''); }} disabled={busy} aria-describedby="profile-phone-note" /><p id="profile-phone-note" className="ca-muted">Có thể để trống; nhập số Việt Nam bắt đầu bằng 0 hoặc +84.</p>
      {error && <p className="ca-alert" role="alert">{error}</p>}{notice && <p className="ca-notice" role="status">{notice}</p>}
      <button className="ca-button" disabled={busy || !name.trim()}>{busy ? 'Đang lưu…' : 'Lưu thông tin'}</button>
    </form>
  </section>;
}
