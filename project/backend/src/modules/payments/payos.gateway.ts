import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PayOS = require('@payos/node');

// Credentials and signature checks stay on the server. No browser fallback.
@Injectable()
export class PayosGateway {
  constructor(private config: ConfigService) {}
  private client() {
    const keys = ['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY'].map(k => this.config.get<string>(k));
    if (keys.some(k => !k)) throw new ServiceUnavailableException('Chưa cấu hình cổng thanh toán PayOS. Vui lòng liên hệ homestay.');
    return new PayOS(keys[0], keys[1], keys[2]);
  }
  private async bounded<T>(request: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    try {
      return await Promise.race([request, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 15000); })]);
    } catch { throw new ServiceUnavailableException('Chưa kết nối được PayOS. Tiền chưa được xác nhận; vui lòng kiểm tra lại trạng thái trước khi thử lại.'); }
    finally { clearTimeout(timer); }
  }
  create(data: Parameters<PayOS['createPaymentLink']>[0]) { return this.bounded(this.client().createPaymentLink(data)); }
  get(orderCode: number) { return this.bounded(this.client().getPaymentLinkInformation(orderCode)); }
  verify(body: any) {
    if (!body?.signature || !body?.data) throw new BadRequestException('Thiếu chữ ký PayOS.');
    try { return this.client().verifyPaymentWebhookData(body); }
    catch { throw new BadRequestException('Chữ ký PayOS không hợp lệ.'); }
  }
}
