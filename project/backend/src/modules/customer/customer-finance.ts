import { Payment, Refund, Transaction } from '../../entities/booking.entity';

// The ledger and payment rows can describe the same receipt. Refund records and
// refund ledger rows can also describe the same payout; never count either twice.
export function customerNetPaid(payments: Payment[], transactions: Transaction[], refunds: Refund[] = []) {
  const cents = (amount: number) => Math.round(Number(amount) * 100);
  const received = transactions.length
    ? transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + cents(t.amount), 0)
    : payments.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + cents(p.amount), 0);
  const ledgerRefunds = transactions.filter(t => t.type === 'refund').reduce((sum, t) => sum + cents(t.amount), 0);
  const processedRefunds = refunds.filter(r => r.status === 'processed').reduce((sum, r) => sum + cents(r.refund_amount), 0);
  return Math.max(0, received - Math.max(ledgerRefunds, processedRefunds)) / 100;
}
