import { Controller, Post, Get, Put, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MailService } from '../mail/mail.service';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly mailService: MailService,
  ) {}

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

  @Get(':id')
  async getBookingById(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.getBookingById(id);
  }

  @Put(':id/cancel')
  async cancelBooking(@Param('id', ParseIntPipe) id: number, @Body() body: { reason?: string }) {
    return this.bookingsService.cancelBooking(id, body?.reason);
  }

  /**
   * Gửi email xác nhận đặt phòng cho khách hàng
   * Gọi khi khách click "Xác Nhận & Hoàn Tất" ở trang Checkout
   */
  @Post('send-booking-confirmation')
  async sendBookingConfirmation(
    @Body() body: {
      to: string;
      bookingCode: string;
      customerName: string;
      phone: string;
      branchName: string;
      address: string;
      roomTitle: string;
      checkInDate: string;
      checkOutDate: string;
      nights: number;
      guestCount: number;
      totalPrice: number;
      discountAmount: number;
      pinCode?: string;
      selectedRooms?: Array<{ name: string; quantity: number; totalPrice: number }>;
      selectedServices?: Array<{ name: string; price: number }>;
    },
  ) {
    try {
      await this.mailService.sendBookingConfirmation(body);
      return { status: 1, message: 'Gửi email xác nhận đặt phòng thành công' };
    } catch (err) {
      console.error('Lỗi gửi mail xác nhận:', err);
      return { status: 0, message: 'Gửi email thất bại. Vui lòng kiểm tra lại địa chỉ email.' };
    }
  }

  /**
   * Gửi mail tùy chỉnh (general purpose)
   */
  @Post('../send-mail')
  async sendMail(
    @Body() body: { to: string; subject: string; content: string },
  ) {
    try {
      await this.mailService.sendMail(body.to, body.subject, body.content);
      return { status: 1, message: 'Gửi mail thành công' };
    } catch (err) {
      console.error('Lỗi gửi mail:', err);
      return { status: 0, message: 'Gửi mail thất bại' };
    }
  }
}
