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
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const dayjs = require("dayjs");
const booking_entity_1 = require("../../entities/booking.entity");
const room_entity_1 = require("../../entities/room.entity");
let BookingsService = class BookingsService {
    constructor(bookingRepository, voucherRepository, refundRepository, lockPinRepository, roomRepository) {
        this.bookingRepository = bookingRepository;
        this.voucherRepository = voucherRepository;
        this.refundRepository = refundRepository;
        this.lockPinRepository = lockPinRepository;
        this.roomRepository = roomRepository;
    }
    async applyVoucher(code, orderValue) {
        const voucher = await this.voucherRepository.findOne({ where: { code, is_active: true } });
        if (!voucher) {
            throw new common_1.NotFoundException('Mã giảm giá không tồn tại hoặc đã hết hạn');
        }
        if (voucher.min_order_value && orderValue < Number(voucher.min_order_value)) {
            throw new common_1.BadRequestException(`Đơn hàng phải từ ${Number(voucher.min_order_value).toLocaleString()}đ trở lên mới được dùng mã này`);
        }
        let discount = 0;
        if (voucher.discount_type === 'percentage') {
            discount = (orderValue * Number(voucher.discount_value)) / 100;
            if (voucher.max_discount_amount && discount > Number(voucher.max_discount_amount)) {
                discount = Number(voucher.max_discount_amount);
            }
        }
        else {
            discount = Number(voucher.discount_value);
        }
        return {
            voucher_id: voucher.id,
            code: voucher.code,
            title: voucher.title,
            discount_amount: discount,
            final_price: Math.max(0, orderValue - discount),
        };
    }
    async createBooking(data) {
        const room = await this.roomRepository.findOne({ where: { id: data.room_id }, relations: ['room_type'] });
        if (!room) {
            throw new common_1.NotFoundException('Không tìm thấy thông tin phòng');
        }
        const start = dayjs(data.booked_start_time);
        const end = dayjs(data.booked_end_time);
        const durationDays = Math.max(1, end.diff(start, 'day'));
        const basePrice = room.room_type ? Number(room.room_type.base_price) : 500000;
        const rawTotal = basePrice * durationDays;
        let discountAmount = 0;
        let voucherId = undefined;
        if (data.voucher_code) {
            try {
                const vResult = await this.applyVoucher(data.voucher_code, rawTotal);
                discountAmount = vResult.discount_amount;
                voucherId = vResult.voucher_id;
            }
            catch (err) {
            }
        }
        const totalPrice = Math.max(0, rawTotal - discountAmount);
        const bookingCode = 'BK' + dayjs().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 100);
        const booking = this.bookingRepository.create({
            booking_code: bookingCode,
            user_id: data.user_id,
            room_id: data.room_id,
            voucher_id: voucherId,
            guests_list: data.guests_list ? JSON.stringify(data.guests_list) : null,
            booking_type: data.booking_type || 'short_stay',
            booked_start_time: start.toDate(),
            booked_end_time: end.toDate(),
            booking_status: 'pending',
            total_price: totalPrice,
            discount_amount: discountAmount,
        });
        await this.bookingRepository.save(booking);
        return {
            message: 'Tạo đơn đặt phòng thành công',
            booking_id: booking.id,
            booking_code: booking.booking_code,
            total_price: booking.total_price,
            discount_amount: booking.discount_amount,
            booking_status: booking.booking_status,
        };
    }
    async getUserBookings(userId) {
        const bookings = await this.bookingRepository.find({
            where: { user_id: userId },
            relations: ['room', 'room.apartment'],
            order: { created_at: 'DESC' },
        });
        const result = [];
        for (const b of bookings) {
            const lockPin = await this.lockPinRepository.findOne({
                where: { booking_id: b.id, status: 'active' },
            });
            result.push({
                id: b.id,
                booking_code: b.booking_code,
                room_number: b.room?.room_number,
                apartment_name: b.room?.apartment?.name,
                booked_start_time: b.booked_start_time,
                booked_end_time: b.booked_end_time,
                booking_status: b.booking_status,
                total_price: Number(b.total_price),
                discount_amount: Number(b.discount_amount),
                passcode: lockPin ? lockPin.pin : null,
                created_at: b.created_at,
            });
        }
        return result;
    }
    async getBookingById(id) {
        const b = await this.bookingRepository.findOne({
            where: { id },
            relations: ['room', 'room.apartment', 'voucher'],
        });
        if (!b) {
            throw new common_1.NotFoundException('Không tìm thấy thông tin đơn đặt phòng');
        }
        const lockPin = await this.lockPinRepository.findOne({
            where: { booking_id: b.id, status: 'active' },
        });
        return {
            id: b.id,
            booking_code: b.booking_code,
            room_id: b.room_id,
            room_number: b.room?.room_number,
            apartment_name: b.room?.apartment?.name,
            address: b.room?.apartment?.address,
            guests_list: b.guests_list ? JSON.parse(b.guests_list) : [],
            booked_start_time: b.booked_start_time,
            booked_end_time: b.booked_end_time,
            booking_status: b.booking_status,
            total_price: Number(b.total_price),
            discount_amount: Number(b.discount_amount),
            passcode: lockPin ? lockPin.pin : null,
            created_at: b.created_at,
        };
    }
    async cancelBooking(id, reason) {
        const booking = await this.bookingRepository.findOne({ where: { id } });
        if (!booking) {
            throw new common_1.NotFoundException('Không tìm thấy đơn đặt phòng');
        }
        if (booking.booking_status === 'cancelled') {
            throw new common_1.BadRequestException('Đơn đặt phòng này đã được hủy trước đó');
        }
        const now = dayjs();
        const start = dayjs(booking.booked_start_time);
        const diffDays = start.diff(now, 'day');
        let refundPercentage = 0;
        if (diffDays >= 2) {
            refundPercentage = 50;
        }
        const refundAmount = (Number(booking.total_price) * refundPercentage) / 100;
        const refund = this.refundRepository.create({
            payment_id: 1,
            booking_id: booking.id,
            refund_amount: refundAmount,
            refund_percentage: refundPercentage,
            status: 'requested',
            reason: reason || (diffDays >= 2 ? 'Hủy trước >= 2 ngày (Hoàn 50%)' : 'Hủy dưới < 2 ngày (Hoàn 0%)'),
        });
        await this.refundRepository.save(refund);
        booking.booking_status = 'cancelled';
        await this.bookingRepository.save(booking);
        return {
            message: 'Hủy đơn đặt phòng thành công',
            booking_id: booking.id,
            refund_percentage: refundPercentage,
            refund_amount: refundAmount,
            refund_reason: refund.reason,
        };
    }
    async getVouchers() {
        return this.voucherRepository.find({ where: { is_active: true } });
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __param(1, (0, typeorm_1.InjectRepository)(booking_entity_1.Voucher)),
    __param(2, (0, typeorm_1.InjectRepository)(booking_entity_1.Refund)),
    __param(3, (0, typeorm_1.InjectRepository)(booking_entity_1.LockPin)),
    __param(4, (0, typeorm_1.InjectRepository)(room_entity_1.Room)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map