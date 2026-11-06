import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class CustomerMailService {
  constructor(private config: ConfigService) {}
  async send(to: string, subject: string, text: string, html?: string) {
    const host = this.config.get<string>('SMTP_HOST', '127.0.0.1');
    const port = Number(this.config.get('SMTP_PORT', 1025));
    const secure = String(this.config.get('SMTP_SECURE', 'false')).toLowerCase() === 'true';
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!Number.isInteger(port) || port < 1 || port > 65535 || Boolean(user) !== Boolean(pass) ||
        (this.config.get('NODE_ENV') === 'production' && (!user || !pass))) {
      throw new ServiceUnavailableException('Dịch vụ gửi email chưa được cấu hình.');
    }
    const transport = nodemailer.createTransport({ host, port, secure, requireTLS: !secure && Boolean(user), auth: user ? { user, pass } : undefined, connectionTimeout: 5000, socketTimeout: 10000 });
    try {
      const info = await transport.sendMail({ from: this.config.get('SMTP_FROM', `Đồi Bông Gòn <${user || 'no-reply@homestay.local'}>`), to, subject, text, html });
      if (info.rejected?.length || (info.accepted && !info.accepted.length)) throw new Error('SMTP rejected recipient');
    } catch { throw new ServiceUnavailableException('Chưa gửi được email. Vui lòng thử lại sau.'); }
    finally { transport.close(); }
  }
}
