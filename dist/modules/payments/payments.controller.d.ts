import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    createPayOSUrl(body: {
        booking_id: number;
    }): Promise<{
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
