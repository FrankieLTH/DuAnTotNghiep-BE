import axios from 'axios';
import { clearCustomerToken, getCustomerToken, saveCustomerToken } from './customerSession';
export type CustomerScope = 'account' | 'lookup';
export type OtpPurpose = 'lookup' | 'booking';
export interface CustomerProfile { id: number; full_name: string; email: string; phone?: string; account_created_at?: string; email_verified_at?: string }
export type CustomerRequestType = 'cancel' | 'refund' | 'extend' | 'change_room';
export interface CustomerRequest {
  id: number; booking_id: number; type: CustomerRequestType; status: 'pending' | 'reviewing' | 'resolved' | 'rejected';
  reason: string; requested_end_date?: string; requested_room_type_id?: number; staff_reply?: string; created_at: string;
}
export interface CustomerPin { room_number: string; pin: string; valid_from: string; valid_until: string }
export interface CustomerRoomOption { id: number; name: string; max_occupancy: number; base_price: number }
export interface CustomerBooking {
  id: number; booking_code: string; booking_status: string; apartment_name: string | null; address: string | null;
  booked_start_time: string; booked_end_time: string; created_at: string; adults: number; children: number;
  total_price: number; discount_amount: number; paid_amount: number; remaining_amount: number; payment_status: string;
  hold_expires_at: string | null; rooms: { room_type_name?: string; room_number: string | null }[];
  payments?: { id: number; amount: number; status: string; paid_at: string | null }[];
  transactions?: { id: number; type: string; amount: number; payment_method: string; created_at: string }[];
  refunds?: { id: number; amount: number; status: string; created_at: string }[];
  verification_status?: string;
}
const client = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/customer`, timeout: 15000 });
const lookupClient = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/customer`, timeout: 15000 });
lookupClient.interceptors.request.use(config => {
  const token = getCustomerToken('lookup');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
const forScope = (scope: CustomerScope) => scope === 'lookup' ? lookupClient : client;
client.interceptors.request.use(config => {
  const token = getCustomerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const customerService = {
  requestOtp: (email: string, purpose: OtpPurpose) => lookupClient.post('/auth/otp/request', { email: email.trim(), purpose }).then(r => r.data),
  verifyOtp: async (email: string, purpose: OtpPurpose, code: string) => {
    const { data } = await lookupClient.post('/auth/otp/verify', { email: email.trim(), purpose, code });
    saveCustomerToken(data.access_token, 'lookup');
    return data as { customer: CustomerProfile; scope: CustomerScope };
  },
  register: (data: { full_name: string; email: string; phone: string; password: string }) => client.post('/auth/register', data).then(r => r.data),
  login: async (email: string, password: string) => {
    const { data } = await client.post('/auth/login', { email: email.trim(), password });
    saveCustomerToken(data.access_token, 'account');
    return data as { customer: CustomerProfile; scope: CustomerScope };
  },
  verifyEmail: (email: string, token: string) => client.post('/auth/verify-email', { email, token }).then(r => r.data),
  verifyRegistration: async (email: string, code: string) => {
    const { data } = await client.post('/auth/verify-registration', { email, code });
    saveCustomerToken(data.access_token, 'account');
    return data as { customer: CustomerProfile; scope: CustomerScope };
  },
  resendVerification: (email: string) => client.post('/auth/resend-verification', { email }).then(r => r.data),
  forgotPassword: (email: string) => client.post('/auth/forgot-password', { email: email.trim() }).then(r => r.data),
  resetPassword: (email: string, token: string, password: string) => client.post('/auth/reset-password', { email, token, password }).then(r => r.data),
  resetPasswordCode: (email: string, code: string, password: string) => client.post('/auth/reset-password-code', { email, code, password }).then(r => r.data),
  changePassword: async (current_password: string, password: string) => {
    const token = getCustomerToken();
    const { data } = await client.post('/auth/change-password', { current_password, password });
    sessionStorage.setItem('customer_account_notice', data.message);
    clearCustomerToken(token); return data;
  },
  me: async (scope: CustomerScope = 'account') => {
    const token = getCustomerToken(scope);
    try { return (await forScope(scope).get('/me')).data as { customer: CustomerProfile; scope: CustomerScope }; }
    catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) clearCustomerToken(token, scope);
      throw error;
    }
  },
  logout: async (scope: CustomerScope = 'account') => {
    const token = getCustomerToken(scope);
    try { await forScope(scope).post('/auth/logout'); }
    catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error;
    }
    clearCustomerToken(token, scope);
  },
  updateProfile: (data: { full_name: string; phone: string }) => client.put('/me', data).then(r => r.data as { customer: CustomerProfile }),
  requests: (id: number, scope: CustomerScope = 'account') => forScope(scope).get(`/bookings/${id}/requests`).then(r => r.data as CustomerRequest[]),
  createRequest: (id: number, data: { type: CustomerRequestType; reason: string; requested_end_date?: string; requested_room_type_id?: number }) => client.post(`/bookings/${id}/requests`, data).then(r => r.data),
  roomOptions: (id: number) => client.get(`/bookings/${id}/room-options`).then(r => r.data as CustomerRoomOption[]),
  pins: (id: number) => client.get(`/bookings/${id}/pins`).then(r => r.data as CustomerPin[]),
  list: (status: string, page: number, scope: CustomerScope = 'account') => forScope(scope).get('/bookings', { params: { status: status || undefined, page } }).then(r => r.data as { items: CustomerBooking[]; total: number; page_size: number }),
  detail: (id: number, scope: CustomerScope = 'account') => forScope(scope).get(`/bookings/${id}`).then(r => r.data as CustomerBooking),
  createGuestBooking: (data: { email: string; full_name: string; phone: string; room_type_id: number; num_rooms: number; adults: number; children: number; check_in_date: string; check_out_date: string }) => client.post('/guest-bookings', data).then(r => r.data),
};
export function customerError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (message) return Array.isArray(message) ? message.join('. ') : String(message);
    if (!error.response) return 'Chưa kết nối được máy chủ. Vui lòng thử lại.';
  }
  return 'Không thể hoàn tất thao tác. Vui lòng thử lại.';
}
