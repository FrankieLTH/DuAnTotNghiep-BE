import { Repository } from 'typeorm';
import { Booking, Voucher, Refund, LockPin } from '../../entities/booking.entity';
import { Room } from '../../entities/room.entity';
export declare class BookingsService {
    private bookingRepository;
    private voucherRepository;
    private refundRepository;
    private lockPinRepository;
    private roomRepository;
    constructor(bookingRepository: Repository<Booking>, voucherRepository: Repository<Voucher>, refundRepository: Repository<Refund>, lockPinRepository: Repository<LockPin>, roomRepository: Repository<Room>);
    applyVoucher(code: string, orderValue: number): Promise<{
        voucher_id: number;
        code: string;
        title: string;
        discount_amount: number;
        final_price: number;
    }>;
    createBooking(data: {
        user_id?: number;
        room_id: number;
        voucher_code?: string;
        booking_type?: string;
        booked_start_time: string;
        booked_end_time: string;
        guests_list?: any[];
    }): Promise<{
        message: string;
        booking_id: number;
        booking_code: string;
        total_price: number;
        discount_amount: number;
        booking_status: string;
    }>;
    getUserBookings(userId: number): Promise<any[]>;
    getBookingById(id: number): Promise<{
        id: number;
        booking_code: string;
        room_id: number;
        room_number: string;
        apartment_name: string;
        address: string;
        guests_list: any;
        booked_start_time: Date;
        booked_end_time: Date;
        booking_status: string;
        total_price: number;
        discount_amount: number;
        passcode: string;
        created_at: Date;
    }>;
    cancelBooking(id: number, reason?: string): Promise<{
        message: string;
        booking_id: number;
        refund_percentage: number;
        refund_amount: number;
        refund_reason: string;
    }>;
    getVouchers(): Promise<Voucher[]>;
}
