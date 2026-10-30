import { Repository } from 'typeorm';
import { AIChatLog, Booking, LockPin } from '../../entities/booking.entity';
export declare class AIService {
    private aiChatLogRepository;
    private bookingRepository;
    private lockPinRepository;
    constructor(aiChatLogRepository: Repository<AIChatLog>, bookingRepository: Repository<Booking>, lockPinRepository: Repository<LockPin>);
    processChat(data: {
        user_id?: number;
        session_id?: string;
        message: string;
    }): Promise<{
        session_id: string;
        response: string;
        timestamp: Date;
    }>;
}
