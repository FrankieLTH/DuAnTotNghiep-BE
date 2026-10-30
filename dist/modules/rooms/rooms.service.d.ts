import { Repository } from 'typeorm';
import { Apartment, Room, Service } from '../../entities/room.entity';
import { Booking } from '../../entities/booking.entity';
export declare class RoomsService {
    private apartmentRepository;
    private roomRepository;
    private serviceRepository;
    private bookingRepository;
    constructor(apartmentRepository: Repository<Apartment>, roomRepository: Repository<Room>, serviceRepository: Repository<Service>, bookingRepository: Repository<Booking>);
    getApartments(): Promise<Apartment[]>;
    getRooms(query: {
        apartment_id?: number;
        min_price?: number;
        max_price?: number;
        status?: string;
        check_in?: string;
        check_out?: string;
        guests?: number;
    }): Promise<{
        id: number;
        apartment_id: number;
        apartment_name: string;
        address: string;
        room_type_id: number;
        room_type_name: string;
        room_number: string;
        status: string;
        available_count: number;
        base_price: number;
        max_occupancy: number;
        last_maintenance_date: string;
        images: string[];
        amenities: {
            id: number;
            name: string;
            category: string;
        }[];
    }[]>;
    getRoomById(id: number): Promise<{
        id: number;
        apartment_id: number;
        apartment_name: string;
        address: string;
        room_type_id: number;
        room_type_name: string;
        room_number: string;
        status: string;
        base_price: number;
        max_occupancy: number;
        last_maintenance_date: string;
        images: string[];
        amenities: {
            id: number;
            name: string;
            category: string;
        }[];
    }>;
    getServices(): Promise<Service[]>;
}
