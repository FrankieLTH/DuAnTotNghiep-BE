import { Repository } from 'typeorm';
import { Lock, LockPin, Booking } from '../../entities/booking.entity';
import { Room } from '../../entities/room.entity';
import { LocksGateway } from './locks.gateway';
export declare class LocksService {
    private lockRepository;
    private lockPinRepository;
    private bookingRepository;
    private roomRepository;
    private locksGateway;
    constructor(lockRepository: Repository<Lock>, lockPinRepository: Repository<LockPin>, bookingRepository: Repository<Booking>, roomRepository: Repository<Room>, locksGateway: LocksGateway);
    handlePaymentSuccessEvent(payload: {
        bookingId: number;
        roomId: number;
        startTime: Date;
        endTime: Date;
    }): Promise<void>;
    generatePasscodeForBooking(bookingId: number): Promise<{
        message: string;
        booking_id: number;
        lock_id: number;
        passcode: string;
        start_time: Date;
        end_time: Date;
    }>;
    getPasscodeForCustomer(bookingId: number): Promise<{
        booking_code: string;
        room_number: string;
        apartment_name: string;
        address: string;
        passcode: string;
        valid_from: Date;
        valid_to: Date;
        instructions: string;
    }>;
    selfCheckIn(data: {
        booking_id: number;
        guests_list: any[];
    }): Promise<{
        message: string;
        booking_id: number;
        check_in_actual: Date;
    }>;
    earlyCheckOut(bookingId: number): Promise<{
        message: string;
        booking_id: number;
        room_status: string;
    }>;
    remoteUnlock(lockId: number): Promise<{
        message: string;
        lock_id: number;
        cloud_lock_id: string;
        status: string;
        timestamp: Date;
    }>;
    handleTTLockWebhook(body: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
