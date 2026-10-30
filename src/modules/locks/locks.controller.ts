import { Controller, Post, Get, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { LocksService } from './locks.service';

@Controller()
export class LocksController {
  constructor(private readonly locksService: LocksService) {}

  @Post('checkin/self-checkin')
  async selfCheckIn(@Body() body: { booking_id: number; guests_list: any[] }) {
    return this.locksService.selfCheckIn(body);
  }

  @Get('locks/my-passcode')
  async getMyPasscode(@Query('booking_id', ParseIntPipe) booking_id: number) {
    return this.locksService.getPasscodeForCustomer(booking_id);
  }

  @Post('checkout/early-checkout')
  async earlyCheckOut(@Body() body: { booking_id: number }) {
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
