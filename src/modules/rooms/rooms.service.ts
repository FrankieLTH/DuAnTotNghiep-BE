import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Apartment, Room, Service } from '../../entities/room.entity';
import { Booking } from '../../entities/booking.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Apartment)
    private apartmentRepository: Repository<Apartment>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async getApartments() {
    return this.apartmentRepository.find({ where: { status: 'active' } });
  }

  async getRooms(query: {
    apartment_id?: number;
    min_price?: number;
    max_price?: number;
    status?: string;
    check_in?: string;
    check_out?: string;
    guests?: number;
  }) {
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

    // Kiểm tra danh sách phòng bị trùng lịch đặt trong khoảng check_in -> check_out
    let bookedRoomIds: number[] = [];
    if (query.check_in && query.check_out) {
      const activeBookings = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.booking_status IN (:...statuses)', { statuses: ['confirmed', 'checked_in', 'pending'] })
        .andWhere('booking.booked_start_time < :check_out AND booking.booked_end_time > :check_in', {
          check_in: new Date(query.check_in),
          check_out: new Date(query.check_out),
        })
        .getMany();
      bookedRoomIds = activeBookings.map((b) => b.room_id);
    }

    return rooms.map((r) => {
      const isBooked = bookedRoomIds.includes(r.id);
      return {
        id: r.id,
        apartment_id: r.apartment_id,
        apartment_name: r.apartment?.name,
        address: r.apartment?.address,
        room_type_id: r.room_type_id,
        room_type_name: r.room_type?.name,
        room_number: r.room_number,
        status: isBooked ? 'occupied' : r.status,
        available_count: isBooked ? 0 : 1,
        base_price: r.room_type ? Number(r.room_type.base_price) : 0,
        max_occupancy: r.room_type ? r.room_type.max_occupancy : 2,
        last_maintenance_date: r.last_maintenance_date,
        images: r.images ? r.images.map((img) => img.image_url) : [],
        amenities: r.amenities ? r.amenities.map((a) => ({ id: a.id, name: a.name, category: a.category })) : [],
      };
    });
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
