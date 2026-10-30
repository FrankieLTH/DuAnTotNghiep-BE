import { BookingsService } from './bookings.service';
import { MailService } from '../mail/mail.service';
export declare class BookingsController {
    private readonly bookingsService;
    private readonly mailService;
    constructor(bookingsService: BookingsService, mailService: MailService);
    getVouchers(): Promise<import("../../entities/booking.entity").Voucher[]>;
    applyVoucher(body: {
        code: string;
        order_value: number;
    }): Promise<{
        voucher_id: number;
        code: string;
        title: string;
        discount_amount: number;
        final_price: number;
    }>;
    createBooking(body: {
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
    getMyBookings(req: any): Promise<any[]>;
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
    cancelBooking(id: number, body: {
        reason?: string;
    }): Promise<{
        message: string;
        booking_id: number;
        refund_percentage: number;
        refund_amount: number;
        refund_reason: string;
    }>;
    sendBookingConfirmation(body: {
        to: string;
        bookingCode: string;
        customerName: string;
        phone: string;
        branchName: string;
        address: string;
        roomTitle: string;
        checkInDate: string;
        checkOutDate: string;
        nights: number;
        guestCount: number;
        totalPrice: number;
        discountAmount: number;
        pinCode?: string;
        selectedRooms?: Array<{
            name: string;
            quantity: number;
            totalPrice: number;
        }>;
        selectedServices?: Array<{
            name: string;
            price: number;
        }>;
    }): Promise<{
        status: number;
        message: string;
    }>;
    sendMail(body: {
        to: string;
        subject: string;
        content: string;
    }): Promise<{
        status: number;
        message: string;
    }>;
}
