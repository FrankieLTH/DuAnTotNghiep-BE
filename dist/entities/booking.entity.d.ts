import { User } from './user.entity';
import { Room } from './room.entity';
export declare class Lock {
    id: number;
    room_id: number;
    room: Room;
    cloud_lock_id: string;
    lock_name: string;
    lock_type: string;
    lock_status: string;
    master_pin: string;
    last_sync_at: Date;
    created_at: Date;
}
export declare class Voucher {
    id: number;
    code: string;
    title: string;
    discount_type: string;
    discount_value: number;
    max_discount_amount: number;
    min_order_value: number;
    usage_limit: number;
    used_count: number;
    start_date: Date;
    end_date: Date;
    is_active: boolean;
}
export declare class Booking {
    id: number;
    booking_code: string;
    user_id: number;
    user: User;
    room_id: number;
    room: Room;
    voucher_id: number;
    voucher: Voucher;
    guests_list: string;
    booking_type: string;
    booked_start_time: Date;
    booked_end_time: Date;
    check_in_actual: Date;
    check_out_actual: Date;
    booking_status: string;
    total_price: number;
    discount_amount: number;
    is_archived: boolean;
    created_at: Date;
    updated_at: Date;
}
export declare class LockPin {
    id: number;
    booking_id: number;
    booking: Booking;
    lock_id: number;
    lock: Lock;
    cloud_pw_id: string;
    pin: string;
    lock_pin_start_time: Date;
    lock_pin_end_time: Date;
    status: string;
    created_at: Date;
}
export declare class PaymentMethod {
    id: number;
    method_name: string;
    provider_code: string;
    is_active: boolean;
}
export declare class Payment {
    id: number;
    booking_id: number;
    booking: Booking;
    payment_method_id: number;
    payment_method: PaymentMethod;
    transaction_id: string;
    amount: number;
    payment_status: string;
    paid_at: Date;
    created_at: Date;
}
export declare class Refund {
    id: number;
    payment_id: number;
    booking_id: number;
    refund_amount: number;
    refund_percentage: number;
    status: string;
    reason: string;
    created_at: Date;
}
export declare class AIChatLog {
    id: number;
    user_id: number;
    session_id: string;
    message: string;
    response: string;
    created_at: Date;
}
