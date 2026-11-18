import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Apartment, Room, Service } from '../../entities/room.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Apartment)
    private apartmentRepository: Repository<Apartment>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
  ) {}

  async getApartments() {
    return this.apartmentRepository.find({ where: { status: 'active' } });
  }

  async getRooms(query: { apartment_id?: number; min_price?: number; max_price?: number; status?: string }) {
    const qb = this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.apartment', 'apartment')
      .leftJoinAndSelect('room.room_type', 'room_type')
      .leftJoinAndSelect('room_type.parent', 'room_type_parent')
      .leftJoinAndSelect('room.images', 'images')
      .leftJoinAndSelect('room.amenities', 'amenities').andWhere('room.is_hidden=0 AND room.deleted_at IS NULL');

    if (query.apartment_id) {
      qb.andWhere('room.apartment_id = :apartment_id', { apartment_id: query.apartment_id });
    }

    if (query.status) {
      qb.andWhere('room.status = :status', { status: query.status });
    }

    const rooms = await qb.getMany();

    const typeAmenities=await this.amenitiesByType(rooms.map(r=>r.room_type_id));
    const typeImages=await this.imagesByType(rooms.map(r=>r.room_type_id));
    return rooms.map((r) => ({
      ...this.roomPrices(r),
      id: r.id,
      apartment_id: r.apartment_id,
      apartment_name: r.apartment?.name,
      address: r.apartment?.address,
      room_type_id: r.room_type_id,
      room_type_parent_id: r.room_type?.parent?.id || null,
      room_type_parent_name: r.room_type?.parent?.name || r.room_type?.name,
      room_type_name: r.room_type?.name,
      description: r.room_type?.description || '',
      area: r.room_type?.area || 0,
      bed_type: r.room_type?.bed_config || '',
      room_number: r.room_number,
      status: r.status,
      base_price: r.room_type ? Number(r.room_type.base_price) : 0,
      max_occupancy: r.room_type ? r.room_type.max_occupancy : 2,
      last_maintenance_date: r.last_maintenance_date,
      images: [...new Set([...(r.images ? r.images.map((img) => img.image_url) : []), ...(typeImages.get(r.room_type_id)||[])])],
      amenities: this.mergedAmenities(r,typeAmenities.get(r.room_type_id)||[]),
    }));
  }

  async getRoomById(id: number) {
    const room = await this.roomRepository.findOne({
      where: { id },
      relations: ['apartment', 'room_type', 'room_type.parent', 'images', 'amenities'],
    });

    if (!room || room.is_hidden || room.deleted_at) {
      throw new NotFoundException('Không tìm thấy thông tin phòng');
    }

    const typeAmenities=await this.amenitiesByType([room.room_type_id]);
    const typeImages=await this.imagesByType([room.room_type_id]);
    return {
      ...this.roomPrices(room),
      id: room.id,
      apartment_id: room.apartment_id,
      apartment_name: room.apartment?.name,
      address: room.apartment?.address,
      room_type_id: room.room_type_id,
      room_type_parent_id: room.room_type?.parent?.id || null,
      room_type_parent_name: room.room_type?.parent?.name || room.room_type?.name,
      room_type_name: room.room_type?.name,
      description: room.room_type?.description || '',
      area: room.room_type?.area || 0,
      bed_type: room.room_type?.bed_config || '',
      room_number: room.room_number,
      status: room.status,
      base_price: room.room_type ? Number(room.room_type.base_price) : 0,
      max_occupancy: room.room_type ? room.room_type.max_occupancy : 2,
      last_maintenance_date: room.last_maintenance_date,
      images: [...new Set([...(room.images ? room.images.map((img) => img.image_url) : []), ...(typeImages.get(room.room_type_id)||[])])],
      amenities: this.mergedAmenities(room,typeAmenities.get(room.room_type_id)||[]),
    };
  }

  async getServices() {
    return this.serviceRepository.find({ where: { is_active: true } });
  }
  async getAmenities(){return this.roomRepository.manager.query('SELECT id,name,category FROM amenities ORDER BY category,name');}
  private async parentOf(typeIds:number[]){
    const ids=[...new Set(typeIds)];
    const map=new Map<number,number>();
    if(!ids.length)return map;
    const rows=await this.roomRepository.manager.query(`SELECT id,parent_id FROM room_types WHERE id IN (${ids.map(()=>'?').join(',')})`,ids);
    for(const r of rows){map.set(Number(r.id), r.parent_id?Number(r.parent_id):Number(r.id));}
    return map;
  }
  private async amenitiesByType(typeIds:number[]){
    const result=new Map<number,{id:number;name:string;category:string}[]>();
    const ids=[...new Set(typeIds)];
    if(!ids.length)return result;
    const parentOf=await this.parentOf(ids);
    const parentIds=[...new Set([...parentOf.values()])];
    const rows=await this.roomRepository.manager.query(`SELECT ra.room_types_id AS typeId,a.id,a.name,a.category FROM room_amenities ra JOIN amenities a ON a.id=ra.amenity_id WHERE ra.room_types_id IN (${parentIds.map(()=>'?').join(',')})`,parentIds);
    const byParent=new Map<number,{id:number;name:string;category:string}[]>();
    for(const row of rows){const list=byParent.get(Number(row.typeId))||[];list.push({id:Number(row.id),name:row.name,category:row.category});byParent.set(Number(row.typeId),list);}
    for(const id of ids){result.set(id, byParent.get(parentOf.get(id)!)||[]);}
    return result;
  }
  private async imagesByType(typeIds:number[]){
    const result=new Map<number,string[]>();
    const ids=[...new Set(typeIds)];
    if(!ids.length)return result;
    const parentOf=await this.parentOf(ids);
    const parentIds=[...new Set([...parentOf.values()])];
    const rows=await this.roomRepository.manager.query(`SELECT room_types_id AS typeId,image_url FROM ROOM_IMAGES WHERE room_id IS NULL AND room_types_id IN (${parentIds.map(()=>'?').join(',')}) ORDER BY id`,parentIds);
    const byParent=new Map<number,string[]>();
    for(const row of rows){const list=byParent.get(Number(row.typeId))||[];list.push(row.image_url);byParent.set(Number(row.typeId),list);}
    for(const id of ids){result.set(id, byParent.get(parentOf.get(id)!)||[]);}
    return result;
  }
  private mergedAmenities(room:Room,typeAmenities:{id:number;name:string;category:string}[]){
    return [...new Map([...typeAmenities,...(room.amenities||[]).map(a=>({id:a.id,name:a.name,category:a.category}))].map(a=>[a.id,a])).values()];
  }
  private roomPrices(room:Room){const price=Number(room.room_type?.base_price||0);return {features:[],feature_surcharge_per_night:0,base_type_price:price,effective_price_per_night:price};}
}
