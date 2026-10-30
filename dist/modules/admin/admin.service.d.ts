import { Repository } from 'typeorm';
import { Booking, Payment, Refund, Lock, LockPin } from '../../entities/booking.entity';
import { Room, Apartment } from '../../entities/room.entity';
import { User } from '../../entities/user.entity';
export declare class AdminService {
    private bookingRepository;
    private paymentRepository;
    private refundRepository;
    private roomRepository;
    private apartmentRepository;
    private userRepository;
    private lockRepository;
    private lockPinRepository;
    constructor(bookingRepository: Repository<Booking>, paymentRepository: Repository<Payment>, refundRepository: Repository<Refund>, roomRepository: Repository<Room>, apartmentRepository: Repository<Apartment>, userRepository: Repository<User>, lockRepository: Repository<Lock>, lockPinRepository: Repository<LockPin>);
    getDashboardStats(): Promise<{
        revenue: {
            weekly: number;
            monthly: number;
            quarterly: number;
            yearly: number;
            total: number;
        };
        vacant_rooms_count: number;
        pending_refunds_count: number;
        weekly_bookings_count: number;
        upcoming_checkouts_count: number;
    }>;
    getCustomers(): Promise<User[]>;
    toggleCustomerStatus(id: number, status: 'active' | 'blocked'): Promise<{
        message: string;
        id: number;
        status: "active" | "blocked";
    }>;
    getAccessCodes(): Promise<{
        id: number;
        booking_code: string;
        apartment_name: string;
        room_number: string;
        passcode: string;
        lock_status: string;
        valid_from: Date;
        valid_to: Date;
        status: string;
    }[]>;
}
