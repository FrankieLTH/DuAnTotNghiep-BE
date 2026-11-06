import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { RoomsService } from './rooms.service';

@Controller()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('apartments')
  async getApartments() {
    return this.roomsService.getApartments();
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
