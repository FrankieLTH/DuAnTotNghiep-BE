import { Controller, Post, Get, Put, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('../vouchers')
  async getVouchers() {
    return this.bookingsService.getVouchers();
  }

  @Post('../vouchers/apply')
  async applyVoucher(@Body() body: { code: string; order_value: number }) {
    return this.bookingsService.applyVoucher(body.code, body.order_value);
  }

  @Post()
  async createBooking(
    @Body() body: {
      user_id?: number;
      room_id: number;
      voucher_code?: string;
      booking_type?: string;
      booked_start_time: string;
      booked_end_time: string;
      guests_list?: any[];
    },
  ) {
    return this.bookingsService.createBooking(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-bookings')
  async getMyBookings(@Request() req) {
    return this.bookingsService.getUserBookings(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getBookingById(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.bookingsService.getBookingById(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/cancel')
  async cancelBooking(@Param('id', ParseIntPipe) id: number, @Body() body: { reason?: string }, @Request() req) {
    return this.bookingsService.cancelBooking(id, body?.reason, req.user.userId);
  }
}
