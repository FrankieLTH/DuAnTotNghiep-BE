import { Controller, Get, Post, Body, Query, Param, ParseIntPipe } from '@nestjs/common';
import { BookingWorkflowService } from './booking-workflow.service';
import { SearchRoomsQueryDto, CreateDraftBookingDto } from '../../common/config/booking.config';

@Controller('api/v1/booking-flow')
export class BookingWorkflowController {
  constructor(private readonly workflowService: BookingWorkflowService) {}

  /**
   * 1. API Tìm kiếm phòng theo loại đặt, ngày, sức chứa (chỉ nhận ngày, không nhận giờ)
   */
  @Get('search')
  async searchRooms(@Query() query: SearchRoomsQueryDto) {
    return this.workflowService.searchAvailableRoomTypes(query);
  }

  /**
   * 2. API Khởi tạo đơn draft (giữ phòng 15 phút) & sinh sẵn slot từ số lượng khách
   */
  @Post('draft')
  async createDraft(@Body() body: CreateDraftBookingDto) {
    return this.workflowService.createDraftWithSlots(body);
  }

  /**
   * 3. API Điền thông tin slot trẻ em (Server tự tính tuổi theo ngày check-in)
   */
  @Post('bookings/:bookingId/guests/:guestId/child')
  async submitChildSlot(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Param('guestId', ParseIntPipe) guestId: number,
    @Body() body: { name: string; date_of_birth: string },
  ) {
    return this.workflowService.submitChildSlot(bookingId, guestId, body);
  }

  /**
   * 4. API Đối chiếu toàn bộ đoàn và hoàn tất bước điền thông tin
   */
  @Post('bookings/:bookingId/finalize-guests')
  async finalizeGuests(@Param('bookingId', ParseIntPipe) bookingId: number) {
    return this.workflowService.finalizeGuestsVerification(bookingId);
  }
}
