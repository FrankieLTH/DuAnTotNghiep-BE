import { Controller, Post, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('payments/create-payos-url')
  async createPayOSUrl(@Body() body: { booking_id: number }) {
    return this.paymentsService.createPayOSUrl(body.booking_id);
  }

  @Post('webhooks/payos')
  async handlePayOSWebhook(@Body() body: any) {
    return this.paymentsService.handlePayOSWebhook(body);
  }
}
