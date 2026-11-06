import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards, ForbiddenException, Header } from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerBookingsService } from './customer-bookings.service';
import { CustomerGuard } from './customer.guard';
import { CustomerBookingQuery, GuestBookingDto, RequestOtpDto, VerifyOtpDto, UpdateCustomerProfileDto, CustomerBookingRequestDto, RegisterCustomerDto, CustomerLoginDto, CustomerEmailDto, CustomerEmailTokenDto, ResetCustomerPasswordDto, ChangeCustomerPasswordDto, CustomerRegistrationCodeDto, ResetCustomerPasswordCodeDto } from './customer.dto';
import { CustomerAccountService } from './customer-account.service';
import { CustomerManagementService } from './customer-management.service';

@Controller('customer')
export class CustomerController {
  constructor(private auth: CustomerAuthService, private bookings: CustomerBookingsService, private management: CustomerManagementService, private accounts: CustomerAccountService) {}
  private account(req) {
    if (req.customerSession.scope !== 'account') throw new ForbiddenException('Vui lòng đăng nhập tài khoản để dùng chức năng này.');
    return req.customerSession.customer.id;
  }
  @Post('auth/otp/request')
  requestOtp(@Body() dto: RequestOtpDto, @Req() req) { return this.auth.requestOtp(dto.email, dto.purpose, req.ip); }
  @Post('auth/otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) { return this.auth.verifyOtp(dto.email, dto.purpose, dto.code); }
  @Post('auth/register')
  register(@Body() dto: RegisterCustomerDto, @Req() req) { return this.accounts.register(dto, req.ip); }
  @Post('auth/login')
  login(@Body() dto: CustomerLoginDto, @Req() req) { return this.accounts.login(dto.email, dto.password, req.ip); }
  @Post('auth/verify-email')
  verifyEmail(@Body() dto: CustomerEmailTokenDto) { return this.accounts.verifyEmail(dto.email, dto.token); }
  @Post('auth/verify-registration')
  verifyRegistration(@Body() dto: CustomerRegistrationCodeDto) { return this.accounts.verifyRegistration(dto.email, dto.code); }
  @Post('auth/resend-verification')
  resendVerification(@Body() dto: CustomerEmailDto, @Req() req) { return this.accounts.resendVerification(dto.email, req.ip); }
  @Post('auth/forgot-password')
  forgotPassword(@Body() dto: CustomerEmailDto, @Req() req) { return this.accounts.forgotPassword(dto.email, req.ip); }
  @Post('auth/reset-password')
  resetPassword(@Body() dto: ResetCustomerPasswordDto) { return this.accounts.resetPassword(dto.email, dto.token, dto.password); }
  @Post('auth/reset-password-code')
  resetPasswordCode(@Body() dto: ResetCustomerPasswordCodeDto) { return this.accounts.resetPasswordCode(dto.email, dto.code, dto.password); }
  @UseGuards(CustomerGuard) @Post('auth/change-password')
  changePassword(@Req() req, @Body() dto: ChangeCustomerPasswordDto) { return this.accounts.changePassword(this.account(req), dto.current_password, dto.password); }
  @UseGuards(CustomerGuard) @Get('me')
  me(@Req() req) { return { customer: this.auth.profile(req.customerSession.customer), scope: req.customerSession.scope }; }
  @UseGuards(CustomerGuard) @Put('me')
  updateMe(@Req() req, @Body() body: UpdateCustomerProfileDto) { return this.management.updateProfile(this.account(req), body); }
  @UseGuards(CustomerGuard) @Post('auth/logout')
  logout(@Req() req) { return this.auth.logout(req.customerSession.jti); }
  @UseGuards(CustomerGuard) @Get('bookings')
  list(@Req() req, @Query() query: CustomerBookingQuery) { return this.bookings.list(req.customerSession.customer.id, query); }
  @UseGuards(CustomerGuard) @Get('bookings/:id')
  detail(@Req() req, @Param('id', ParseIntPipe) id: number) { return this.bookings.detail(req.customerSession.customer.id, id); }
  @UseGuards(CustomerGuard) @Get('bookings/:id/requests')
  requests(@Req() req, @Param('id', ParseIntPipe) id: number) { return this.management.requests(req.customerSession.customer.id, id); }
  @UseGuards(CustomerGuard) @Post('bookings/:id/requests')
  createRequest(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() body: CustomerBookingRequestDto) { return this.management.createRequest(this.account(req), id, body); }
  @UseGuards(CustomerGuard) @Get('bookings/:id/room-options')
  roomOptions(@Req() req, @Param('id', ParseIntPipe) id: number) { return this.management.roomOptions(this.account(req), id); }
  @UseGuards(CustomerGuard) @Get('bookings/:id/pins') @Header('Cache-Control', 'no-store')
  pins(@Req() req, @Param('id', ParseIntPipe) id: number) { return this.management.pins(this.account(req), id); }
  @Post('guest-bookings')
  create(@Body() dto: GuestBookingDto) { return this.bookings.createGuestBooking(dto); }
}
