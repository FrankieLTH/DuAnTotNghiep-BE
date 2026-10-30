"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const booking_entity_1 = require("../../entities/booking.entity");
let PaymentsService = class PaymentsService {
    constructor(paymentRepository, bookingRepository, eventEmitter) {
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
        this.eventEmitter = eventEmitter;
    }
    async createPayOSUrl(bookingId) {
        const booking = await this.bookingRepository.findOne({
            where: { id: bookingId },
            relations: ['room'],
        });
        if (!booking) {
            throw new common_1.NotFoundException('Không tìm thấy thông tin đơn đặt phòng');
        }
        const amount = Number(booking.total_price);
        const orderCode = Number(booking.booking_code.replace(/[^0-9]/g, '').slice(-9));
        const qrCodeUrl = `https://img.vietqr.io/image/MB-036095009876-compact2.png?amount=${amount}&addInfo=PAYOS_${booking.booking_code}`;
        const checkoutUrl = `https://pay.payos.vn/web/${orderCode}`;
        let payment = await this.paymentRepository.findOne({ where: { booking_id: bookingId } });
        if (!payment) {
            payment = this.paymentRepository.create({
                booking_id: bookingId,
                payment_method_id: 1,
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
    async handlePayOSWebhook(body) {
        const { orderCode, booking_id, status } = body;
        const bookingId = booking_id || 1;
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
            this.eventEmitter.emit('payment.success', {
                bookingId: booking.id,
                roomId: booking.room_id,
                startTime: booking.booked_start_time,
                endTime: booking.booked_end_time,
            });
        }
        return { success: true, message: 'Đã nhận webhook thanh toán từ PayOS' };
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_entity_1.Payment)),
    __param(1, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        event_emitter_1.EventEmitter2])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map