import { RoomInventoryService } from '../rooms/room-inventory.service';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Booking, Payment, PaymentMethod, Transaction, Refund, AuditLog, BookingRoom } from '../../entities/booking.entity';
import { RoomType } from '../../entities/room.entity';
import { Customer } from '../../entities/user.entity';
import { BookingStatus, TransactionType } from '@shared/enums';
import { customerNetPaid } from '../customer/customer-finance';
import { CustomerMailService } from '../customer/customer-mail.service';
import { PayosGateway } from './payos.gateway';

@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);
  private syncing = false;
  @Interval(60000)
  async syncPending() {
    if (this.syncing || !this.config.get('PAYOS_CLIENT_ID')) return;
    this.syncing = true;
    try {
      const rows = await this.db.getRepository(Payment).createQueryBuilder('p').where("p.payment_status = 'pending' AND p.provider_data IS NOT NULL").andWhere('p.created_at >= :since', { since: new Date(Date.now() - 7 * 86400000) }).orderBy('p.id', 'DESC').take(10).getMany();
      for (const row of rows) { try { await this.reconcile(row); } catch { this.log.warn(`Payment ${row.id}: waiting for provider reconciliation.`); } }
    } finally { this.syncing = false; }
  }
  constructor(private db: DataSource, private gateway: PayosGateway, private config: ConfigService, private mail: CustomerMailService, private inventory: RoomInventoryService) {}

  private async owned(customerId: number, id: number) {
    const booking = await this.db.getRepository(Booking).findOneBy({ id, customer_id: customerId });
    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt phòng.');
    return booking;
  }
  private view(payment: Payment) {
    return { payment_id: payment.id, booking_id: payment.booking_id, amount: Number(payment.amount), status: payment.payment_status,
      checkout_url: payment.provider_data?.checkout_url, order_code: payment.provider_data?.order_code, review_required: !!payment.provider_data?.review_required, wallet_used: Number(payment.provider_data?.wallet_reserved || 0) };
  }
  async wallet(customerId: number) {
    const customer = await this.db.getRepository(Customer).findOneByOrFail({ id: customerId });
    return { balance: Number(customer.wallet_balance || 0), available: Math.max(0, Number(customer.wallet_balance || 0) - Number(customer.wallet_reserved || 0)) };
  }
  private checkoutUrl(value: string) {
    try { const url = new URL(value); if (url.protocol === 'https:' && (url.hostname === 'pay.payos.vn' || url.hostname.endsWith('.payos.vn'))) return url.href; } catch {}
    throw new BadRequestException('Đường dẫn thanh toán PayOS không hợp lệ.');
  }
  async createPayOSUrl(customerId: number, bookingId: number, useWallet = false) {
    await this.owned(customerId, bookingId);
    // Reconcile an earlier attempt before offering another link; never overwrite a paid receipt.
    const previous = await this.db.getRepository(Payment).findOne({ where: { booking_id: bookingId, payment_status: 'pending' }, order: { id: 'DESC' } });
    if (previous?.provider_data?.link_id) await this.reconcile(previous);
    const payment = await this.db.transaction(async manager => {
      const booking = await manager.getRepository(Booking).findOne({ where: { id: bookingId, customer_id: customerId }, lock: { mode: 'pessimistic_write' } });
      if (booking.booking_status !== BookingStatus.PENDING_PAYMENT || !booking.hold_expires_at || booking.hold_expires_at <= new Date()) {
        throw new ConflictException('Đơn chưa đủ thông tin, đã hết giữ chỗ hoặc đã được xử lý. Vui lòng xem lại đơn.');
      }
      const payments = await manager.getRepository(Payment).findBy({ booking_id: bookingId });
      const transactions = await manager.getRepository(Transaction).findBy({ booking_id: bookingId });
      const refunds = await manager.getRepository(Refund).findBy({ booking_id: bookingId });
      const remaining = Math.round(Number(booking.total_price) - customerNetPaid(payments, transactions, refunds));
      if (!Number.isSafeInteger(remaining) || remaining < 1) throw new ConflictException('Đơn không còn số tiền cần thanh toán.');
      const pending = payments.find(p => p.payment_status === 'pending' && p.provider_data?.order_code);
      if (pending) {
        if (Number(pending.amount) + Number(pending.provider_data.wallet_reserved || 0) - Number(pending.provider_data.received_amount || 0) !== remaining || pending.provider_data.hold_until !== booking.hold_expires_at.toISOString()) throw new ConflictException('Đơn đã thay đổi. Vui lòng liên hệ homestay để kiểm tra giao dịch trước đó.');
        return pending;
      }
      const customer = await manager.getRepository(Customer).findOne({ where: { id: customerId }, lock: { mode: 'pessimistic_write' } });
      const available = Math.max(0, Math.floor(Number(customer.wallet_balance || 0) - Number(customer.wallet_reserved || 0)));
      const walletAmount = useWallet ? Math.min(available, remaining) : 0;
      const amount = remaining - walletAmount;
      if (walletAmount > 0) {
        customer.wallet_reserved = Number(customer.wallet_reserved || 0) + walletAmount;
        await manager.getRepository(Customer).save(customer);
      }
      if (amount === 0) {
        const rooms = await manager.getRepository(BookingRoom).findBy({ bookings_id: bookingId });
        const availableRooms = await this.inventory.available([...new Set(rooms.map(r => r.room_types_id))], booking.booked_start_time, booking.booked_end_time, manager, booking.id);
        if (!rooms.length || [...new Set(rooms.map(r => r.room_types_id))].some(typeId => availableRooms.filter(unit => unit.type.id === typeId).length < rooms.filter(line => line.room_types_id === typeId).length)) throw new ConflictException('Phòng không còn trống. Số dư chưa bị trừ.');
        if (!transactions.length) {
          for (const old of payments.filter(p => p.payment_status === 'paid')) await manager.getRepository(Transaction).save(manager.getRepository(Transaction).create({ booking_id: bookingId, type: TransactionType.PAYMENT, amount: old.amount, payment_method: 'legacy_payment', transaction_code: `PAYMENT_${old.id}`, note: 'Đối soát khoản thu đã lưu' }));
        }
        customer.wallet_reserved = Number(customer.wallet_reserved) - walletAmount;
        customer.wallet_balance = Number(customer.wallet_balance) - walletAmount;
        await manager.getRepository(Customer).save(customer);
        await manager.getRepository(Transaction).save(manager.getRepository(Transaction).create({ booking_id: bookingId, type: TransactionType.PAYMENT, amount: walletAmount, payment_method: 'customer_wallet', transaction_code: `WALLET_PAYMENT_${bookingId}`, note: 'Thanh toán bằng số dư khách hàng' }));
        booking.booking_status = BookingStatus.CONFIRMED;
        booking.hold_expires_at = null;
        await manager.getRepository(Booking).save(booking);
        await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({ actor: `customer:${customerId}`, action: 'WALLET_PAYMENT_CONFIRMED', entity_type: 'BOOKINGS', entity_id: bookingId, new_value: JSON.stringify({ amount: walletAmount }) }));
        return null;
      }
      const methods = manager.getRepository(PaymentMethod);
      let method = await methods.findOne({
        where: [
          { provider_code: 'PAYOS', is_active: true },
          { provider_code: 'payos', is_active: true },
          { provider_code: 'vietqr', is_active: true },
          { is_active: true }
        ]
      });
      if (!method) {
        method = await methods.save(methods.create({ method_name: 'Thanh toán PayOS VietQR', provider_code: 'PAYOS', is_active: true }));
      }
      let row = await manager.getRepository(Payment).save(manager.getRepository(Payment).create({ booking_id: bookingId, payment_method_id: method.id, amount, payment_status: 'pending' }));
      // Namespace is distinct from the 8-digit order codes of the old standalone demo.
      const orderCode = 200000000000000 + row.id;
      row.transaction_id = `PAYOS_${orderCode}`;
      row.provider_data = { order_code: orderCode, hold_until: booking.hold_expires_at.toISOString(), wallet_reserved: walletAmount };
      return manager.getRepository(Payment).save(row);
    });
    if (!payment) return { booking_id: bookingId, amount: 0, status: 'paid', wallet_used: 0 };
    if (payment.provider_data.checkout_url) return this.view(payment);
    const origin = this.getFrontendOrigin();
    const path = `${origin}/tra-cuu/don/${bookingId}`;
    // Repeating the same attempt uses the same order code, including after a network timeout.
    let link: any;
    try { link = await this.gateway.create({ orderCode: payment.provider_data.order_code, amount: Number(payment.amount), description: `DP ${bookingId}`, returnUrl: `${path}?payment_return=1`, cancelUrl: `${path}?payment_return=1&cancel=1`, expiredAt: Math.floor(new Date(payment.provider_data.hold_until).getTime() / 1000) }); }
    catch (err) {
      let state: any;
      try { state = await this.gateway.get(payment.provider_data.order_code); } catch { throw err; }
      await this.applyState(payment.id, state);
      if (state.status === 'PAID') return this.view(await this.db.getRepository(Payment).findOneByOrFail({ id: payment.id }));
      // A create timeout may still have created the provider link. Recover that same link.
      if (!['PENDING', 'PROCESSING'].includes(state.status) || !/^[a-f0-9]{32}$/i.test(state.id)) throw err;
      link = { orderCode: state.orderCode, amount: state.amount, currency: 'VND', paymentLinkId: state.id, checkoutUrl: `https://pay.payos.vn/web/${state.id}` };
    }
    if (Number(link.orderCode) !== payment.provider_data.order_code || Number(link.amount) !== Number(payment.amount) || link.currency !== 'VND' || !link.paymentLinkId) throw new BadRequestException('Thông tin liên kết PayOS không khớp đơn.');
    const url = this.checkoutUrl(link.checkoutUrl);
    await this.db.transaction(async manager => {
      // All payment operations lock booking first, then payment: no webhook/create lock inversion.
      await manager.getRepository(Booking).findOne({ where: { id: bookingId }, lock: { mode: 'pessimistic_write' } });
      const row = await manager.getRepository(Payment).findOne({ where: { id: payment.id }, lock: { mode: 'pessimistic_write' } });
      row.provider_data = { ...row.provider_data, link_id: link.paymentLinkId, checkout_url: url };
      await manager.getRepository(Payment).save(row);
    });
    return this.view(await this.db.getRepository(Payment).findOneByOrFail({ id: payment.id }));
  }
  async status(customerId: number, bookingId: number) {
    const booking = await this.owned(customerId, bookingId);
    const rows = await this.db.getRepository(Payment).find({ where: { booking_id: bookingId }, order: { id: 'DESC' } });
    for (const row of rows.filter(p => p.payment_status === 'pending' && p.provider_data?.order_code)) await this.reconcile(row);
    const fresh = await this.db.getRepository(Payment).find({ where: { booking_id: bookingId }, order: { id: 'DESC' } });
    return { booking_id: booking.id, payments: fresh.filter(p => p.provider_data?.order_code).map(p => this.view(p)) };
  }
  private async reconcile(payment: Payment) { await this.applyState(payment.id, await this.gateway.get(payment.provider_data.order_code)); }

  async handlePayOSWebhook(body: any) {
    const data = this.gateway.verify(body);
    if (!data || data.code !== '00' || data.currency !== 'VND') throw new BadRequestException('Thông báo PayOS chưa xác nhận giao dịch thành công.');
    const row = await this.db.getRepository(Payment).findOneBy({ transaction_id: `PAYOS_${data.orderCode}` });
    // payOS sends a signed sample when registering the webhook. Unknown samples cannot alter any booking.
    if (!row?.provider_data?.order_code) return { success: true, ignored: true };
    if (row.provider_data.link_id && row.provider_data.link_id !== data.paymentLinkId) throw new BadRequestException('Mã liên kết thanh toán không khớp.');
    // Even a valid webhook must be reconciled against the provider's aggregate receipt (supports partial transfers).
    await this.reconcile(row);
    return { success: true };
  }
  private async applyState(paymentId: number, state: any) {
    const original = await this.db.getRepository(Payment).findOneByOrFail({ id: paymentId });
    if (Number(state.orderCode) !== original.provider_data?.order_code || Number(state.amount) !== Number(original.amount) || !state.id || (original.provider_data.link_id && state.id !== original.provider_data.link_id)) throw new BadRequestException('Giao dịch PayOS không khớp với đơn đã lưu.');
    if (state.status === 'PAID' && (!Number.isFinite(Number(state.amountPaid)) || Number(state.amountPaid) < Number(original.amount) || Number(state.amountRemaining) !== 0)) throw new BadRequestException('PayOS chưa xác nhận đủ tiền của đơn.');
    let receipt: { to: string; code: string; amount: number; review: boolean } | null = null;
    await this.db.transaction(async manager => {
      const bookedRooms = await manager.getRepository(BookingRoom).findBy({ bookings_id: original.booking_id });
      for (const id of [...new Set(bookedRooms.map(r => r.room_types_id))].sort((a, b) => a - b)) await manager.getRepository(RoomType).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      const booking = await manager.getRepository(Booking).findOne({ where: { id: original.booking_id }, relations: ['customer'], lock: { mode: 'pessimistic_write' } });
      const row = await manager.getRepository(Payment).findOne({ where: { id: paymentId }, lock: { mode: 'pessimistic_write' } });
      if (['paid', 'refunded', 'partially_refunded'].includes(row.payment_status)) return; // webhook/return/poll replay
      const received = Number(state.amountPaid);
      const captured = Number(row.provider_data.received_amount || 0);
      if (!Number.isSafeInteger(received) || received < 0) throw new BadRequestException('Số tiền PayOS không hợp lệ.');
      const delta = Math.max(0, received - captured);
      const ledger = await manager.getRepository(Transaction).findBy({ booking_id: booking.id });
      if (delta > 0) {
        if (!ledger.length) {
          const legacy = await manager.getRepository(Payment).findBy({ booking_id: booking.id, payment_status: 'paid' });
          for (const other of legacy.filter(p => p.id !== row.id)) await manager.getRepository(Transaction).save(manager.getRepository(Transaction).create({ booking_id: booking.id, type: TransactionType.PAYMENT, amount: other.amount, payment_method: 'legacy_payment', transaction_code: `PAYMENT_${other.id}`, note: 'Đối soát khoản thu đã lưu' }));
        }
        await manager.getRepository(Transaction).save(manager.getRepository(Transaction).create({ booking_id: booking.id, type: TransactionType.PAYMENT, amount: delta, payment_method: 'payos', transaction_code: `${row.transaction_id}:${received}`, note: 'Khoản thu đã đối soát PayOS' }));
      }
      row.provider_data = { ...row.provider_data, received_amount: Math.max(captured, received), provider_status: state.status, link_id: state.id };
      if (state.status !== 'PAID') {
        if (['CANCELLED', 'EXPIRED'].includes(state.status)) {
          row.payment_status = 'failed'; row.provider_data.review_required = received > 0;
          const reserved = Number(row.provider_data.wallet_reserved || 0);
          if (reserved > 0) {
            const customer = await manager.getRepository(Customer).findOne({ where: { id: booking.customer_id }, lock: { mode: 'pessimistic_write' } });
            customer.wallet_reserved = Math.max(0, Number(customer.wallet_reserved) - reserved);
            await manager.getRepository(Customer).save(customer);
            row.provider_data.wallet_reserved = 0;
          }
        }
        await manager.getRepository(Payment).save(row);
        if (delta > 0) await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({ actor: 'payos', action: 'PAYMENT_PARTIAL_RECEIPT', entity_type: 'BOOKINGS', entity_id: booking.id, new_value: JSON.stringify({ payment_id: row.id, received_amount: received, provider_status: state.status }) }));
        return;
      }
      const now = new Date();
      const walletAmount = Number(row.provider_data.wallet_reserved || 0);
      if (walletAmount > 0) {
        const customer = await manager.getRepository(Customer).findOne({ where: { id: booking.customer_id }, lock: { mode: 'pessimistic_write' } });
        if (Number(customer.wallet_reserved) < walletAmount || Number(customer.wallet_balance) < walletAmount) throw new ConflictException('Số dư đã giữ không còn khớp. Cần kiểm tra giao dịch.');
        customer.wallet_reserved = Number(customer.wallet_reserved) - walletAmount;
        customer.wallet_balance = Number(customer.wallet_balance) - walletAmount;
        await manager.getRepository(Customer).save(customer);
        await manager.getRepository(Transaction).save(manager.getRepository(Transaction).create({ booking_id: booking.id, type: TransactionType.PAYMENT, amount: walletAmount, payment_method: 'customer_wallet', transaction_code: `WALLET_PAYMENT_${booking.id}_${row.id}`, note: 'Thanh toán bằng số dư khách hàng' }));
      }
      const existingPayments = await manager.getRepository(Payment).findBy({ booking_id: booking.id });
      const existingLedger = await manager.getRepository(Transaction).findBy({ booking_id: booking.id });
      const existingRefunds = await manager.getRepository(Refund).findBy({ booking_id: booking.id });
      const sufficient = customerNetPaid(existingPayments, existingLedger, existingRefunds) >= Number(booking.total_price);
      const available=await this.inventory.available([...new Set(bookedRooms.map(r=>r.room_types_id))],booking.booked_start_time,booking.booked_end_time,manager,booking.id);
      const requiredTypes=[...new Set(bookedRooms.map(r=>r.room_types_id))];
      const roomStillAvailable=bookedRooms.every(line=>!line.room_id||available.some(u=>u.room.id===line.room_id))&&requiredTypes.every(type=>available.filter(u=>u.type.id===type).length>=bookedRooms.filter(line=>line.room_types_id===type).length);
      const review = !roomStillAvailable || !sufficient || booking.booking_status !== BookingStatus.PENDING_PAYMENT || !booking.hold_expires_at || booking.hold_expires_at <= now || row.provider_data.hold_until !== booking.hold_expires_at.toISOString();
      const oldStatus = booking.booking_status;
      row.payment_status = 'paid'; row.paid_at = now;
      row.provider_data = { ...row.provider_data, link_id: state.id, provider_status: 'PAID', review_required: review, received_amount: Number(state.amountPaid) };
      await manager.getRepository(Payment).save(row);
      if (!review) { booking.booking_status = BookingStatus.CONFIRMED; booking.hold_expires_at = null; await manager.getRepository(Booking).save(booking); }
      await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({ actor: 'payos', action: review ? 'PAYMENT_REVIEW_REQUIRED' : 'PAYMENT_CONFIRMED', entity_type: 'BOOKINGS', entity_id: booking.id, old_value: JSON.stringify({ booking_status: oldStatus }), new_value: JSON.stringify({ payment_id: row.id, amount: Number(row.amount), received_amount: Number(state.amountPaid), review_required: review, booking_status: booking.booking_status }) }));
      if (booking.customer?.email) receipt = { to: booking.customer.email, code: booking.booking_code, amount: Number(state.amountPaid), review };
    });
    // Email is a notification after commit; an SMTP failure can never roll back or duplicate money.
    if (receipt) {
      try { await this.mail.send(receipt.to, `Đã nhận thanh toán · ${receipt.code}`, `Đồi Bông Gòn đã nhận thanh toán ${receipt.amount.toLocaleString('vi-VN')} đ cho đơn ${receipt.code}. ${receipt.review ? 'Đơn cần homestay kiểm tra lại tình trạng giữ phòng. Vui lòng liên hệ hỗ trợ.' : 'Đơn đặt phòng đã được xác nhận.'} Tra cứu thông tin tại ${this.getFrontendOrigin()}/tra-cuu. Mã vào cửa chỉ hiển thị khi đủ điều kiện lưu trú.`); }
      catch { this.log.warn(`Payment ${paymentId}: receipt email was not delivered; payment remains recorded.`); }
    }
  }

  private getFrontendOrigin(): string {
    const raw = this.config.get<string>('FRONTEND_URL', 'http://localhost:5174');
    try {
      const formatted = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
      return new URL(formatted).origin;
    } catch {
      return 'http://localhost:5174';
    }
  }
}
