// Full account lifecycle + guest isolation; local MySQL/Redis, captured email only.
require('dotenv').config({ quiet: true }); require('../register-paths.cjs'); require('reflect-metadata');
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
const password = 'Qa-Original-2026';
(async () => {
  const module = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmModule.forRoot({ type: 'mysql', host: process.env.DB_HOST, port: Number(process.env.DB_PORT), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE, entities: [...Object.values(users), ...Object.values(rooms), ...Object.values(entities)].filter(x => typeof x === 'function'), synchronize: false }), CustomerModule] })
    .overrideProvider(CustomerMailService).useValue({ send: async (to, subject, text) => { assert.ok(to.endsWith('@example.test')); mails.push({ to, subject, text }); } }).compile();
  app = module.createNestApplication({ logger: false }); app.use((req, _res, next) => { Object.defineProperty(req, 'ip', { value: ip }); next(); });
  app.setGlobalPrefix('api'); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  await app.listen(0, '127.0.0.1'); db = app.get(DataSource); auth = app.get(CustomerAuthService); accounts = app.get(CustomerAccountService);
  const base = await app.getUrl();
  async function api(route, { body, token, status = body ? 201 : 200, method = body ? 'POST' : 'GET' } = {}) {
    const response = await fetch(`${base}/api/customer${route}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json(); assert.equal(response.status, status, `${route}: ${JSON.stringify(data)}`); checks++;
    if (data.access_token) sessions.push(JSON.parse(Buffer.from(data.access_token.split('.')[1], 'base64url')).jti);
    return data;
  }
  function emailCode(subject, to = email) { const mail = mails.filter(m => m.to === to && m.subject.includes(subject)).at(-1); assert.ok(mail, 'Verification/reset email captured'); assert.ok(!mail.text.includes('http'), 'No device-specific link in email'); return mail.text.match(/\b\d{6}\b/)[0]; }
  guest = await db.getRepository(users.Customer).save({ full_name: 'Existing Guest', email, phone: '0912345678' });
  const type = await db.getRepository(rooms.RoomType).findOneByOrFail({ is_active: true });
  booking = await db.getRepository(entities.Booking).save({ customer_id: guest.id, apartment_id: type.apartment_id, booking_code: `QA-LIFE-${suffix}`, booking_type: 'overnight', booked_start_time: new Date(Date.now() + 30 * 86400000), booked_end_time: new Date(Date.now() + 32 * 86400000), booking_status: 'pending_payment', total_price: 100, adults: 1, children: 0 });
  await api('/auth/login', { body: { email, password }, status: 401 });
  await api('/auth/otp/request', { body: { email, purpose: 'account' }, status: 400 });
  await api('/auth/otp/request', { body: { email, purpose: 'lookup' } });
  const otp = mails.at(-1).text.match(/\b\d{6}\b/)[0];
  const lookup = await api('/auth/otp/verify', { body: { email, purpose: 'lookup', code: otp } });
  assert.equal(lookup.scope, 'lookup');
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
  await api(`/bookings/${booking.id}`, { token: fresh.access_token, status: 404 });
  console.log(`PASS: ${checks} HTTP checks; verified signup, existing guest-booking linkage, account vs guest permissions, password login/change/reset, token replay and invalidation, profile secrecy, logout independence.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (db?.isInitialized) {
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
