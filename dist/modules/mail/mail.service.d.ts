import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private configService;
    private transporter;
    constructor(configService: ConfigService);
    sendBookingConfirmation(data: {
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
    }): Promise<void>;
    sendMail(to: string, subject: string, htmlContent: string): Promise<void>;
}
