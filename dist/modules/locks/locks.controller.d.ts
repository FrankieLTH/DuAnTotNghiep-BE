import { LocksService } from './locks.service';
export declare class LocksController {
    private readonly locksService;
    constructor(locksService: LocksService);
    selfCheckIn(body: {
        booking_id: number;
        guests_list: any[];
    }): Promise<{
        message: string;
        booking_id: number;
        check_in_actual: Date;
    }>;
    getMyPasscode(booking_id: number): Promise<{
        booking_code: string;
        room_number: string;
        apartment_name: string;
        address: string;
        passcode: string;
        valid_from: Date;
        valid_to: Date;
        instructions: string;
    }>;
    earlyCheckOut(body: {
        booking_id: number;
    }): Promise<{
        message: string;
        booking_id: number;
        room_status: string;
    }>;
    remoteUnlock(body: {
        lock_id: number;
    }): Promise<{
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
