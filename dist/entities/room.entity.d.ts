export declare class Apartment {
    id: number;
    name: string;
    address: string;
    status: string;
    created_at: Date;
}
export declare class RoomType {
    id: number;
    name: string;
    base_price: number;
    max_occupancy: number;
    created_at: Date;
}
export declare class Room {
    id: number;
    apartment_id: number;
    apartment: Apartment;
    room_type_id: number;
    room_type: RoomType;
    room_number: string;
    status: string;
    last_maintenance_date: string;
    created_at: Date;
    updated_at: Date;
    images: RoomImage[];
    amenities: Amenity[];
}
export declare class Amenity {
    id: number;
    name: string;
    category: string;
}
export declare class RoomImage {
    id: number;
    room_id: number;
    room: Room;
    image_url: string;
    created_at: Date;
}
export declare class Service {
    id: number;
    name: string;
    description: string;
    price: number;
    is_compensation: boolean;
    is_active: boolean;
}
