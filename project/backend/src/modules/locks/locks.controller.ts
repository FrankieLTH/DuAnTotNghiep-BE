import { Controller, Post, Get, Body, Param, ParseIntPipe, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { LocksService } from './locks.service';
import { CustomerGuard } from '../customer/customer.guard';
import { CustomerManagementService } from '../customer/customer-management.service';

@Controller()
export class LocksController {
  constructor(private readonly locksService: LocksService, private readonly customers: CustomerManagementService) {}

  @UseGuards(CustomerGuard)
  @Post('checkin/self-checkin')
  async selfCheckIn(@Body() body: { booking_id: number; guests_list: any[] }, @Req() req) {
    await this.customers.pins(req.customerSession.customer.id, body.booking_id);
    return this.locksService.selfCheckIn(body);
  }

  @UseGuards(CustomerGuard)
  @Get('locks/my-passcode')
  async getMyPasscode(@Query('booking_id', ParseIntPipe) booking_id: number, @Req() req) {
    return this.customers.pins(req.customerSession.customer.id, booking_id);
  }

  @UseGuards(CustomerGuard)
  @Post('checkout/early-checkout')
  async earlyCheckOut(@Body() body: { booking_id: number }, @Req() req) {
    const booking = await this.customers.ownedBooking(req.customerSession.customer.id, body.booking_id);
    if (booking.booking_status !== 'checked_in') throw new BadRequestException('Chỉ trả phòng cho đơn đang lưu trú.');
    return this.locksService.earlyCheckOut(body.booking_id);
  }

  @Post('admin/locks/remote-unlock')
  async remoteUnlock(@Body() body: { lock_id: number }) {
    return this.locksService.remoteUnlock(body.lock_id);
  }

  @Post('webhooks/ttlock')
  async handleTTLockWebhook(@Body() body: any) {
    return this.locksService.handleTTLockWebhook(body);
  }
}
