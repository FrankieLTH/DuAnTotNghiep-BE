export interface IUser {
    id: number;
    role_id: number;
    role_name?: string;
    full_name: string;
    email: string;
    phone?: string;
    status: 'active' | 'blocked';
    created_at?: string;
}
export interface IApartment {
    id: number;
    name: string;
    address: string;
    status: 'active' | 'inactive' | 'under_construction';
}
export interface IRoomType {
    id: number;
    name: string;
    base_price: number;
    max_occupancy: number;
}
export interface IAmenity {
    id: number;
    name: string;
    category?: string;
}
export interface IRoomImage {
    id: number;
    room_id: number;
    image_url: string;
}
export interface IRoom {
    id: number;
    apartment_id: number;
    apartment_name?: string;
    room_type_id: number;
    room_type_name?: string;
    room_number: string;
    status: 'available' | 'occupied' | 'maintenance' | 'inactive';
    base_price: number;
    max_occupancy: number;
    last_maintenance_date?: string;
    images?: string[];
    amenities?: string[];
}
export interface IService {
    id: number;
    name: string;
    description?: string;
    price: number;
    is_compensation: boolean;
    is_active: boolean;
}
export interface IVoucher {
    id: number;
    code: string;
    title?: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    max_discount_amount?: number;
    min_order_value?: number;
    usage_limit?: number;
    used_count: number;
    start_date?: string;
    end_date?: string;
    is_active: boolean;
}
export interface IBookingGuest {
    name: string;
    phone?: string;
    cccd?: string;
}
export interface IBooking {
    id: number;
    booking_code: string;
    user_id?: number;
    user_name?: string;
    user_email?: string;
    room_id: number;
    room_number?: string;
    voucher_id?: number;
    guests_list?: IBookingGuest[];
    booking_type: 'short_stay' | 'long_stay' | 'monthly';
    booked_start_time: string;
    booked_end_time: string;
    check_in_actual?: string;
    check_out_actual?: string;
    booking_status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
    total_price: number;
    discount_amount: number;
    created_at?: string;
}
export interface ILockPin {
    id: number;
    booking_id: number;
    lock_id: number;
    cloud_pw_id?: string;
    pin: string;
    lock_pin_start_time?: string;
    lock_pin_end_time?: string;
    status: string;
}
export interface ILock {
    id: number;
    room_id: number;
    room_number?: string;
    cloud_lock_id: string;
    lock_name?: string;
    lock_type: 'ttlock' | 'manual' | 'other';
    lock_status: 'online' | 'offline' | 'unknown';
    master_pin?: string;
    electric_quantity?: number;
}
export interface IPayment {
    id: number;
    booking_id: number;
    payment_method_id: number;
    payment_method_name?: string;
    transaction_id?: string;
    amount: number;
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
    paid_at?: string;
}
export interface IDashboardStats {
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
}
