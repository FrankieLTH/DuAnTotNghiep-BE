// Uses only local MySQL, Redis and Mailpit. Creates isolated fixtures and removes them in finally.
require('dotenv').config({ quiet: true });
if (!['127.0.0.1', 'localhost'].includes(process.env.SMTP_HOST) || Number(process.env.SMTP_PORT) !== 1025) {
  console.error('Legacy Mailpit test requires a separate local Mailpit SMTP configuration. Use npm run test:customer for captured-email tests.');
  process.exit(1);
}
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const Redis = require('ioredis');
const base = 'http://127.0.0.1:3000/api';
const inbox = 'http://127.0.0.1:8025';
const suffix = crypto.randomBytes(6).toString('hex');
const emails = ['a', 'b', 'c', 'd'].map(n => `qa-customer-${suffix}-${n}@example.test`);
const sessions = [], messages = [];
const hash = v => crypto.createHmac('sha256', process.env.JWT_SECRET || 'homestay_jwt_secret_key_2026_autocheckin').update(v).digest('hex');
const otpKey = (email, purpose = 'booking') => `customer:otp:${purpose}:${hash(email)}`;
let checks = 0;
async function api(path, { body, token, status = 200, method } = {}) {
  const response = await fetch(`${base}${path}`, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  assert.equal(response.status, status, `${path}: ${JSON.stringify(data)}`); checks++;
  return data;
}
async function request(email, purpose = 'booking') {
  await api('/customer/auth/otp/request', { body: { email, purpose }, status: 201 });
  const mail = await fetch(`${inbox}/api/v1/messages`).then(r => r.json());
  const found = mail.messages.find(m => m.To.some(to => to.Address === email));
  assert.ok(found, 'OTP email delivered to Mailpit'); messages.push(found.ID);
  const detail = await fetch(`${inbox}/api/v1/message/${found.ID}`).then(r => r.json());
  const match = detail.Text.match(/\b\d{6}\b/); assert.ok(match); return match[0];
}
async function login(email, purpose = 'booking') {
  const code = await request(email, purpose);
  const data = await api('/customer/auth/otp/verify', { body: { email, purpose, code }, status: 201 });
  const payload = JSON.parse(Buffer.from(data.access_token.split('.')[1], 'base64url').toString());
  sessions.push(payload.jti); return { ...data, code };
}
async function main() {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE });
  const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  let bookingId, legacyId;
  try {
    await api('/customer/bookings', { status: 401 });
    await api('/customer/auth/otp/request', { body: { email: 'invalid', purpose: 'booking' }, status: 400 });
    const a = await login(emails[0]);
    await api('/customer/auth/otp/verify', { body: { email: emails[0], purpose: 'booking', code: a.code }, status: 401 });
    await api('/customer/auth/otp/request', { body: { email: emails[0], purpose: 'lookup' }, status: 429 });
    const empty = await api('/customer/bookings', { token: a.access_token }); assert.equal(empty.total, 0);
    const [types] = await db.query('SELECT id FROM room_types WHERE is_active = 1 ORDER BY id LIMIT 1');
    const start = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10);
    const end = new Date(Date.now() + 122 * 86400000).toISOString().slice(0, 10);
    const bookingData = { email: emails[0].toUpperCase(), full_name: 'QA Guest', phone: '0900000000', room_type_id: types[0].id, num_rooms: 1, adults: 2, children: 0, check_in_date: start, check_out_date: end };
    await api('/customer/guest-bookings', { body: { ...bookingData, check_out_date: start }, status: 400 });
    const booking = await api('/customer/guest-bookings', { body: bookingData, status: 201 }); bookingId = booking.booking_id;
    const list = await api('/customer/bookings?status=pending_payment&page=1', { token: a.access_token });
    assert.equal(list.total, 1); assert.equal(list.items[0].id, bookingId);
    const detail = await api(`/customer/bookings/${bookingId}`, { token: a.access_token });
    assert.equal(detail.rooms.length, 1); assert.equal(detail.paid_amount, 0); assert.equal(detail.payment_status, 'unpaid');
    assert.equal(detail.passcode, undefined); assert.equal(detail.guests_list, undefined);
    const [legacy] = await db.query(`INSERT INTO BOOKINGS (booking_code, customer_id, apartment_id, room_id, booking_type, booked_start_time, booked_end_time, booking_status, total_price)
      SELECT ?, customer_id, apartment_id, (SELECT room_id FROM ROOMS WHERE room_type_id = ? LIMIT 1), booking_type, booked_start_time, booked_end_time, 'confirmed', total_price FROM BOOKINGS WHERE id = ?`, [`QA-LEGACY-${suffix}`, types[0].id, bookingId]);
    legacyId = legacy.insertId;
    await api('/customer/guest-bookings', { body: { ...bookingData, num_rooms: 2 }, status: 400 });
    await db.query('DELETE FROM BOOKINGS WHERE id = ?', [legacyId]); legacyId = undefined;
    const b = await login(emails[1]);
    await api(`/customer/bookings/${bookingId}`, { token: b.access_token, status: 404 });
    await api(`/bookings/${bookingId}`, { status: 401 });
    await api(`/bookings/${bookingId}`, { token: a.access_token, status: 401 });
    await api('/customer/bookings?page=0', { token: a.access_token, status: 400 });
    await api('/customer/bookings?status=unknown', { token: a.access_token, status: 400 });
    await api('/customer/auth/logout', { token: b.access_token, method: 'POST', status: 201 });
    await api('/customer/me', { token: b.access_token, status: 401 });
    const cCode = await request(emails[2]);
    const record = await redis.get(otpKey(emails[2])); assert.ok(record && !record.includes(cCode));
    const wrong = cCode === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) await api('/customer/auth/otp/verify', { body: { email: emails[2], purpose: 'booking', code: wrong }, status: 401 });
    await api('/customer/auth/otp/verify', { body: { email: emails[2], purpose: 'booking', code: cCode }, status: 401 });
    const dCode = await request(emails[3]); await redis.del(otpKey(emails[3]));
    await api('/customer/auth/otp/verify', { body: { email: emails[3], purpose: 'booking', code: dCode }, status: 401 });
    await redis.del(`customer:cooldown:${hash(emails[0])}`);
    const lookup = await login(emails[0], 'lookup');
    const lookedUp = await api(`/customer/bookings/${bookingId}`, { token: lookup.access_token }); assert.equal(lookedUp.id, bookingId);
    if (process.argv.includes('--visual')) {
      const { pathToFileURL } = require('node:url');
      const path = require('node:path');
      const { Browser } = await import(pathToFileURL(path.resolve(__dirname, '../../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs')).href);
      const browser = await Browser.launch();
      try {
        const out = path.resolve(__dirname, '../../../.taste-skill/customer-account/inspection');
        const page = await browser.newPage({ width: 1440, height: 900 });
        await page.goto('http://localhost/booking-lookup');
        await page.eval(token => sessionStorage.setItem('customer_lookup_token', token), a.access_token);
        await page.goto('http://localhost/booking-lookup');
        const content = await page.eval(() => document.body.innerText);
        assert.ok(content.includes(booking.booking_code), 'Browser renders persisted booking');
        await page.eval(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Xem chi tiết').click());
        // Navigation settles rendering and the subsequent DOM assertion waits for the detail request.
        for (let i = 0; i < 30; i++) {
          if (await page.eval(() => document.querySelector('.ca-detail')?.textContent.includes('Lịch sử thanh toán'))) break;
          await new Promise(r => setTimeout(r, 100));
        }
        assert.ok(await page.eval(() => document.querySelector('.ca-detail').textContent.includes('Lịch sử thanh toán')));
        await page.screenshot({ path: path.join(out, 'authenticated-desktop.jpg') });
        await page.setViewport({ width: 390, height: 844 });
        await page.eval(() => window.scrollTo(0, 0));
        assert.ok(await page.eval(() => document.documentElement.scrollWidth <= window.innerWidth), 'No mobile horizontal overflow');
        await page.screenshot({ path: path.join(out, 'authenticated-mobile.jpg'), fullPage: true });
        console.log('PASS: browser renders persisted booking, detail and mobile layout.');
      } finally { await browser.close(); }
    }
    await db.query('UPDATE CUSTOMER SET is_blocked = 1 WHERE email = ?', [emails[0]]);
    await api('/customer/me', { token: a.access_token, status: 401 });
    console.log(`PASS: ${checks} HTTP checks; OTP delivery/replay/limits, guest booking persistence, ownership, lookup, logout and blocking.`);
  } finally {
    if (legacyId) await db.query('DELETE FROM BOOKINGS WHERE id = ? AND booking_code = ?', [legacyId, `QA-LEGACY-${suffix}`]);
    if (bookingId) await db.query('DELETE FROM BOOKINGS WHERE id = ? AND customer_id IN (SELECT customer_id FROM CUSTOMER WHERE email IN (?, ?, ?, ?))', [bookingId, ...emails]);
    await db.query('DELETE FROM CUSTOMER WHERE email IN (?, ?, ?, ?)', emails);
    for (const email of emails) await redis.del(otpKey(email), otpKey(email, 'lookup'), `customer:cooldown:${hash(email)}`, `customer:rate:email:${hash(email)}`);
    for (const jti of sessions) await redis.del(`customer:session:${jti}`);
    for (const id of messages) await fetch(`${inbox}/api/v1/messages`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ IDs: [id] }) });
    await db.end(); redis.disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
