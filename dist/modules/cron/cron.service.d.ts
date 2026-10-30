import { Repository } from 'typeorm';
import { Booking, LockPin } from '../../entities/booking.entity';
import { Room } from '../../entities/room.entity';
export declare class CronService {
    private bookingRepository;
    private lockPinRepository;
    private roomRepository;
    private readonly logger;
    constructor(bookingRepository: Repository<Booking>, lockPinRepository: Repository<LockPin>, roomRepository: Repository<Room>);
    handleAutoCheckOutCron(): Promise<void>;
}
