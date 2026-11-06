import { BadRequestException, HttpException, Injectable, OnModuleDestroy, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { createHmac, randomInt, randomUUID } from 'crypto';
import Redis from 'ioredis';
import { CustomerMailService } from './customer-mail.service';
import { Customer } from '../../entities/user.entity';

const VERIFY = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
local record = cjson.decode(raw)
record.attempts = record.attempts + 1
if record.hash == ARGV[1] then redis.call('DEL', KEYS[1]); return 1 end
if record.attempts >= 5 then redis.call('DEL', KEYS[1])
else redis.call('SET', KEYS[1], cjson.encode(record), 'KEEPTTL') end
return 0`;
const RATE = `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 3600) end; return n`;

@Injectable()
export class CustomerAuthService implements OnModuleDestroy {
  readonly redis: Redis;
  constructor(private config: ConfigService, private jwt: JwtService, private db: DataSource, private mail: CustomerMailService) {
    this.redis = new Redis(config.get('REDIS_URL', 'redis://127.0.0.1:6379'), {
      lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 3000,
    });
    this.redis.on('error', () => { /* Requests report a controlled 503 without logging credentials. */ });
  }
  onModuleDestroy() { this.redis.disconnect(); }
  normalize(email: string) { return email.trim().toLowerCase(); }
  private digest(value: string) {
    return createHmac('sha256', this.config.get('JWT_SECRET', 'homestay_jwt_secret_key_2026_autocheckin')).update(value).digest('hex');
  }
  private key(email: string, purpose: string) { return `customer:otp:${purpose}:${this.digest(email)}`; }
  private async storage<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('Không thể kết nối dịch vụ xác thực. Vui lòng thử lại.');
    }
  }
  async requestOtp(emailInput: string, purpose: 'lookup' | 'booking', ip: string) {
    const email = this.normalize(emailInput);
    const key = this.key(email, purpose);
    await this.storage(async () => {
      const ipCount = Number(await this.redis.eval(RATE, 1, `customer:rate:ip:${this.digest(ip)}`));
      if (ipCount > 30) throw new HttpException('Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau.', 429);
      // Cooldown is shared across purposes so switching tabs cannot bypass it.
      if (!(await this.redis.set(`customer:cooldown:${this.digest(email)}`, '1', 'EX', 60, 'NX'))) {
        throw new HttpException('Vui lòng đợi 60 giây trước khi gửi lại mã.', 429);
      }
      const count = Number(await this.redis.eval(RATE, 1, `customer:rate:email:${this.digest(email)}`));
      if (count > 10) throw new HttpException('Email đã đạt giới hạn gửi mã. Vui lòng thử lại sau.', 429);
    });
    const code = randomInt(0, 1000000).toString().padStart(6, '0');
    const challenge = JSON.stringify({ hash: this.digest(`${email}:${purpose}:${code}`), attempts: 0 });
    await this.storage(() => this.redis.set(key, challenge, 'EX', 300));
    try {
      await this.mail.send(email, 'Mã xác thực Đồi Bông Gòn',
        `Mã xác thực của bạn: ${code}\nMã có hiệu lực 5 phút, chỉ dùng một lần cho ${purpose === 'lookup' ? 'tra cứu booking' : 'đặt phòng'}.`,
        `<p>Mã xác thực của bạn: <strong>${code}</strong></p><p>Mã có hiệu lực 5 phút, chỉ dùng một lần cho ${purpose === 'lookup' ? 'tra cứu booking' : 'đặt phòng'}. Không chia sẻ mã này.</p>`);
    } catch {
      await this.storage(() => this.redis.del(key, `customer:cooldown:${this.digest(email)}`));
      throw new ServiceUnavailableException('Chưa gửi được email xác thực. Vui lòng thử lại sau.');
    }
    return { message: 'Mã xác thực đã được gửi đến email của bạn.', expires_in: 300, retry_after: 60 };
  }
  async verifyOtp(emailInput: string, purpose: 'lookup' | 'booking', code: string) {
    const email = this.normalize(emailInput);
    const valid = await this.storage(() => this.redis.eval(VERIFY, 1, this.key(email, purpose), this.digest(`${email}:${purpose}:${code}`)));
    if (Number(valid) !== 1) throw new UnauthorizedException('Mã không đúng, đã hết hạn hoặc đã được sử dụng.');
    const repo = this.db.getRepository(Customer);
    let customer = await repo.findOne({ where: { email } });
    if (!customer && purpose === 'booking') {
      // Ignore a duplicate email inserted concurrently by checkout or another verification.
      await repo.createQueryBuilder().insert().values({ email, full_name: email.split('@')[0] }).orIgnore().updateEntity(false).execute();
      customer = await repo.findOne({ where: { email } });
    }
    if (!customer) throw new BadRequestException('Chưa tìm thấy booking với email này. Bạn có thể đăng nhập hoặc đặt phòng mới.');
    if (customer.is_blocked || customer.is_hidden) throw new UnauthorizedException('Tài khoản không khả dụng. Vui lòng liên hệ hỗ trợ.');
    return this.issueSession(customer, 'lookup');
  }
  credentialVersion(customer: Customer) { return this.digest(`credential:${customer.password_hash}`); }
  async issueSession(customer: Customer, scope: 'account' | 'lookup') {
    const jti = randomUUID();
    const access_token = this.jwt.sign({ sub: customer.id, email: customer.email, type: 'customer', scope, jti,
      ...(scope === 'account' ? { cv: this.credentialVersion(customer) } : {}),
    }, { expiresIn: '2h' });
    await this.storage(() => this.redis.set(`customer:session:${jti}`, String(customer.id), 'EX', 7200));
    return { access_token, customer: this.profile(customer), scope, expires_in: 7200 };
  }
  profile(customer: Customer) { return { id: customer.id, full_name: customer.full_name, email: customer.email, phone: customer.phone, account_created_at: customer.account_created_at, email_verified_at: customer.email_verified_at }; }
  async authenticate(token: string) {
    let payload: any;
    try { payload = this.jwt.verify(token); } catch { throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.'); }
    if (payload.type !== 'customer' || !payload.jti || !['account', 'lookup'].includes(payload.scope)) throw new UnauthorizedException();
    const session = await this.storage(() => this.redis.get(`customer:session:${payload.jti}`));
    if (session !== String(payload.sub)) throw new UnauthorizedException();
    const customer = await this.db.getRepository(Customer).createQueryBuilder('c').addSelect('c.password_hash').where('c.customer_id = :id', { id: Number(payload.sub) }).getOne();
    if (!customer || customer.is_blocked || customer.is_hidden || this.normalize(customer.email) !== payload.email) throw new UnauthorizedException();
    if (payload.scope === 'account' && (!customer.password_hash || !customer.email_verified_at || payload.cv !== this.credentialVersion(customer))) throw new UnauthorizedException('Vui lòng đăng nhập lại bằng tài khoản đã đăng ký.');
    return { customer, scope: payload.scope, jti: payload.jti };
  }
  async logout(jti: string) { await this.storage(() => this.redis.del(`customer:session:${jti}`)); return { message: 'Đã đăng xuất.' }; }
}
