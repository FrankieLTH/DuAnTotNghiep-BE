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
      .leftJoinAndSelect('room.images', 'images')
      .leftJoinAndSelect('room.amenities', 'amenities');

    if (query.apartment_id) {
      qb.andWhere('room.apartment_id = :apartment_id', { apartment_id: query.apartment_id });
    }

    if (query.status) {
      qb.andWhere('room.status = :status', { status: query.status });
    }

    const rooms = await qb.getMany();

    return rooms.map((r) => ({
      id: r.id,
      apartment_id: r.apartment_id,
      apartment_name: r.apartment?.name,
      address: r.apartment?.address,
      room_type_id: r.room_type_id,
      room_type_name: r.room_type?.name,
      room_number: r.room_number,
      status: r.status,
      base_price: r.room_type ? Number(r.room_type.base_price) : 0,
      max_occupancy: r.room_type ? r.room_type.max_occupancy : 2,
      last_maintenance_date: r.last_maintenance_date,
      images: r.images ? r.images.map((img) => img.image_url) : [],
      amenities: r.amenities ? r.amenities.map((a) => ({ id: a.id, name: a.name, category: a.category })) : [],
    }));
  }

  async getRoomById(id: number) {
    const room = await this.roomRepository.findOne({
      where: { id },
      relations: ['apartment', 'room_type', 'images', 'amenities'],
    });

    if (!room) {
      throw new NotFoundException('Không tìm thấy thông tin phòng');
    }

    return {
      id: room.id,
      apartment_id: room.apartment_id,
      apartment_name: room.apartment?.name,
      address: room.apartment?.address,
      room_type_id: room.room_type_id,
      room_type_name: room.room_type?.name,
      room_number: room.room_number,
      status: room.status,
      base_price: room.room_type ? Number(room.room_type.base_price) : 0,
      max_occupancy: room.room_type ? room.room_type.max_occupancy : 2,
      last_maintenance_date: room.last_maintenance_date,
      images: room.images ? room.images.map((img) => img.image_url) : [],
      amenities: room.amenities ? room.amenities.map((a) => ({ id: a.id, name: a.name, category: a.category })) : [],
    };
  }

  async getServices() {
    return this.serviceRepository.find({ where: { is_active: true } });
  }
}
