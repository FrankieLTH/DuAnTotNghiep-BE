import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { TTLockCallbackDto } from './dto/ttlock-callback.dto';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  /**
   * Endpoint nhận Webhook callback từ TTLock Cloud
   * Route: POST /webhooks/ttlock/callback
   * Request format: application/x-www-form-urlencoded
   * Bắt buộc trả về chuỗi thuần "success" theo đúng chuẩn TTLock OpenAPI specification
   */
  @Post('ttlock/callback')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/plain')
  handleTTLockCallback(@Body() body: TTLockCallbackDto): string {
    const { notifyType, lockId, lockMac, records } = body;

    this.logger.log(
      `[TTLock Webhook] Received callback - notifyType: ${notifyType}, lockId: ${lockId}, lockMac: ${lockMac}`,
    );

    let parsedRecords = null;
    if (records) {
      try {
        parsedRecords = typeof records === 'string' ? JSON.parse(records) : records;
      } catch (err) {
        this.logger.warn(`Failed to parse TTLock records JSON string: ${records}`);
      }
    }

    // TODO: Đối chiếu bản ghi mở khoá (parsedRecords / records) với thông tin booking trong CSDL:
    // 1. Tìm booking ứng với lockId trong khoảng thời gian hiện tại.
    // 2. Nếu khớp, cập nhật trạng thái booking thành "CHECKED_IN".
    // 3. Phát sự kiện Realtime (Socket.io) báo cho Dashboard Admin: "Khách đã nhập mã mở khoá thành công".

    return 'success';
  }
}
