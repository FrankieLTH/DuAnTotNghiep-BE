import axios from 'axios';
import { getCustomerToken } from './customerSession';
import type { CustomerScope } from './customerService';
export interface PaymentState { payment_id: number; booking_id: number; amount: number; status: string; checkout_url?: string; review_required?: boolean; wallet_used?: number; }
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 40000 });
const auth = (scope: CustomerScope) => ({ headers: { Authorization: `Bearer ${getCustomerToken(scope) || ''}` } });
export const paymentService = {
  create: (id: number, scope: CustomerScope, useWallet = false) => api.post('/payments/create-payos-url', { booking_id: id, use_wallet: useWallet }, auth(scope)).then(r => r.data as PaymentState),
  wallet: (scope: CustomerScope) => api.get('/payments/wallet', auth(scope)).then(r => r.data as { balance: number; available: number }),
  status: (id: number, scope: CustomerScope) => api.get(`/payments/bookings/${id}/status`, auth(scope)).then(r => r.data as { payments: PaymentState[] }),
};
