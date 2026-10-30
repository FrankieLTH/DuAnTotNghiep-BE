"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const room_entity_1 = require("../../entities/room.entity");
const booking_entity_1 = require("../../entities/booking.entity");
let RoomsService = class RoomsService {
    constructor(apartmentRepository, roomRepository, serviceRepository, bookingRepository) {
        this.apartmentRepository = apartmentRepository;
        this.roomRepository = roomRepository;
        this.serviceRepository = serviceRepository;
        this.bookingRepository = bookingRepository;
    }
    async getApartments() {
        return this.apartmentRepository.find({ where: { status: 'active' } });
    }
    async getRooms(query) {
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
        let bookedRoomIds = [];
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
    async getRoomById(id) {
        const room = await this.roomRepository.findOne({
            where: { id },
            relations: ['apartment', 'room_type', 'images', 'amenities'],
        });
        if (!room) {
            throw new common_1.NotFoundException('Không tìm thấy thông tin phòng');
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
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(room_entity_1.Apartment)),
    __param(1, (0, typeorm_1.InjectRepository)(room_entity_1.Room)),
    __param(2, (0, typeorm_1.InjectRepository)(room_entity_1.Service)),
    __param(3, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map