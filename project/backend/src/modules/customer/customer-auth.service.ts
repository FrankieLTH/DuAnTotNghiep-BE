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
if not raw then return -1 end
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
  private memStore = new Map<string, { value: string; expiresAt: number }>();
  private redisAvailable = true;

  constructor(private config: ConfigService, private jwt: JwtService, private db: DataSource, private mail: CustomerMailService) {
    this.redis = new Redis(config.get('REDIS_URL', 'redis://127.0.0.1:6379'), {
      lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 1500,
    });
    this.redis.on('error', () => {
      this.redisAvailable = false;
    });
  }

  onModuleDestroy() { 
    try { this.redis.disconnect(); } catch {}
  }

  normalize(email: string) { return email.trim().toLowerCase(); }
  private digest(value: string) {
    return createHmac('sha256', this.config.get('JWT_SECRET', 'homestay_jwt_secret_key_2026_autocheckin')).update(value).digest('hex');
  }
  private key(email: string, purpose: string) { return `customer:otp:${purpose}:${this.digest(email)}`; }

  private memGet(key: string): string | null {
    const item = this.memStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memStore.delete(key);
      return null;
    }
    return item.value;
  }

  private memSet(key: string, value: string, ttlSeconds: number) {
    this.memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  private memDel(...keys: string[]) {
    for (const k of keys) this.memStore.delete(k);
  }

  private async storage<T>(operation: () => Promise<T>): Promise<T> {
    try { 
      return await operation(); 
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.redisAvailable = false;
      throw new ServiceUnavailableException('Không thể kết nối dịch vụ xác thực.');
    }
  }

  async requestOtp(emailInput: string, purpose: 'lookup' | 'booking', ip: string) {
    const email = this.normalize(emailInput);
    const key = this.key(email, purpose);

    // Kiểm tra rate limit bằng Redis nếu có, hoặc memStore
    if (this.redisAvailable) {
      try {
        const ipCount = Number(await this.redis.eval(RATE, 1, `customer:rate:ip:${this.digest(ip)}`));
        if (ipCount > 30) throw new HttpException('Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau.', 429);
        if (!(await this.redis.set(`customer:cooldown:${this.digest(email)}`, '1', 'EX', 60, 'NX'))) {
          throw new HttpException('Vui lòng đợi 60 giây trước khi gửi lại mã.', 429);
        }
      } catch (err) {
        if (err instanceof HttpException) throw err;
        this.redisAvailable = false;
      }
    }

    const code = randomInt(0, 1000000).toString().padStart(6, '0');
    const challenge = JSON.stringify({ hash: this.digest(`${email}:${purpose}:${code}`), attempts: 0 });

    if (this.redisAvailable) {
      try {
        await this.redis.set(key, challenge, 'EX', 300);
      } catch {
        this.redisAvailable = false;
      }
    }
    // Luôn ghi vào memStore để dự phòng
    this.memSet(key, challenge, 300);

    // Gửi email thật qua SMTP
    try {
      await this.mail.send(email, 'Mã xác thực Đồi Bông Gòn',
        `Mã xác thực của bạn: ${code}\nMã có hiệu lực 5 phút, chỉ dùng một lần cho ${purpose === 'lookup' ? 'tra cứu booking' : 'đặt phòng'}.`,
        `<div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;border:1px solid #E8DFD1;border-radius:12px;background:#FAF8F5;">
          <h2 style="color:#C85A32;margin-top:0;">Homestay Đồi Bông Gòn</h2>
          <p style="color:#3E2C23;font-size:14px;">Xin chào,</p>
          <p style="color:#3E2C23;font-size:14px;">Mã xác thực OTP của bạn cho thao tác ${purpose === 'lookup' ? 'tra cứu booking' : 'đặt phòng'} là:</p>
          <div style="text-align:center;margin:24px 0;">
            <span style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#C85A32;background:#FFF;padding:12px 24px;border-radius:8px;border:1px dashed #C85A32;display:inline-block;">${code}</span>
          </div>
          <p style="color:#8C7A70;font-size:12px;line-height:1.5;">Mã có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai để bảo vệ thông tin đặt phòng của bạn.</p>
        </div>`);
    } catch (mailError) {
      console.error('Lỗi gửi email OTP:', mailError);
      throw new ServiceUnavailableException('Không thể gửi email xác thực đến địa chỉ này. Vui lòng kiểm tra lại email hoặc thử lại sau.');
    }

    return { 
      message: 'Mã xác thực đã được gửi đến email của bạn.', 
      expires_in: 300, 
      retry_after: 60
    };
  }

  async verifyOtp(emailInput: string, purpose: 'lookup' | 'booking', code: string) {
    const email = this.normalize(emailInput);
    const key = this.key(email, purpose);
    let valid = 0;

    if (this.redisAvailable) {
      try {
        valid = Number(await this.redis.eval(VERIFY, 1, key, this.digest(`${email}:${purpose}:${code}`)));
      } catch {
        this.redisAvailable = false;
      }
    }

    if (!this.redisAvailable) {
      const raw = this.memGet(key);
      if (!raw) {
        valid = -1;
      } else {
        const record = JSON.parse(raw);
        record.attempts = (record.attempts || 0) + 1;
        if (record.hash === this.digest(`${email}:${purpose}:${code}`)) {
          this.memDel(key);
          valid = 1;
        } else if (record.attempts >= 5) {
          this.memDel(key);
          valid = 0;
        } else {
          this.memSet(key, JSON.stringify(record), 300);
          valid = 0;
        }
      }
    }

    if (Number(valid) === -1) throw new UnauthorizedException('Mã đã hết hạn, đã được sử dụng hoặc không còn hiệu lực. Vui lòng gửi mã mới.');
    if (Number(valid) !== 1) throw new UnauthorizedException('Mã chưa khớp. Hãy kiểm tra mã xác thực trong email.');

    const repo = this.db.getRepository(Customer);
    let customer = await repo.findOne({ where: { email } });
    if (!customer && purpose === 'booking') {
      await repo.createQueryBuilder().insert().values({ email, full_name: email.split('@')[0] }).orIgnore().updateEntity(false).execute();
      customer = await repo.findOne({ where: { email } });
    }
    if (!customer) return {
      verified: true, has_bookings: false, customer: null, scope: 'lookup' as const,
      message: 'Xác thực email thành công.',
    };
    if (customer.is_blocked || customer.is_hidden) throw new UnauthorizedException('Tài khoản không khả dụng. Vui lòng liên hệ hỗ trợ.');
    return this.issueSession(customer, 'lookup');
  }
  credentialVersion(customer: Customer) { return this.digest(`credential:${customer.password_hash}`); }
  async issueSession(customer: Customer, scope: 'account' | 'lookup') {
    const jti = randomUUID();
    const access_token = this.jwt.sign({ sub: customer.id, email: customer.email, type: 'customer', scope, jti,
      ...(scope === 'account' ? { cv: this.credentialVersion(customer) } : {}),
    }, { expiresIn: '2h' });
    if (this.redisAvailable) {
      try {
        await this.redis.set(`customer:session:${jti}`, String(customer.id), 'EX', 7200);
      } catch {
        this.redisAvailable = false;
        this.memSet(`customer:session:${jti}`, String(customer.id), 7200);
      }
    } else {
      this.memSet(`customer:session:${jti}`, String(customer.id), 7200);
    }
    return { access_token, customer: this.profile(customer), scope, expires_in: 7200 };
  }
  profile(customer: Customer) { return { id: customer.id, full_name: customer.full_name, email: customer.email, phone: customer.phone, account_created_at: customer.account_created_at, email_verified_at: customer.email_verified_at, wallet_balance: Number(customer.wallet_balance || 0), wallet_available: Math.max(0, Number(customer.wallet_balance || 0) - Number(customer.wallet_reserved || 0)) }; }
  async authenticate(token: string) {
    let payload: any;
    try { payload = this.jwt.verify(token); } catch { throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.'); }
    if (payload.type !== 'customer' || !payload.jti || !['account', 'lookup'].includes(payload.scope)) throw new UnauthorizedException();
    let session: string | null = null;
    if (this.redisAvailable) {
      try {
        session = await this.redis.get(`customer:session:${payload.jti}`);
      } catch {
        this.redisAvailable = false;
        session = this.memGet(`customer:session:${payload.jti}`);
      }
    } else {
      session = this.memGet(`customer:session:${payload.jti}`);
    }
    if (session !== String(payload.sub)) throw new UnauthorizedException();
    const customer = await this.db.getRepository(Customer).createQueryBuilder('c').addSelect('c.password_hash').where('c.customer_id = :id', { id: Number(payload.sub) }).getOne();
    if (!customer || customer.is_blocked || customer.is_hidden || this.normalize(customer.email) !== payload.email) throw new UnauthorizedException();
    if (payload.scope === 'account' && (!customer.password_hash || !customer.email_verified_at || payload.cv !== this.credentialVersion(customer))) throw new UnauthorizedException('Vui lòng đăng nhập lại bằng tài khoản đã đăng ký.');
    return { customer, scope: payload.scope, jti: payload.jti };
  }
  async logout(jti: string) { 
    if (this.redisAvailable) {
      try { await this.redis.del(`customer:session:${jti}`); } catch { this.memDel(`customer:session:${jti}`); }
    } else {
      this.memDel(`customer:session:${jti}`);
    }
    return { message: 'Đã đăng xuất.' }; 
  }
}
