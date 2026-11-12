// ========================================================
// SHARED PRICING LOGIC - SINGLE SOURCE OF TRUTH
// ========================================================

export {
  STAY_TYPE_FACTORS,
  calculateNights,
  calculateRoomPrice,
  calculateVoucherDiscount,
} from './baskets';
export type { VoucherRule } from './baskets';
