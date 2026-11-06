// Isolated HTTP/API integration checks against local MySQL/Redis; no external mail, locks or payments.
require('dotenv').config({ quiet: true });
require('../register-paths.cjs');
require('reflect-metadata');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Test } = require('@nestjs/testing');
const { ConfigModule } = require('@nestjs/config');
const { TypeOrmModule } = require('@nestjs/typeorm');
const { ValidationPipe } = require('@nestjs/common');
const { DataSource } = require('typeorm');
const users = require('../dist/backend/src/entities/user.entity');
const rooms = require('../dist/backend/src/entities/room.entity');
const bookings = require('../dist/backend/src/entities/booking.entity');
const { CustomerModule } = require('../dist/backend/src/modules/customer/customer.module');
const { CustomerAuthService } = require('../dist/backend/src/modules/customer/customer-auth.service');
const { CustomerManagementService } = require('../dist/backend/src/modules/customer/customer-management.service');
const { customerNetPaid } = require('../dist/backend/src/modules/customer/customer-finance');
assert.equal(customerNetPaid([{ amount: 100, payment_status: 'paid' }], [{ amount: 100, type: 'payment' }], []), 100);
assert.equal(customerNetPaid([{ amount: 100, payment_status: 'paid' }], [{ amount: 100, type: 'payment' }, { amount: 20, type: 'refund' }], [{ refund_amount: 20, status: 'processed' }]), 80);
assert.equal(customerNetPaid([{ amount: 100, payment_status: 'paid' }], [], [{ refund_amount: 100, status: 'processed' }]), 0);
const delivered = new Map();
require('nodemailer').createTransport = () => ({
  sendMail: async mail => {
    assert.ok(mail.to.endsWith('@example.test'), 'Only isolated test recipients permitted');
    delivered.set(mail.to, mail.text.match(/\b\d{6}\b/)[0]);
    return { accepted: [mail.to], rejected: [] };
  }, close() {},
});
const suffix = crypto.randomBytes(6).toString('hex');
const emailA = `qa-management-${suffix}-a@example.test`, emailB = `qa-management-${suffix}-b@example.test`;
const created = { customers: [], bookings: [], locks: [], requests: [], sessions: [] };
let app, db, auth, count = 0;
const digest = value => crypto.createHmac('sha256', process.env.JWT_SECRET).update(value).digest('hex');
(async () => {
  const module = await Test.createTestingModule({ imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({ type: 'mysql', host: process.env.DB_HOST, port: Number(process.env.DB_PORT), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
      entities: [...Object.values(users), ...Object.values(rooms), ...Object.values(bookings)].filter(x => typeof x === 'function'), synchronize: false }), CustomerModule,
  ] }).compile();
  app = module.createNestApplication({ logger: false });
  app.use((req, _res, next) => { Object.defineProperty(req, 'ip', { value: `qa-${suffix}` }); next(); });
  app.setGlobalPrefix('api'); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  await app.listen(0, '127.0.0.1');
  db = app.get(DataSource); auth = app.get(CustomerAuthService);
  const management = app.get(CustomerManagementService);
  const base = await app.getUrl();
  async function api(route, { token, body, method = body ? 'POST' : 'GET', status = 200 } = {}) {
    const response = await fetch(`${base}/api/customer${route}`, { method, headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json(); assert.equal(response.status, status, `${route}: ${JSON.stringify(data)}`); count++;
    return { data, response };
  }
  async function login(email, purpose = 'account') {
    let data;
    if (purpose === 'account') {
      const customer = await db.getRepository(users.Customer).save({ full_name: 'QA Account', email, password_hash: await require('bcrypt').hash('Qa-password-2026', 12), account_created_at: new Date(), email_verified_at: new Date() });
      created.customers.push(customer.id);
      data = (await api('/auth/login', { body: { email, password: 'Qa-password-2026' }, status: 201 })).data;
    } else {
      await auth.requestOtp(email, purpose, `qa-${suffix}`);
      data = (await api('/auth/otp/verify', { body: { email, purpose, code: delivered.get(email) }, status: 201 })).data;
    }
    if (!created.customers.includes(data.customer.id)) created.customers.push(data.customer.id);
    created.sessions.push(JSON.parse(Buffer.from(data.access_token.split('.')[1], 'base64url').toString()).jti);
    return data;
  }
  await api('/me', { status: 401 });
  const a = await login(emailA), b = await login(emailB);
  const updated = await api('/me', { token: a.access_token, method: 'PUT', body: { full_name: 'QA Customer', phone: '0912345678', email: emailB } });
  assert.equal(updated.data.customer.email, emailA); assert.equal(updated.data.customer.full_name, 'QA Customer');
  assert.equal((await api('/me', { token: a.access_token })).data.customer.phone, '0912345678');
  await api('/me', { token: a.access_token, method: 'PUT', body: { full_name: ' ', phone: 'bad' }, status: 400 });
  const type = await db.getRepository(rooms.RoomType).findOneByOrFail({ is_active: true });
  const room = await db.getRepository(rooms.Room).findOneByOrFail({ room_type_id: type.id });
  const fixture = await db.getRepository(bookings.Booking).save({ booking_code: `QA-${suffix}`, apartment_id: type.apartment_id, customer_id: a.customer.id, room_id: room.id,
    booking_type: 'overnight', booked_start_time: new Date(Date.now() + 5 * 86400000), booked_end_time: new Date(Date.now() + 7 * 86400000), booking_status: 'confirmed', verification_status: 'passed', total_price: 100, adults: 1, children: 0 });
  created.bookings.push(fixture.id);
  await db.getRepository(bookings.BookingRoom).save({ bookings_id: fixture.id, room_types_id: type.id, room_id: room.id });
  const route = `/bookings/${fixture.id}`;
  for (const path of ['', '/requests', '/room-options', '/pins']) await api(route + path, { token: b.access_token, status: 404 });
  await api(route + '/requests', { token: b.access_token, body: { type: 'cancel', reason: 'QA cancellation reason' }, status: 404 });
  const request = await api(route + '/requests', { token: a.access_token, body: { type: 'cancel', reason: 'QA cancellation reason' }, status: 201 });
  created.requests.push(request.data.id);
  await api(route + '/requests', { token: a.access_token, body: { type: 'cancel', reason: 'Duplicate cancellation request' }, status: 409 });
  await api(route + '/requests', { token: a.access_token, body: { type: 'refund', reason: 'Refund without payment' }, status: 400 });
  await api(route + '/requests', { token: a.access_token, body: { type: 'extend', reason: 'Invalid extension date', requested_end_date: '2026-02-31' }, status: 400 });
  await api(route + '/requests', { token: a.access_token, body: { type: 'extend', reason: 'Missing extension date' }, status: 400 });
  await api(route + '/requests', { token: a.access_token, body: { type: 'change_room', reason: 'Invalid room type', requested_room_type_id: 999999 }, status: 400 });
  const extensionDate = new Date(Date.now() + 9 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
  const extension = await api(route + '/requests', { token: a.access_token, body: { type: 'extend', reason: 'Please extend the booking', requested_end_date: extensionDate }, status: 201 });
  created.requests.push(extension.data.id);
  const requests = (await api(route + '/requests', { token: a.access_token })).data;
  assert.equal(requests.length, 2); assert.equal(requests[0].handled_by, undefined);
  assert.equal((await db.getRepository(bookings.Booking).findOneByOrFail({ id: fixture.id })).booking_status, 'confirmed');
  const staff = { role: 'admin', actor: `qa-${suffix}` };
  assert.ok((await management.staffRequests(staff)).some(r => r.id === request.data.id));
  assert.ok(!(await management.staffRequests({ role: 'manager', apartmentId: type.apartment_id + 999, actor: 'qa' })).some(r => r.id === request.data.id));
  await assert.rejects(management.reviewRequest({ role: 'manager', apartmentId: type.apartment_id + 999, actor: 'qa' }, request.data.id, { status: 'resolved', staff_reply: 'Wrong branch should fail' }), error => error.getStatus() === 404);
  await management.reviewRequest(staff, request.data.id, { status: 'reviewing', staff_reply: 'QA staff is checking the policy.' });
  await management.reviewRequest(staff, request.data.id, { status: 'resolved', staff_reply: 'QA reply only; no real cancellation performed.' });
  await assert.rejects(management.reviewRequest(staff, request.data.id, { status: 'rejected', staff_reply: 'Cannot reopen a final response' }), error => error.getStatus() === 409);
  assert.equal((await api(route + '/requests', { token: a.access_token })).data.find(r => r.id === request.data.id).status, 'resolved');
  await api(route + '/pins', { token: a.access_token, status: 403 });
  await db.getRepository(bookings.Transaction).save({ booking_id: fixture.id, type: 'payment', amount: 100, payment_method: 'qa_fixture' });
  const refund = await api(route + '/requests', { token: a.access_token, body: { type: 'refund', reason: 'Please review refund eligibility' }, status: 201 });
  created.requests.push(refund.data.id);
  await api(route + '/pins', { token: a.access_token, status: 403 }); // Paid but too early.
  await db.getRepository(bookings.Booking).update(fixture.id, { booked_start_time: new Date(Date.now() - 3600000), booked_end_time: new Date(Date.now() + 3600000), booking_status: 'checked_in' });
  const lock = await db.getRepository(bookings.Lock).save({ room_id: room.id, cloud_lock_id: `qa-${suffix}`, lock_name: 'QA isolated lock', lock_type: 'manual', lock_status: 'offline' });
  created.locks.push(lock.id);
  const pin = await db.getRepository(bookings.LockPin).save({ booking_id: fixture.id, lock_id: lock.id, pin: '000111', status: 'active', lock_pin_start_time: new Date(Date.now() - 3600000), lock_pin_end_time: new Date(Date.now() + 3600000) });
  const codes = await api(route + '/pins', { token: a.access_token });
  assert.equal(codes.data[0].pin, '000111'); assert.equal(codes.response.headers.get('cache-control'), 'no-store');
  const detail = await api(route, { token: a.access_token }); assert.equal(detail.data.pin, undefined); assert.equal(detail.data.lock_pins, undefined); assert.equal(detail.data.paid_amount, 100);
  const processedRefund = await db.getRepository(bookings.Refund).save({ booking_id: fixture.id, payment_id: 0, refund_amount: 1, status: 'processed', reason: 'QA refund reconciliation fixture' });
  await api(route + '/pins', { token: a.access_token, status: 403 });
  await db.getRepository(bookings.Refund).delete(processedRefund.id);
  await db.getRepository(bookings.LockPin).update(pin.id, { status: 'revoked' });
  await api(route + '/pins', { token: a.access_token, status: 404 });
  await db.getRepository(bookings.Booking).update(fixture.id, { verification_status: 'pending' });
  await api(route + '/pins', { token: a.access_token, status: 403 });
  await api(route + '/requests', { token: a.access_token, body: { type: 'cancel', reason: 'Cancellation after check-in' }, status: 400 });
  await auth.redis.del(`customer:cooldown:${digest(emailB)}`); // Only this isolated fixture's cooldown.
  const lookup = await login(emailB, 'lookup');
  await api('/me', { token: lookup.access_token, method: 'PUT', body: { full_name: 'Should fail', phone: '' }, status: 403 });
  await api(route + '/requests', { token: lookup.access_token, body: { type: 'cancel', reason: 'Should not have write access' }, status: 403 });
  await api(route + '/pins', { token: lookup.access_token, status: 403 });
  await api('/auth/logout', { token: a.access_token, body: {}, status: 201 });
  await api('/me', { token: a.access_token, status: 401 });
  console.log(`PASS: ${count} HTTP assertions plus ownership, profile, request lifecycle, branch scope, payment/PIN gates, lookup restrictions and logout checks.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (db?.isInitialized) {
    if (created.requests.length) await db.getRepository(bookings.AuditLog).delete({ entity_type: 'booking_requests', entity_id: require('typeorm').In(created.requests) });
    for (const id of created.bookings) {
      await db.getRepository(bookings.AuditLog).delete({ entity_type: 'BOOKINGS', entity_id: id });
      await db.getRepository(bookings.Transaction).delete({ booking_id: id });
      await db.getRepository(bookings.Refund).delete({ booking_id: id });
      await db.getRepository(bookings.LockPin).delete({ booking_id: id });
      await db.getRepository(bookings.Booking).delete(id);
    }
    for (const id of created.locks) await db.getRepository(bookings.Lock).delete(id);
    for (const id of created.customers) await db.getRepository(users.Customer).delete(id);
  }
  if (auth) {
    const keys = created.sessions.map(id => `customer:session:${id}`);
    for (const email of [emailA, emailB]) keys.push(`customer:cooldown:${digest(email)}`, `customer:rate:email:${digest(email)}`, ...['account', 'lookup'].map(scope => `customer:otp:${scope}:${digest(email)}`));
    keys.push(`customer:rate:ip:${digest(`qa-${suffix}`)}`);
    await auth.redis.del(...keys);
  }
  if (app) await app.close();
});
