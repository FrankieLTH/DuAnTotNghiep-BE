// Local-only downstream checkout test: synthetic customer/session, no email or payments sent.
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const Redis = require('ioredis');
const { JwtService } = require('@nestjs/jwt');
if (process.env.DB_DATABASE !== 'duanmoi' || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST)) throw new Error('This test only targets the isolated local duanmoi database.');
const email = `qa-checkout-${crypto.randomBytes(6).toString('hex')}@example.test`;
const jti = crypto.randomUUID();
let db, redis, customerId, bookingId, blockerId, token;
async function api(path, body, method = body ? 'POST' : 'GET') {
  const response = await fetch('http://127.0.0.1:5174/api/customer' + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  assert.ok(response.ok, `${path}: ${JSON.stringify(data)}`);
  return data;
}
(async () => {
  db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE });
  redis = new Redis(process.env.REDIS_URL);
  const [customer] = await db.query('INSERT INTO CUSTOMER (full_name, email, phone) VALUES (?, ?, ?)', ['QA checkout deployment', email, '0912345678']);
  customerId = customer.insertId;
  token = new JwtService({ secret: process.env.JWT_SECRET }).sign({ sub: customerId, email, type: 'customer', scope: 'lookup', jti }, { expiresIn: '2m' });
  await redis.set(`customer:session:${jti}`, String(customerId), 'EX', 120);
  const [[type]] = await db.query('SELECT id FROM room_types WHERE is_active=1 ORDER BY id LIMIT 1');
  const draft = await api('/booking-drafts', { email, full_name: 'QA saved booker', phone: '0912345678', is_staying: true, selected_rooms: [{ room_type_id: type.id, quantity: 1 }], stay_type: 'fullday', adults: 1, children: 0, check_in_date: '2032-04-10', check_out_date: '2032-04-11' });
  bookingId = draft.booking_id;
  assert.equal(draft.booking_status, 'draft');
  assert.ok((await api('/bookings?status=draft')).items.some(b => b.id === bookingId && b.can_continue));
  const firstResume = await api(`/bookings/${bookingId}/checkout`);
  assert.equal(firstResume.resume_stage, 'guests');
  assert.equal(firstResume.booker.full_name, 'QA saved booker');
  const guest = { full_name: 'QA draft guest', date_of_birth: '2000-01-01', guest_type: 'adult', is_booker: true, is_foreigner: false, id_type: 'passport', id_number: 'QA-NOT-A-REAL-DOCUMENT', slot_status: 'confirmed' };
  await api(`/bookings/${bookingId}/checkout/guest-draft`, { guests: [guest] }, 'PUT');
  assert.equal((await api(`/bookings/${bookingId}/checkout`)).guests[0].full_name, guest.full_name);
  // Expired draft must be revalidated, not silently reopened by GET checkout.
  await db.query("UPDATE BOOKINGS SET booking_status='expired', hold_expires_at=DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE id=? AND customer_id=?", [bookingId, customerId]);
  assert.equal((await api(`/bookings/${bookingId}`)).can_resume, true);
  const closed = await fetch(`http://127.0.0.1:5174/api/customer/bookings/${bookingId}/checkout`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(closed.status, 409);
  const [[capacity]] = await db.query("SELECT COUNT(*) AS n FROM ROOMS WHERE room_type_id=? AND status='available' AND is_hidden=0", [type.id]);
  assert.ok(capacity.n > 0 && capacity.n <= 10);
  const blocker = await api('/booking-drafts', { email, full_name: 'QA blocker', phone: '0912345678', is_staying: true, selected_rooms: [{ room_type_id: type.id, quantity: Number(capacity.n) }], stay_type: 'fullday', adults: Number(capacity.n), children: 0, check_in_date: '2032-04-10', check_out_date: '2032-04-11' });
  blockerId = blocker.booking_id;
  const unavailable = await fetch(`http://127.0.0.1:5174/api/customer/bookings/${bookingId}/resume`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  assert.equal(unavailable.status, 409);
  assert.equal((await api(`/bookings/${bookingId}`)).booking_status, 'expired');
  await db.query('DELETE FROM BOOKINGS WHERE id=? AND customer_id=?', [blockerId, customerId]); blockerId = null;
  const resumed = await api(`/bookings/${bookingId}/resume`, {});
  assert.equal(resumed.server_booking_id, bookingId);
  assert.equal(resumed.resume_stage, 'guests');
  assert.equal(resumed.guests[0].full_name, guest.full_name);
  const heldUntil = resumed.hold_expires_at;
  assert.equal((await api(`/bookings/${bookingId}/resume`, {})).hold_expires_at, heldUntil, 'Repeat clicks do not extend an active hold');
  const { slot_status, ...completeGuest } = guest;
  await api(`/bookings/${bookingId}/checkout`, { guests: [completeGuest] }, 'PUT');
  const pending = (await api('/bookings?status=pending_payment')).items.find(b => b.id === bookingId);
  assert.ok(pending && pending.can_continue);
  assert.equal(pending.paid_amount, 0);
  assert.equal((await api(`/bookings/${bookingId}/checkout`)).resume_stage, 'payment');
  await db.query("UPDATE BOOKINGS SET booking_status='expired', hold_expires_at=DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE id=? AND customer_id=?", [bookingId, customerId]);
  assert.equal((await api(`/bookings/${bookingId}/resume`, {})).resume_stage, 'payment', 'Completed information should resume at payment');
  async function review(id, status, role = 'admin', expected = 200) {
    const response = await fetch(`http://127.0.0.1:5174/api/admin/customer-requests/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-staff-role': role, 'x-staff-actor': email }, body: JSON.stringify({ status, staff_reply: 'QA local workflow decision' }) });
    const result = await response.json(); assert.equal(response.status, expected, JSON.stringify(result)); return result;
  }
  const cancel1 = await api(`/bookings/${bookingId}/requests`, { type: 'cancel', reason: 'QA deployment cancellation request' });
  await review(cancel1.id, 'approved', 'manager', 403);
  await review(cancel1.id, 'rejected');
  assert.equal((await api(`/bookings/${bookingId}`)).booking_status, 'pending_payment');
  const cancel2 = await api(`/bookings/${bookingId}/requests`, { type: 'cancel', reason: 'QA deployment cancellation retry' });
  await review(cancel2.id, 'approved');
  assert.equal((await api(`/bookings/${bookingId}`)).booking_status, 'cancelled');
  await review(cancel2.id, 'approved', 'admin', 409);
  // Synthetic cash receipt only for this fixture; no gateway, money transfer or email.
  await db.query("INSERT INTO `transaction` (booking_id,type,amount,payment_method,note) VALUES (?,'payment',500000,'counter_cash','QA synthetic receipt')", [bookingId]);
  const refund = await api(`/bookings/${bookingId}/requests`, { type: 'refund', reason: 'QA deployment refund request' });
  const [[requested]] = await db.query('SELECT status,refund_amount FROM refunds WHERE booking_id=?', [bookingId]);
  assert.equal(requested.status, 'requested'); assert.equal(Number(requested.refund_amount), 500000);
  await review(refund.id, 'approved');
  const requests = await api(`/bookings/${bookingId}/requests`);
  assert.equal(requests.find(r => r.id === refund.id).status, 'approved');
  assert.equal((await api(`/bookings/${bookingId}`)).paid_amount, 500000, 'Approval must not fabricate transferred money');
  const [[tables]] = await db.query("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE'"); assert.equal(Number(tables.n), 24);
  const [[count]] = await db.query('SELECT COUNT(*) AS n FROM BOOKINGS WHERE customer_id=?', [customerId]);
  assert.equal(Number(count.n), 1);
  console.log('PASS: running Docker app saves draft before payment, lists it in lookup, resumes guest fields, restores payment stage, shares cancel/refund requests with admin approval/rejection, and keeps 24 tables.');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (db) {
    if (blockerId) await db.query('DELETE FROM BOOKINGS WHERE id=? AND customer_id=?', [blockerId, customerId]);
    if (bookingId) {
      await db.query('DELETE FROM refunds WHERE booking_id=?', [bookingId]);
      await db.query('DELETE FROM `transaction` WHERE booking_id=?', [bookingId]);
      await db.query("DELETE FROM Audit_logs WHERE entity_type='BOOKINGS' AND entity_id=?", [bookingId]);
    }
    if (bookingId) await db.query('DELETE FROM BOOKINGS WHERE id=? AND customer_id=?', [bookingId, customerId]);
    if (customerId) await db.query('DELETE FROM CUSTOMER WHERE customer_id=? AND email=?', [customerId, email]);
    await db.end();
  }
  if (redis) { await redis.del(`customer:session:${jti}`); await redis.quit(); }
});
