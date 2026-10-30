import { TTLockCallbackDto } from './dto/ttlock-callback.dto';
export declare class WebhooksController {
    private readonly logger;
    handleTTLockCallback(body: TTLockCallbackDto): string;
}
