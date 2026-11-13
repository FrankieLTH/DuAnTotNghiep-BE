// Full account lifecycle + guest isolation; local MySQL/Redis, captured email only.
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true }); require('../register-paths.cjs'); require('reflect-metadata');
const assert = require('node:assert/strict'); const crypto = require('node:crypto');
const { Test } = require('@nestjs/testing'); const { ConfigModule } = require('@nestjs/config');
const { TypeOrmModule } = require('@nestjs/typeorm'); const { ValidationPipe } = require('@nestjs/common'); const { DataSource } = require('typeorm');
const users = require('../dist/backend/src/entities/user.entity'); const rooms = require('../dist/backend/src/entities/room.entity'); const entities = require('../dist/backend/src/entities/booking.entity');
const { CustomerModule } = require('../dist/backend/src/modules/customer/customer.module');
const { CustomerAuthService } = require('../dist/backend/src/modules/customer/customer-auth.service');
const { CustomerAccountService } = require('../dist/backend/src/modules/customer/customer-account.service');
const { CustomerMailService } = require('../dist/backend/src/modules/customer/customer-mail.service');
const suffix = crypto.randomBytes(6).toString('hex'), ip = `qa-accounts-${suffix}`, email = `qa-account-life-${suffix}@example.test`, otherEmail = `qa-account-new-${suffix}@example.test`;
const mails = []; const sessions = []; let app, db, auth, accounts, guest, booking, checks = 0;
const createdBookings = [];
const password = 'Qa-Original-2026';
(async () => {
  const module = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmModule.forRoot({ type: 'mysql', host: process.env.DB_HOST, port: Number(process.env.DB_PORT), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE, entities: [...Object.values(users), ...Object.values(rooms), ...Object.values(entities)].filter(x => typeof x === 'function'), synchronize: false }), CustomerModule] })
    .overrideProvider(CustomerMailService).useValue({ send: async (to, subject, text) => { assert.ok(to.endsWith('@example.test')); mails.push({ to, subject, text }); } }).compile();
  app = module.createNestApplication({ logger: false }); app.use((req, _res, next) => { Object.defineProperty(req, 'ip', { value: ip }); next(); });
  app.setGlobalPrefix('api'); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  await app.listen(0, '127.0.0.1'); db = app.get(DataSource); auth = app.get(CustomerAuthService); accounts = app.get(CustomerAccountService);
  // Missing registration must not claim an email was sent; failed resend preserves old code.
  const retryEmail = `qa-delivery-${suffix}@example.test`;
  const retryIp = `qa-delivery-${suffix}`;
  const mailer = app.get(CustomerMailService), originalSend = mailer.send;
  try {
    await assert.rejects(accounts.resendVerification(retryEmail, retryIp), e => e.getStatus() === 400 && e.getResponse().next_action === 'register');
    await accounts.register({ email: retryEmail, full_name: 'QA delivery', password }, retryIp);
    const key = accounts.key('register', retryEmail), cooldown = accounts.key('register:cooldown', retryEmail);
    const originalRecord = await auth.redis.get(key);
    await auth.redis.del(cooldown);
    mailer.send = async () => { throw new Error('QA simulated SMTP failure'); };
    await assert.rejects(accounts.resendVerification(retryEmail, retryIp), /QA simulated SMTP failure/);
    assert.equal(await auth.redis.get(key), originalRecord, 'Failed delivery must preserve the previous code');
    mailer.send = originalSend;
    await accounts.resendVerification(retryEmail, retryIp);
    assert.notEqual(JSON.parse(await auth.redis.get(key)).code, JSON.parse(originalRecord).code);
  } finally {
    mailer.send = originalSend;
    await auth.redis.del(...['register', 'register:cooldown', 'rate:register:email'].map(a => accounts.key(a, retryEmail)), accounts.key('rate:register:ip', retryIp));
  }
  const base = await app.getUrl();
  async function api(route, { body, token, status = body ? 201 : 200, method = body ? 'POST' : 'GET' } = {}) {
    const response = await fetch(`${base}/api/customer${route}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json(); assert.equal(response.status, status, `${route}: ${JSON.stringify(data)}`); checks++;
    if (data.access_token) sessions.push(JSON.parse(Buffer.from(data.access_token.split('.')[1], 'base64url')).jti);
    return data;
  }
  function emailCode(subject, to = email) { const mail = mails.filter(m => m.to === to && m.subject.includes(subject)).at(-1); assert.ok(mail, 'Verification/reset email captured'); assert.ok(!mail.text.includes('http'), 'No device-specific link in email'); return mail.text.match(/\b\d{6}\b/)[0]; }
  await api('/auth/otp/request', { body: { email: otherEmail, purpose: 'lookup' } });
  const emptyCode = mails.at(-1).text.match(/\b\d{6}\b/)[0];
  const emptyLookup = await api('/auth/otp/verify', { body: { email: otherEmail, purpose: 'lookup', code: emptyCode } });
  assert.equal(emptyLookup.verified, true);
  assert.equal(emptyLookup.has_bookings, false);
  assert.equal(emptyLookup.customer, null);
  assert.equal(emptyLookup.access_token, undefined);
  assert.equal(await db.getRepository(users.Customer).existsBy({ email: otherEmail }), false);
  await api('/auth/otp/verify', { body: { email: otherEmail, purpose: 'lookup', code: emptyCode }, status: 401 });
  guest = await db.getRepository(users.Customer).save({ full_name: 'Existing Guest', email, phone: '0912345678' });
  const type = await db.getRepository(rooms.RoomType).findOneByOrFail({ is_active: true });
  booking = await db.getRepository(entities.Booking).save({ customer_id: guest.id, apartment_id: type.apartment_id, booking_code: `QA-LIFE-${suffix}`, booking_type: 'overnight', booked_start_time: new Date(Date.now() + 30 * 86400000), booked_end_time: new Date(Date.now() + 32 * 86400000), booking_status: 'pending_payment', total_price: 100, adults: 1, children: 0 });
  await api('/auth/login', { body: { email, password }, status: 401 });
  await api('/auth/otp/request', { body: { email, purpose: 'account' }, status: 400 });
  await api('/auth/otp/request', { body: { email, purpose: 'lookup' } });
  const otp = mails.at(-1).text.match(/\b\d{6}\b/)[0];
  const lookup = await api('/auth/otp/verify', { body: { email, purpose: 'lookup', code: otp } });
  assert.equal(lookup.scope, 'lookup');
  const draftFlow = await api('/booking-drafts', { token: lookup.access_token, body: { email, full_name: 'QA draft booker', phone: '0912345678', is_staying: true, selected_rooms: [{ room_type_id: type.id, quantity: 1 }], adults: 1, children: 0, check_in_date: '2031-02-10', check_out_date: '2031-02-11' } });
  createdBookings.push(draftFlow.booking_id);
  assert.equal(draftFlow.booking_status, 'draft');
  assert.ok((await api('/bookings?status=draft', { token: lookup.access_token })).items.some(b => b.id === draftFlow.booking_id && b.can_continue));
  const resumeDraft = await api(`/bookings/${draftFlow.booking_id}/checkout`, { token: lookup.access_token });
  assert.equal(resumeDraft.resume_stage, 'guests');
  assert.equal(resumeDraft.booker.full_name, 'QA draft booker');
  assert.equal(resumeDraft.server_booking_id, draftFlow.booking_id);
  assert.equal(resumeDraft.guests.length, 1);
  await api(`/bookings/${draftFlow.booking_id}/checkout/guest-draft`, { token: lookup.access_token, method: 'PUT', status: 200, body: { guests: [{ full_name: 'QA partially filled guest', date_of_birth: '', guest_type: 'adult', is_booker: true, is_foreigner: false, id_type: 'cccd', id_number: '', slot_status: 'empty' }] } });
  const partialResume = await api(`/bookings/${draftFlow.booking_id}/checkout`, { token: lookup.access_token });
  assert.equal(partialResume.guests[0].full_name, 'QA partially filled guest');
  assert.equal(partialResume.resume_stage, 'guests');

  await api(`/bookings/${draftFlow.booking_id}/checkout/booker`, { token: lookup.access_token, method: 'PUT', body: { full_name: 'QA changed booker', phone: '0912345678', is_staying: true }, status: 200 });
  assert.equal((await api(`/bookings/${draftFlow.booking_id}/checkout`, { token: lookup.access_token })).booker.full_name, 'QA changed booker');
  await api(`/bookings/${draftFlow.booking_id}/checkout`, { token: lookup.access_token, method: 'PUT', body: { guests: [] }, status: 400 });
  const guestData = { full_name: 'QA adult guest', date_of_birth: '2000-01-01', guest_type: 'adult', is_booker: true, is_foreigner: false, id_type: 'passport', id_number: 'QA-TEST-DOCUMENT' };
  const completedDraft = await api(`/bookings/${draftFlow.booking_id}/checkout`, { token: lookup.access_token, method: 'PUT', body: { guests: [guestData] }, status: 200 });
  assert.equal(completedDraft.booking_id, draftFlow.booking_id);
  assert.equal(completedDraft.booking_status, 'pending_payment');
  assert.equal(Date.parse(completedDraft.hold_expires_at), Date.parse(draftFlow.hold_expires_at), 'Resume/completion must not extend hold');
  const paymentResume = await api(`/bookings/${draftFlow.booking_id}/checkout`, { token: lookup.access_token });
  assert.equal(paymentResume.resume_stage, 'payment');
  assert.equal(paymentResume.guests[0].full_name, guestData.full_name);
  assert.equal((await api(`/bookings/${draftFlow.booking_id}`, { token: lookup.access_token })).paid_amount, 0);
  await db.getRepository(entities.Booking).update(draftFlow.booking_id, { hold_expires_at: new Date(Date.now() - 10000) });
  await api(`/bookings/${draftFlow.booking_id}/checkout`, { token: lookup.access_token, status: 409 });
  await db.getRepository(entities.Booking).update(draftFlow.booking_id, { hold_expires_at: new Date(draftFlow.hold_expires_at) });

  await api('/guest-bookings', { body: { email, full_name: 'QA Guest', phone: '0912345678', room_type_id: type.id, num_rooms: 1, adults: 1, children: 0, check_in_date: '2030-01-10', check_out_date: '2030-01-11' }, status: 401 });
  await api('/guest-bookings', { token: lookup.access_token, body: { email: otherEmail, full_name: 'QA Guest', room_type_id: type.id, num_rooms: 1, adults: 1, children: 0, check_in_date: '2030-01-10', check_out_date: '2030-01-11' }, status: 403 });
  const saved = await api('/guest-bookings', { token: lookup.access_token, body: { email, full_name: 'QA Guest', phone: '0912345678', selected_rooms: [{ room_type_id: type.id, quantity: 1 }], adults: 1, children: 0, check_in_date: '2030-01-10', check_out_date: '2030-01-11' } });
  createdBookings.push(saved.booking_id);
  assert.equal(saved.booking_status, 'pending_payment');
  assert.equal((await api(`/bookings/${saved.booking_id}`, { token: lookup.access_token })).paid_amount, 0);
  const guestRequest = await api(`/bookings/${saved.booking_id}/requests`, { token: lookup.access_token, body: { type: 'cancel', reason: 'QA request, do not cancel the real booking' } });
  assert.equal(guestRequest.status, 'pending');
  await api(`/bookings/${saved.booking_id}/requests`, { token: lookup.access_token, body: { type: 'cancel', reason: 'Duplicate QA request' }, status: 409 });
  assert.equal((await api(`/bookings/${saved.booking_id}/requests`, { token: lookup.access_token })).length, 1);
  assert.ok((await api(`/bookings/${saved.booking_id}/room-options`, { token: lookup.access_token })).length > 0);
  await api(`/bookings/${saved.booking_id}/pins`, { token: lookup.access_token, status: 403 });
  assert.equal((await db.getRepository(entities.Booking).findOneByOrFail({ id: saved.booking_id })).booking_status, 'pending_payment');
  const qaRoom = await db.getRepository(rooms.Room).findOneByOrFail({ room_type_id: type.id, status: 'available' });
  const qaLock = await db.getRepository(entities.Lock).findOneByOrFail({ room_id: qaRoom.id });
  const pinStart = new Date(Date.now() - 60000), pinEnd = new Date(Date.now() + 600000);
  await db.getRepository(entities.Booking).update(saved.booking_id, { booking_status: 'confirmed', verification_status: 'passed', booked_start_time: pinStart, booked_end_time: pinEnd });
  await db.getRepository(entities.BookingRoom).update({ bookings_id: saved.booking_id }, { room_id: qaRoom.id });
  await db.getRepository(entities.Transaction).save({ booking_id: saved.booking_id, type: 'payment', amount: saved.total_price, payment_method: 'counter_cash' });
  await db.getRepository(entities.LockPin).save({ booking_id: saved.booking_id, lock_id: qaLock.id, pin: '654321', status: 'active', lock_pin_start_time: pinStart, lock_pin_end_time: pinEnd });
  const guestPins = await api(`/bookings/${saved.booking_id}/pins`, { token: lookup.access_token });
  assert.equal(guestPins.length, 1); assert.equal(guestPins[0].room_number, qaRoom.room_number);


  await api('/me', { token: lookup.access_token, method: 'PUT', body: { full_name: 'Should not write', phone: '' }, status: 403 });
  await api('/auth/change-password', { token: lookup.access_token, body: { current_password: password, password: 'New-password-2026' }, status: 403 });
  assert.equal((await db.getRepository(users.Customer).findOneByOrFail({ id: guest.id })).account_created_at, null);
  await api('/auth/register', { body: { email, full_name: 'Registered Customer', phone: '0912345678', password: 'short' }, status: 400 });
  await api('/auth/register', { body: { email, full_name: 'Registered Customer', phone: '0912345678', password } });
  assert.equal((await db.getRepository(users.Customer).findOneByOrFail({ id: guest.id })).account_created_at, null, 'Registration is pending email ownership confirmation');
  const oldActivation = emailCode('Xác minh');
  await auth.redis.del(accounts.key('register:cooldown', email)); // Only this fixture's cooldown.
  await api('/auth/resend-verification', { body: { email } });
  await api('/auth/verify-registration', { body: { email, code: oldActivation }, status: 400 });
  const activation = emailCode('Xác minh');
  await api('/auth/verify-registration', { body: { email, code: '123' }, status: 400 });
  const activated = await api('/auth/verify-registration', { body: { email, code: activation } });
  assert.equal(activated.scope, 'account'); assert.ok(activated.access_token, 'Registration verification signs the user in automatically');
  await api('/auth/verify-registration', { body: { email, code: activation }, status: 400 });
  const login = await api('/auth/login', { body: { email, password } });
  assert.equal(login.scope, 'account'); assert.equal(login.customer.id, guest.id); assert.ok(login.customer.email_verified_at);
  assert.equal(login.customer.password_hash, undefined); assert.equal((await db.getRepository(users.Customer).findOneByOrFail({ id: guest.id })).password_hash, undefined);
  assert.ok((await api('/bookings', { token: login.access_token })).items.some(b => b.id === booking.id), 'Existing guest booking linked after verified signup');
  // Both verified session scopes share one request lifecycle on existing tables.
  const { CustomerManagementService } = require('../dist/backend/src/modules/customer/customer-management.service');
  const management = app.get(CustomerManagementService);
  const staff = { role: 'admin', actor: `qa-review-${suffix}` };
  const requestCancel = await api(`/bookings/${draftFlow.booking_id}/requests`, { token: login.access_token, body: { type: 'cancel', reason: 'QA account cancellation request' } });
  assert.ok((await api(`/bookings/${draftFlow.booking_id}/requests`, { token: lookup.access_token })).some(r => r.id === requestCancel.id));
  assert.equal((await api(`/bookings/${draftFlow.booking_id}`, { token: login.access_token })).booking_status, 'pending_payment', 'Submitting does not cancel');
  await assert.rejects(management.reviewRequest({ role: 'manager', actor: staff.actor }, requestCancel.id, { status: 'approved', staff_reply: 'QA approval' }), e => e.getStatus() === 403);
  await assert.rejects(management.reviewRequest({ ...staff, apartmentId: 999999 }, requestCancel.id, { status: 'approved', staff_reply: 'QA approval' }), e => e.getStatus() === 404);
  await management.reviewRequest(staff, requestCancel.id, { status: 'rejected', staff_reply: 'QA reject cancellation' });
  assert.equal((await api(`/bookings/${draftFlow.booking_id}`, { token: lookup.access_token })).booking_status, 'pending_payment');
  const retryCancel = await api(`/bookings/${draftFlow.booking_id}/requests`, { token: lookup.access_token, body: { type: 'cancel', reason: 'QA guest cancellation request' } });
  await management.reviewRequest(staff, retryCancel.id, { status: 'approved', staff_reply: 'QA approved cancellation' });
  assert.equal((await api(`/bookings/${draftFlow.booking_id}`, { token: login.access_token })).booking_status, 'cancelled');
  assert.equal((await api(`/bookings/${draftFlow.booking_id}/requests`, { token: login.access_token })).find(r => r.id === retryCancel.id).status, 'approved');
  await assert.rejects(management.reviewRequest(staff, retryCancel.id, { status: 'approved', staff_reply: 'QA duplicate approval' }), e => e.getStatus() === 409);
  assert.equal(await db.getRepository(entities.Refund).countBy({ booking_id: draftFlow.booking_id }), 0, 'Cancel never fabricates a refund');
  const refund1 = await api(`/bookings/${saved.booking_id}/requests`, { token: lookup.access_token, body: { type: 'refund', reason: 'QA guest refund request' } });
  assert.equal(await db.getRepository(entities.Refund).countBy({ booking_id: saved.booking_id, status: 'requested' }), 1, 'Uses existing refunds table');
  await api(`/bookings/${saved.booking_id}/requests`, { token: login.access_token, body: { type: 'refund', reason: 'QA duplicate account refund' }, status: 409 });
  await management.reviewRequest(staff, refund1.id, { status: 'rejected', staff_reply: 'QA reject refund' });
  assert.equal(await db.getRepository(entities.Refund).countBy({ booking_id: saved.booking_id, status: 'rejected' }), 1);
  const refund2 = await api(`/bookings/${saved.booking_id}/requests`, { token: login.access_token, body: { type: 'refund', reason: 'QA account refund request' } });
  await management.reviewRequest(staff, refund2.id, { status: 'approved', staff_reply: 'QA approved, payment not transferred' });
  assert.equal(await db.getRepository(entities.Refund).countBy({ booking_id: saved.booking_id, status: 'approved' }), 1);
  assert.equal((await api(`/bookings/${saved.booking_id}`, { token: lookup.access_token })).paid_amount, saved.total_price, 'Approval is not a cash refund');
  assert.equal(await db.getRepository(entities.Transaction).countBy({ booking_id: saved.booking_id, type: 'refund' }), 0);
  assert.equal((await api(`/bookings/${saved.booking_id}/requests`, { token: lookup.access_token })).find(r => r.id === refund2.id).status, 'approved');
  await db.getRepository(entities.Refund).update({ booking_id: saved.booking_id, status: 'approved' }, { status: 'processed' });
  assert.equal((await api(`/bookings/${saved.booking_id}/requests`, { token: lookup.access_token })).find(r => r.id === refund2.id).status, 'processed');
  assert.equal((await api(`/bookings/${saved.booking_id}`, { token: lookup.access_token })).paid_amount, 0);
  const [tableCount] = await db.query("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE'");
  assert.equal(Number(tableCount.n), 24);
  const mailCount = mails.length;
  await api('/auth/register', { body: { email, full_name: 'Attempt to replace account', password: 'Other-password-2026' } });
  assert.equal(mails.length, mailCount); assert.equal((await api('/me', { token: login.access_token })).customer.full_name, 'Registered Customer');
  await api('/auth/change-password', { token: login.access_token, body: { current_password: 'Wrong-password', password: 'Changed-password-2026' }, status: 401 });
  await api('/auth/change-password', { token: login.access_token, body: { current_password: password, password: 'Changed-password-2026' } });
  await api('/me', { token: login.access_token, status: 401 });
  await api('/auth/login', { body: { email, password }, status: 401 });
  const changed = await api('/auth/login', { body: { email, password: 'Changed-password-2026' } });
  await api('/me', { token: lookup.access_token }); // Guest read-only session is independent of account password.
  await api('/auth/forgot-password', { body: { email: otherEmail } });
  assert.equal(mails.length, mailCount);
  await api('/auth/forgot-password', { body: { email } });
  const reset = emailCode('Đặt lại');
  await api('/auth/reset-password-code', { body: { email, code: reset, password: 'Reset-password-2026' } });
  await api('/auth/reset-password-code', { body: { email, code: reset, password: 'Another-password-2026' }, status: 400 });
  await api('/me', { token: changed.access_token, status: 401 });
  const resetLogin = await api('/auth/login', { body: { email, password: 'Reset-password-2026' } });
  await api('/auth/logout', { token: lookup.access_token, body: {} });
  await api('/me', { token: resetLogin.access_token });
  await api('/auth/logout', { token: resetLogin.access_token, body: {} });
  await api('/me', { token: resetLogin.access_token, status: 401 });
  await api('/auth/register', { body: { email: otherEmail, full_name: 'New Customer', password } });
  const originalNewCode = emailCode('Xác minh', otherEmail);
  const wrong = originalNewCode === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) await api('/auth/verify-registration', { body: { email: otherEmail, code: wrong }, status: 400 });
  await api('/auth/verify-registration', { body: { email: otherEmail, code: originalNewCode }, status: 400 });
  await auth.redis.del(accounts.key('register:cooldown', otherEmail));
  await api('/auth/resend-verification', { body: { email: otherEmail } });
  let newActivation = emailCode('Xác minh', otherEmail);
  const pendingKey = accounts.key('register', otherEmail);
  const pending = JSON.parse(await auth.redis.get(pendingKey));
  assert.notEqual(pending.code, newActivation, 'Only a keyed digest is stored');
  pending.code_expires_at = Date.now() - 1;
  await auth.redis.set(pendingKey, JSON.stringify(pending), 'EX', 1800);
  await api('/auth/verify-registration', { body: { email: otherEmail, code: newActivation }, status: 400 });
  await auth.redis.del(accounts.key('register:cooldown', otherEmail));
  await api('/auth/resend-verification', { body: { email: otherEmail } });
  newActivation = emailCode('Xác minh', otherEmail);
  await api('/auth/verify-registration', { body: { email: otherEmail, code: newActivation } });
  const fresh = await api('/auth/login', { body: { email: otherEmail, password } });
  assert.equal((await api('/bookings', { token: fresh.access_token })).total, 0);
  await api(`/bookings/${draftFlow.booking_id}/checkout`, { token: fresh.access_token, status: 404 });
  await api(`/bookings/${booking.id}`, { token: fresh.access_token, status: 404 });
  await api(`/bookings/${createdBookings[0]}/pins`, { token: fresh.access_token, status: 404 });
  await api(`/bookings/${createdBookings[0]}/requests`, { token: fresh.access_token, status: 404 });

  console.log(`PASS: ${checks} HTTP checks; verified signup, existing guest-booking linkage, account vs guest permissions, password login/change/reset, token replay and invalidation, profile secrecy, logout independence.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (db?.isInitialized) {
    for (const id of createdBookings) {
      await db.getRepository(entities.LockPin).delete({ booking_id: id });
      await db.getRepository(entities.Refund).delete({ booking_id: id });
      await db.getRepository(entities.AuditLog).delete({ entity_type: 'BOOKINGS', entity_id: id });
      await db.getRepository(entities.Transaction).delete({ booking_id: id });
      await db.getRepository(entities.Booking).delete(id);
    }
    if (guest) await db.getRepository(entities.AuditLog).delete({ actor: `customer:${guest.id}` });
    if (booking) await db.getRepository(entities.Booking).delete(booking.id);
    await db.getRepository(users.Customer).delete({ email: require('typeorm').In([email, otherEmail]) });
  }
  if (auth) {
    const keys = sessions.map(id => `customer:session:${id}`);
    const digest = value => crypto.createHmac('sha256', process.env.JWT_SECRET).update(value).digest('hex');
    for (const address of [email, otherEmail]) {
      keys.push(`customer:cooldown:${digest(address)}`, `customer:rate:email:${digest(address)}`, `customer:otp:lookup:${digest(address)}`, `customer:otp:booking:${digest(address)}`);
      if (accounts) for (const action of ['register', 'reset', 'register:cooldown', 'forgot:cooldown', ...['register', 'login', 'forgot'].flatMap(k => [`rate:${k}:email`, `rate:${k}:ip`])]) keys.push(accounts.key(action, action.endsWith(':ip') ? ip : address));
    }
    keys.push(`customer:rate:ip:${digest(ip)}`);
    if (accounts && guest) for (const [action, val] of [['rate:change-password:email', String(guest.id)], ['rate:change-password:ip', `account:${guest.id}`]]) keys.push(accounts.key(action, val));
    await auth.redis.del(...keys);
  }
  if (app) await app.close();
});
