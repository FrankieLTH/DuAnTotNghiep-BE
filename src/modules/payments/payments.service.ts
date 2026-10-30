import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Payment, Booking } from '../../entities/booking.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private eventEmitter: EventEmitter2,
  ) {}

  async createPayOSUrl(bookingId: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['room'],
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy thông tin đơn đặt phòng');
    }

    const amount = Number(booking.total_price);
    const orderCode = Number(booking.booking_code.replace(/[^0-9]/g, '').slice(-9));

    // Mock/Simulated PayOS QR payment link (tương thích cả PayOS thật và Sandbox)
    const qrCodeUrl = `https://img.vietqr.io/image/MB-036095009876-compact2.png?amount=${amount}&addInfo=PAYOS_${booking.booking_code}`;
    const checkoutUrl = `https://pay.payos.vn/web/${orderCode}`;

    // Lưu record thanh toán ở trạng thái pending
    let payment = await this.paymentRepository.findOne({ where: { booking_id: bookingId } });
    if (!payment) {
      payment = this.paymentRepository.create({
        booking_id: bookingId,
        payment_method_id: 1, // PayOS
        amount,
        payment_status: 'pending',
        transaction_id: `PAYOS_${orderCode}`,
      });
      await this.paymentRepository.save(payment);
    }

    return {
      message: 'Tạo link thanh toán PayOS thành công',
      orderCode,
      amount,
      qr_code: qrCodeUrl,
      checkout_url: checkoutUrl,
    };
  }

  async handlePayOSWebhook(body: any) {
    const { orderCode, booking_id, status } = body;
    const bookingId = booking_id || 1; // Fallback demo

    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (booking) {
      booking.booking_status = 'confirmed';
      await this.bookingRepository.save(booking);

      let payment = await this.paymentRepository.findOne({ where: { booking_id: bookingId } });
      if (payment) {
        payment.payment_status = 'paid';
        payment.paid_at = new Date();
        await this.paymentRepository.save(payment);
      }

      // Kích hoạt Event bắn sang Queue Service cấp mã PIN TTLock & gửi Email
      this.eventEmitter.emit('payment.success', {
        bookingId: booking.id,
        roomId: booking.room_id,
        startTime: booking.booked_start_time,
        endTime: booking.booked_end_time,
      });
    }

    return { success: true, message: 'Đã nhận webhook thanh toán từ PayOS' };
  }
}
