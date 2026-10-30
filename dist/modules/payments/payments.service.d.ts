import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Payment, Booking } from '../../entities/booking.entity';
export declare class PaymentsService {
    private paymentRepository;
    private bookingRepository;
    private eventEmitter;
    constructor(paymentRepository: Repository<Payment>, bookingRepository: Repository<Booking>, eventEmitter: EventEmitter2);
    createPayOSUrl(bookingId: number): Promise<{
        message: string;
        orderCode: number;
        amount: number;
        qr_code: string;
        checkout_url: string;
    }>;
    handlePayOSWebhook(body: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
