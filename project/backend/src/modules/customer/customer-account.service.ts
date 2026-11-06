import { BadRequestException, HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomBytes, randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Customer } from '../../entities/user.entity';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerMailService } from './customer-mail.service';
import { RegisterCustomerDto } from './customer.dto';

const CONSUME = `local raw=redis.call('GET',KEYS[1]); if not raw then return '' end; local r=cjson.decode(raw); if r.token~=ARGV[1] then return '' end; redis.call('DEL',KEYS[1]); return raw`;
const VERIFY_CODE = `
local raw=redis.call('GET',KEYS[1]); if not raw then return 'EXPIRED' end
local r=cjson.decode(raw); if not r.code or not r.code_expires_at or r.code_expires_at<=tonumber(ARGV[2]) then return 'EXPIRED' end
if (r.attempts or 0)>=5 then return 'LOCKED' end
r.attempts=(r.attempts or 0)+1
if r.code==ARGV[1] then redis.call('DEL',KEYS[1]); return raw end
redis.call('SET',KEYS[1],cjson.encode(r),'KEEPTTL')
if r.attempts>=5 then return 'LOCKED' end; return 'INVALID'`;
const RATE = `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n`;
@Injectable()
export class CustomerAccountService {
  private dummyHash = bcrypt.hash(randomBytes(32).toString('hex'), 12);
  constructor(private db: DataSource, private auth: CustomerAuthService, private mail: CustomerMailService) {}
  private key(action: string, value: string) {
    return `customer:account:${action}:${this.auth.credentialVersion({ password_hash: value } as Customer)}`;
  }
  private async rate(action: string, email: string, ip: string, max = 10, ttl = 900) {
    const n = Number(await this.auth.redis.eval(RATE, 1, this.key(`rate:${action}:email`, email), ttl));
    const ipN = Number(await this.auth.redis.eval(RATE, 1, this.key(`rate:${action}:ip`, ip), ttl));
    if (n > max || ipN > max * 3) throw new HttpException({ message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.', retry_after: ttl }, 429);
  }
  private find(email: string) {
    return this.db.getRepository(Customer).createQueryBuilder('c').addSelect('c.password_hash').where('c.email = :email', { email }).getOne();
  }
  private makeCode(email: string, purpose: 'register' | 'reset') {
    const code = randomInt(0, 1000000).toString().padStart(6, '0');
    return { code, record: { code: this.key(`${purpose}:code`, `${email}:${code}`), code_expires_at: Date.now() + 300000, attempts: 0 } };
  }
  private async sendCode(email: string, purpose: 'register' | 'reset', code: string) {
    const action = purpose === 'register' ? 'xác minh đăng ký tài khoản' : 'đặt lại mật khẩu';
    await this.mail.send(email, `${purpose === 'register' ? 'Xác minh tài khoản' : 'Đặt lại mật khẩu'} Đồi Bông Gòn`,
      `Mã ${action} của bạn: ${code}\nNhập mã này tại trang bạn đang mở. Mã có hiệu lực 5 phút và chỉ dùng một lần. Không cần bấm liên kết. Nếu không phải bạn yêu cầu, hãy bỏ qua email này.`,
      `<p>Mã ${action} của bạn:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p><p>Nhập mã này tại trang bạn đang mở. Mã có hiệu lực 5 phút, chỉ dùng một lần. Không chia sẻ mã cho người khác.</p>`);
  }
  private async consumeCode(email: string, purpose: 'register' | 'reset', code: string) {
    const raw = String(await this.auth.redis.eval(VERIFY_CODE, 1, this.key(purpose, email), this.key(`${purpose}:code`, `${email}:${code}`), Date.now()));
    if (raw === 'LOCKED') throw new BadRequestException('Bạn đã nhập sai 5 lần. Vui lòng gửi mã mới.');
    if (raw === 'EXPIRED') throw new BadRequestException('Mã đã hết hạn hoặc đã được dùng. Vui lòng gửi mã mới.');
    if (raw === 'INVALID') throw new BadRequestException('Mã xác minh không đúng. Hãy dùng mã trong email mới nhất.');
    return JSON.parse(raw);
  }
  async register(data: RegisterCustomerDto, ip: string) {
    const email = this.auth.normalize(data.email);
    await this.rate('register', email, ip, 5, 3600);
    const generic = { message: 'Kiểm tra email để nhận mã hoàn tất đăng ký. Nếu đã có tài khoản, bạn có thể đăng nhập hoặc đặt lại mật khẩu.', retry_after: 60, expires_in: 300 };
    const existing = await this.find(email);
    if (existing?.password_hash || existing?.is_blocked || existing?.is_hidden) return generic;
    const cooldown = this.key('register:cooldown', email);
    if (!(await this.auth.redis.set(cooldown, '1', 'EX', 60, 'NX'))) throw new HttpException('Vui lòng đợi 60 giây trước khi gửi lại mã xác minh.', 429);
    const challenge = this.makeCode(email, 'register');
    const pending = { ...challenge.record, full_name: data.full_name, phone: data.phone || '', password_hash: await bcrypt.hash(data.password, 12) };
    const key = this.key('register', email);
    await this.auth.redis.set(key, JSON.stringify(pending), 'EX', 1800);
    try { await this.sendCode(email, 'register', challenge.code); }
    catch (error) { await this.auth.redis.del(key, cooldown); throw error; }
    return generic;
  }
  async verifyEmail(emailInput: string, token: string) {
    const email = this.auth.normalize(emailInput);
    const raw = String(await this.auth.redis.eval(CONSUME, 1, this.key('register', email), this.key('token', token)));
    if (!raw) throw new BadRequestException('Liên kết xác minh không hợp lệ, đã dùng hoặc hết hạn. Vui lòng đăng ký lại để nhận liên kết mới.');
    const pending = JSON.parse(raw);
    await this.activate(email, pending);
    return { message: 'Đã xác minh email và tạo tài khoản. Bạn có thể đăng nhập bằng email và mật khẩu.' };
  }
  private async activate(email: string, pending: { full_name: string; phone: string; password_hash: string }) {
    return this.db.transaction(async manager => {
      const repo = manager.getRepository(Customer);
      await repo.createQueryBuilder().insert().values({ email, full_name: pending.full_name }).orIgnore().updateEntity(false).execute();
      const customer = await repo.createQueryBuilder('c').addSelect('c.password_hash').where('c.email = :email', { email }).setLock('pessimistic_write').getOne();
      if (!customer || customer.is_blocked || customer.is_hidden) throw new BadRequestException('Không thể kích hoạt tài khoản.');
      if (customer.password_hash) throw new BadRequestException('Email đã có tài khoản. Vui lòng đăng nhập.');
      customer.full_name = pending.full_name; customer.phone = pending.phone || customer.phone;
      customer.password_hash = pending.password_hash; customer.account_created_at = new Date(); customer.email_verified_at = new Date();
      return repo.save(customer);
    });
  }
  async verifyRegistration(emailInput: string, code: string) {
    const email = this.auth.normalize(emailInput);
    const pending = await this.consumeCode(email, 'register', code);
    const customer = await this.activate(email, pending);
    return this.auth.issueSession(customer, 'account');
  }
  async resendVerification(emailInput: string, ip: string) {
    const email = this.auth.normalize(emailInput);
    await this.rate('register', email, ip, 5, 3600);
    const cooldown = this.key('register:cooldown', email);
    if (!(await this.auth.redis.set(cooldown, '1', 'EX', 60, 'NX'))) throw new HttpException('Vui lòng đợi 60 giây trước khi gửi lại mã xác minh.', 429);
    const generic = { message: 'Kiểm tra email để nhận mã xác minh mới. Nếu đã có tài khoản, hãy đăng nhập.', retry_after: 60, expires_in: 300 };
    const key = this.key('register', email), raw = await this.auth.redis.get(key);
    if (!raw) return generic;
    const customer = await this.find(email);
    if (customer?.password_hash || customer?.is_blocked || customer?.is_hidden) return generic;
    const pending = JSON.parse(raw);
    let challenge = this.makeCode(email, 'register');
    while (challenge.record.code === pending.code) challenge = this.makeCode(email, 'register');
    delete pending.token; Object.assign(pending, challenge.record);
    await this.auth.redis.set(key, JSON.stringify(pending), 'EX', 1800);
    try { await this.sendCode(email, 'register', challenge.code); }
    catch (error) { await this.auth.redis.del(cooldown); throw error; }
    return generic;
  }
  async login(emailInput: string, password: string, ip: string) {
    const email = this.auth.normalize(emailInput);
    await this.rate('login', email, ip);
    const customer = await this.find(email);
    const valid = await bcrypt.compare(password, customer?.password_hash || await this.dummyHash);
    if (!valid || !customer?.password_hash || !customer.email_verified_at || customer.is_blocked || customer.is_hidden) throw new UnauthorizedException('Email hoặc mật khẩu không đúng, hoặc tài khoản chưa được kích hoạt.');
    return this.auth.issueSession(customer, 'account');
  }
  async forgotPassword(emailInput: string, ip: string) {
    const email = this.auth.normalize(emailInput);
    await this.rate('forgot', email, ip, 5, 3600);
    const cooldown = this.key('forgot:cooldown', email);
    if (!(await this.auth.redis.set(cooldown, '1', 'EX', 60, 'NX'))) throw new HttpException('Vui lòng đợi 60 giây trước khi gửi lại mã.', 429);
    const generic = { message: 'Nếu email có tài khoản, mã đặt lại mật khẩu đã được gửi. Nhập mã ngay trên trang này.', retry_after: 60, expires_in: 300 };
    const customer = await this.find(email);
    if (!customer?.password_hash || !customer.email_verified_at || customer.is_blocked || customer.is_hidden) return generic;
    const challenge = this.makeCode(email, 'reset');
    const key = this.key('reset', email);
    await this.auth.redis.set(key, JSON.stringify({ ...challenge.record, version: this.auth.credentialVersion(customer) }), 'EX', 1800);
    try { await this.sendCode(email, 'reset', challenge.code); }
    catch (error) { await this.auth.redis.del(key, cooldown); throw error; }
    return generic;
  }
  async resetPassword(emailInput: string, token: string, password: string) {
    const email = this.auth.normalize(emailInput);
    const raw = String(await this.auth.redis.eval(CONSUME, 1, this.key('reset', email), this.key('token', token)));
    if (!raw) throw new BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ, đã dùng hoặc hết hạn.');
    const record = JSON.parse(raw);
    return this.applyReset(email, record.version, password);
  }
  async resetPasswordCode(emailInput: string, code: string, password: string) {
    const email = this.auth.normalize(emailInput);
    const record = await this.consumeCode(email, 'reset', code);
    return this.applyReset(email, record.version, password);
  }
  private async applyReset(email: string, version: string, password: string) {
    const password_hash = await bcrypt.hash(password, 12);
    await this.db.transaction(async manager => {
      const repo = manager.getRepository(Customer);
      const customer = await repo.createQueryBuilder('c').addSelect('c.password_hash').where('c.email = :email', { email }).setLock('pessimistic_write').getOne();
      if (!customer?.password_hash || customer.is_blocked || customer.is_hidden || version !== this.auth.credentialVersion(customer)) throw new BadRequestException('Yêu cầu đặt lại mật khẩu không còn hiệu lực.');
      await repo.update(customer.id, { password_hash });
    });
    return { message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.' };
  }
  async changePassword(id: number, current: string, password: string) {
    await this.rate('change-password', String(id), `account:${id}`, 5);
    const customer = await this.db.getRepository(Customer).createQueryBuilder('c').addSelect('c.password_hash').where('c.customer_id = :id', { id }).getOne();
    if (!customer?.password_hash || !(await bcrypt.compare(current, customer.password_hash))) throw new UnauthorizedException('Mật khẩu hiện tại không đúng.');
    const password_hash = await bcrypt.hash(password, 12);
    const result = await this.db.getRepository(Customer).update({ id, password_hash: customer.password_hash }, { password_hash });
    if (!result.affected) throw new BadRequestException('Tài khoản vừa thay đổi. Vui lòng đăng nhập lại.');
    return { message: 'Đã đổi mật khẩu. Các phiên đăng nhập cũ đã hết hiệu lực; vui lòng đăng nhập lại.' };
  }
}
