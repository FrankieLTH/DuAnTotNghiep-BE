import { Controller, Post, Get, Body, Req, Param, ParseIntPipe, UseGuards, HttpCode, Header } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { CustomerGuard } from '../customer/customer.guard';
import { PaymentsService } from './payments.service';
class CreatePaymentDto { @IsInt() @Min(1) booking_id: number; @IsOptional() @IsBoolean() use_wallet?: boolean; }
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}
  @Post('payments/create-payos-url') @UseGuards(CustomerGuard)
  createPayOSUrl(@Req() req, @Body() body: CreatePaymentDto) { return this.paymentsService.createPayOSUrl(req.customerSession.customer.id, body.booking_id, body.use_wallet === true); }
  @Get('payments/wallet') @UseGuards(CustomerGuard) @Header('Cache-Control', 'no-store')
  wallet(@Req() req) { return this.paymentsService.wallet(req.customerSession.customer.id); }
  @Get('payments/bookings/:id/status') @UseGuards(CustomerGuard)
  status(@Req() req, @Param('id', ParseIntPipe) id: number) { return this.paymentsService.status(req.customerSession.customer.id, id); }
  @Post('webhooks/payos') @HttpCode(200)
  handlePayOSWebhook(@Body() body: any) { return this.paymentsService.handlePayOSWebhook(body); }
}
