import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getDashboardStats(): Promise<{
        revenue: {
            weekly: number;
            monthly: number;
            quarterly: number;
            yearly: number;
            total: number;
        };
        vacant_rooms_count: number;
        pending_refunds_count: number;
        weekly_bookings_count: number;
        upcoming_checkouts_count: number;
    }>;
    getCustomers(): Promise<import("../../entities/user.entity").User[]>;
    toggleCustomerStatus(id: number, body: {
        status: 'active' | 'blocked';
    }): Promise<{
        message: string;
        id: number;
        status: "active" | "blocked";
    }>;
    getAccessCodes(): Promise<{
        id: number;
        booking_code: string;
        apartment_name: string;
        room_number: string;
        passcode: string;
        lock_status: string;
        valid_from: Date;
        valid_to: Date;
        status: string;
    }[]>;
}
