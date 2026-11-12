import { Controller, Get, Param, Query, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RecommendationService } from './recommendation.service';
import { BasketService } from './basket.service';

@Controller()
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly recommendationService: RecommendationService,
    private readonly basketService: BasketService,
  ) {}

  @Get('apartments')
  async getApartments() {
    return this.roomsService.getApartments();
  }

  @Get('rooms/baskets')
  async getBaskets(
    @Query('apartment_id') apartment_id?: string,
    @Query('check_in') check_in?: string,
    @Query('check_out') check_out?: string,
    @Query('stay_type') stay_type?: string,
    @Query('adults') adults?: string,
    @Query('children') children?: string,
    @Query('rooms') rooms?: string,
    @Query('voucher_code') voucher_code?: string,
    @Query('sort') sort?: 'default' | 'price_asc' | 'price_desc',
  ) {
    const numAdults = adults ? parseInt(adults, 10) : 1;
    const numRooms = rooms ? parseInt(rooms, 10) : 1;
    const numChildren = children ? parseInt(children, 10) : 0;
    const inDate = check_in || new Date().toISOString().split('T')[0];
    const outDate = check_out || inDate;
    const sType = stay_type || 'overnight';

    if (numAdults < 1) {
      throw new BadRequestException('Số người lớn (≥15 tuổi) phải từ 1 trở lên.');
    }
    if (numRooms < 1) {
      throw new BadRequestException('Số phòng phải từ 1 trở lên.');
    }
    if (numRooms > numAdults) {
      throw new BadRequestException('Số phòng không được vượt quá số người lớn (mỗi phòng cần tối thiểu 1 người lớn).');
    }
    if (sType !== 'daytime' && sType !== 'daily' && outDate < inDate) {
      throw new BadRequestException('Ngày trả phòng phải sau ngày nhận phòng.');
    }

    return this.basketService.getBaskets({
      apartmentId: apartment_id ? parseInt(apartment_id, 10) : undefined,
      checkIn: inDate,
      checkOut: outDate,
      stayType: sType,
      adults: numAdults,
      children: numChildren,
      rooms: numRooms,
      voucherCode: voucher_code,
      sort,
    });
  }

  @Get('rooms/recommendations')
  async getRecommendations(
    @Query('apartment_id') apartment_id?: string,
    @Query('check_in') check_in?: string,
    @Query('check_out') check_out?: string,
    @Query('stay_type') stay_type?: string,
    @Query('adults') adults?: string,
    @Query('children') children?: string,
    @Query('rooms') rooms?: string,
    @Query('voucher_code') voucher_code?: string,
  ) {
    const numAdults = adults ? parseInt(adults, 10) : 1;
    const numRooms = rooms ? parseInt(rooms, 10) : 1;
    const numChildren = children ? parseInt(children, 10) : 0;
    const inDate = check_in || new Date().toISOString().split('T')[0];
    const outDate = check_out || inDate;
    const sType = stay_type || 'overnight';

    if (numAdults < 1) {
      throw new BadRequestException('Số người lớn (≥15 tuổi) phải từ 1 trở lên.');
    }
    if (numRooms < 1) {
      throw new BadRequestException('Số phòng phải từ 1 trở lên.');
    }
    if (numRooms > numAdults) {
      throw new BadRequestException('Số phòng không được vượt quá số người lớn (mỗi phòng cần tối thiểu 1 người lớn).');
    }
    if (sType !== 'daytime' && sType !== 'daily' && outDate < inDate) {
      throw new BadRequestException('Ngày trả phòng phải sau ngày nhận phòng.');
    }

    return this.recommendationService.getRecommendations({
      apartmentId: apartment_id ? parseInt(apartment_id, 10) : undefined,
      checkIn: inDate,
      checkOut: outDate,
      stayType: sType,
      adults: numAdults,
      children: numChildren,
      rooms: numRooms,
      voucherCode: voucher_code,
    });
  }

  @Get('rooms')
  async getRooms(
    @Query('apartment_id') apartment_id?: string,
    @Query('min_price') min_price?: string,
    @Query('max_price') max_price?: string,
    @Query('status') status?: string,
  ) {
    return this.roomsService.getRooms({
      apartment_id: apartment_id ? parseInt(apartment_id, 10) : undefined,
      min_price: min_price ? parseFloat(min_price) : undefined,
      max_price: max_price ? parseFloat(max_price) : undefined,
      status,
    });
  }

  @Get('rooms/:id')
  async getRoomById(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.getRoomById(id);
  }

  @Get('services')
  async getServices() {
    return this.roomsService.getServices();
  }
}
