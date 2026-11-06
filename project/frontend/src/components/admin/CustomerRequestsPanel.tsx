import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { customerError, CustomerRequest } from '../../services/customerService';
import { requestLabels, requestStatusLabels } from '../CustomerBookingDetail';
import { AdminUser } from './AdminLayout';

type RequestRow = CustomerRequest & { booking_code: string; customer_name: string };
export function CustomerRequestsPanel({ currentUser, selectedBranchId }: { currentUser: AdminUser; selectedBranchId: number }) {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [showClosed, setShowClosed] = useState(false);
  const headers = { 'x-staff-role': currentUser.role, 'x-staff-actor': currentUser.email, 'x-staff-apartment-id': String(currentUser.role === 'manager' ? currentUser.branchId || 1 : selectedBranchId || '') };
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    api.get('/admin/customer-requests', { headers }).then(r => { if (active) setRows(r.data); })
      .catch(err => { if (active) setError(customerError(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentUser.id, currentUser.role, currentUser.branchId, selectedBranchId, refresh]);
  const respond = async (status: 'reviewing' | 'resolved' | 'rejected') => {
    if (!selected || reply.trim().length < 5) return;
    setBusy(true); setError('');
    try { await api.put(`/admin/customer-requests/${selected}`, { status, staff_reply: reply.trim() }, { headers }); setSelected(null); setReply(''); setRefresh(n => n + 1); }
    catch (err) { setError(customerError(err)); } finally { setBusy(false); }
  };
  const visible = rows.filter(r => showClosed || ['pending', 'reviewing'].includes(r.status));
  return <section className="bg-white border border-[#E5E0D8] rounded-md p-4 space-y-3" aria-labelledby="customer-requests-heading">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="customer-requests-heading" className="text-sm font-semibold">Yêu cầu từ khách hàng</h3><div className="flex gap-4 text-xs"><label className="flex gap-2 items-center"><input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} />Cả yêu cầu đã kết thúc</label><button onClick={() => setRefresh(n => n + 1)} disabled={loading} className="underline">Làm mới</button></div></div>
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {loading ? <p role="status" className="text-sm">Đang tải yêu cầu…</p> : !visible.length ? <p className="text-sm text-stone-600">Chưa có yêu cầu {showClosed ? '' : 'cần xử lý'}.</p> : <div className="space-y-3">{visible.map(r => <article key={r.id} className="border-t border-stone-200 pt-3 text-sm space-y-2"><div className="flex flex-wrap justify-between gap-2"><strong>{r.booking_code} · {requestLabels[r.type]}</strong><span>{requestStatusLabels[r.status]}</span></div><p>{r.customer_name}: {r.reason}</p>{r.requested_end_date && <p>Ngày trả phòng mong muốn: {r.requested_end_date}</p>}{r.requested_room_type_id && <p>Loại phòng mong muốn: #{r.requested_room_type_id}</p>}{r.staff_reply && <p className="text-stone-600">Phản hồi: {r.staff_reply}</p>}{['pending', 'reviewing'].includes(r.status) && <button className="underline" onClick={() => { setSelected(r.id); setReply(r.staff_reply || ''); }}>Tiếp nhận / phản hồi</button>}
      {selected === r.id && <div className="space-y-2"><p className="text-xs text-stone-600">Kiểm tra tình trạng phòng, chính sách và thực hiện nghiệp vụ booking/thanh toán trước khi phản hồi kết quả cho khách.</p><label className="block" htmlFor={`staff-reply-${r.id}`}>Phản hồi cho khách</label><textarea id={`staff-reply-${r.id}`} rows={3} value={reply} maxLength={1000} onChange={e => setReply(e.target.value)} disabled={busy} className="border border-stone-300 rounded p-2 w-full" /><div className="flex flex-wrap gap-3">{(['reviewing', 'resolved', 'rejected'] as const).map(status => <button key={status} disabled={busy || reply.trim().length < 5} className="border border-stone-300 rounded px-3 py-2 disabled:opacity-50" onClick={() => respond(status)}>{requestStatusLabels[status]}</button>)}<button disabled={busy} onClick={() => setSelected(null)}>Đóng</button></div></div>}
    </article>)}</div>}
  </section>;
}
