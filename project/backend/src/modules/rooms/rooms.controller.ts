import { Controller, Get, Param, Query, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RecommendationService } from './recommendation.service';
import { BasketService } from './basket.service';
import { AvailabilityService } from './availability.service';
import { computeStayWindow } from '@shared/recommendation';
import { DataSource } from 'typeorm';
import { RoomType } from '../../entities/room.entity';
import { RoomInventoryService } from './room-inventory.service';

@Controller()
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly recommendationService: RecommendationService,
    private readonly basketService: BasketService,
    private readonly availabilityService: AvailabilityService,
    private readonly db: DataSource,
    private readonly inventory: RoomInventoryService,
  ) {}

  @Get('room-types/:id/variants')
  async roomTypeVariants(@Param('id',ParseIntPipe) id:number) {
    const type=await this.db.getRepository(RoomType).findOneBy({id,is_active:true});
    if(!type)throw new BadRequestException('Không tìm thấy loại phòng.');
    const parentId=type.parent_id??type.id;
    const types=await this.db.getRepository(RoomType).find({where:{parent_id:parentId,is_active:true},order:{base_price:'ASC',id:'ASC'}});
    const rooms=types.length
      ? await this.db.query('SELECT room_id,room_type_id FROM ROOMS WHERE is_hidden=0 AND deleted_at IS NULL AND room_type_id IN ('+types.map(()=>'?').join(',')+') ORDER BY room_id',types.map(row=>row.id))
      : [];
    const amenRows=await this.db.query('SELECT ra.room_types_id AS typeId,a.id,a.name,a.category FROM room_amenities ra JOIN amenities a ON a.id=ra.amenity_id WHERE ra.room_types_id = ?',[parentId]);
    return types.map(row=>({roomTypeId:row.id,roomId:rooms.find(room=>room.room_type_id===row.id)?.room_id,name:row.name,variantLabel:row.name,basePrice:Number(row.base_price),maxOccupancy:row.max_occupancy,amenities:amenRows.map(r=>({id:Number(r.id),name:r.name,category:r.category}))}));
  }

  @Get('room-types/:id/calendar')
  async roomTypeCalendar(@Param('id',ParseIntPipe) id:number,@Query('month') month:string,@Query('nights') nightsText:string) {
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month||''))throw new BadRequestException('Tháng không hợp lệ.');
    const nights=Number(nightsText||1);
    if(!Number.isInteger(nights)||nights<1||nights>30)throw new BadRequestException('Số đêm phải từ 1 đến 30.');
    const type=await this.db.getRepository(RoomType).findOneBy({id,is_active:true});
    if(!type)throw new BadRequestException('Không tìm thấy biến thể phòng.');
    const [year,monthNumber]=month.split('-').map(Number);
    const days=new Date(Date.UTC(year,monthNumber,0)).getUTCDate();
    const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Bangkok'});
    const calendar=[];
    for(let day=1;day<=days;day++){
      const date=`${month}-${String(day).padStart(2,'0')}`;
      if(date<today){calendar.push({date,availableCount:0,status:'past'});continue;}
      const start=new Date(`${date}T14:00:00+07:00`);
      const end=new Date(start.getTime()+nights*86400000-2*3600000);
      const units=await this.inventory.available([id],start,end);
      calendar.push({date,availableCount:units.length,status:units.length?'available':'sold_out'});
    }
    return {roomTypeId:id,month,nights,days:calendar,suggestedDates:calendar.filter(day=>day.status==='available').slice(0,3).map(day=>day.date)};
  }

  @Get('room-types/:id/options')
  async roomTypeOptions(@Param('id', ParseIntPipe) id: number, @Query('check_in') checkIn: string, @Query('check_out') checkOut: string, @Query('adults') adults: string, @Query('stay_type') stayTypeRaw?: string, @Query('children') childrenRaw?: string, @Query('rooms') roomsRaw?: string) {
    const count = Number(adults);
    const stayType = ['overnight', 'daytime', 'fullday'].includes(stayTypeRaw || '') ? stayTypeRaw : 'fullday';
    const children = Math.max(0, Math.min(30, Number(childrenRaw || 0) || 0));
    const rooms = Math.max(1, Math.min(10, Number(roomsRaw || 1) || 1));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn || '') || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut || '') || checkOut <= checkIn || !Number.isInteger(count) || count < 1 || count > 30) throw new BadRequestException('Ngày lưu trú hoặc số khách không hợp lệ.');
    const stay = computeStayWindow(checkIn, checkOut, stayType);
    const type=await this.db.getRepository(RoomType).findOneBy({id,is_active:true});
    if(!type)throw new BadRequestException('Không tìm thấy loại phòng.');
    const variants = await this.availabilityService.getAvailableRoomTypes({checkIn,checkOut,stayType,adults:count,children,rooms,apartmentId:type.apartment_id});
    const parentId=type.parent_id??type.id;
    // Khi parent_id = null, variant không có parentId => so sánh theo roomTypeId
    return variants.filter(v => {
      const vParent = (v.parentId !== null && v.parentId !== undefined) ? v.parentId : v.roomTypeId;
      return vParent === parentId && v.maxOccupancy >= count;
    }).map(v => ({
      variantKey:v.variantKey, roomTypeId:v.roomTypeId, roomIds:v.roomIds, availableCount:v.availableCount,
      name:v.name,variantLabel:v.variantLabel,maxOccupancy:v.maxOccupancy,
      features:v.features || [], featurePricePerNight:v.featurePricePerNight || 0,
      basePricePerNight:Math.round(v.basePrice * stay.priceFactor), nights:stay.nightsOrDays,
      totalPrice:(Math.round(v.basePrice * stay.priceFactor) + (v.featurePricePerNight || 0)) * stay.nightsOrDays,
    }));
  }

  @Get('apartments')
  async getApartments() {
    return this.roomsService.getApartments();
  }

  @Get('amenities')
  async getAmenities(){return this.roomsService.getAmenities();}

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

    if (!Number.isInteger(numAdults) || numAdults < 1 || numAdults > 30 || !Number.isInteger(numRooms) || numRooms < 1 || numRooms > 10 || !Number.isInteger(numChildren) || numChildren < 0 || numChildren > 30 || !['overnight', 'daytime', 'fullday'].includes(sType) || !/^\d{4}-\d{2}-\d{2}$/.test(inDate) || !/^\d{4}-\d{2}-\d{2}$/.test(outDate)) throw new BadRequestException('Tiêu chí tìm giỏ phòng không hợp lệ.');

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
