import { RoomsService } from './rooms.service';
export declare class RoomsController {
    private readonly roomsService;
    constructor(roomsService: RoomsService);
    getApartments(): Promise<import("../../entities/room.entity").Apartment[]>;
    getRooms(apartment_id?: string, min_price?: string, max_price?: string, status?: string, check_in?: string, check_out?: string, guests?: string): Promise<{
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
    getServices(): Promise<import("../../entities/room.entity").Service[]>;
}
