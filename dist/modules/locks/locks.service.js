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
exports.LocksService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const booking_entity_1 = require("../../entities/booking.entity");
const room_entity_1 = require("../../entities/room.entity");
const locks_gateway_1 = require("./locks.gateway");
let LocksService = class LocksService {
    constructor(lockRepository, lockPinRepository, bookingRepository, roomRepository, locksGateway) {
        this.lockRepository = lockRepository;
        this.lockPinRepository = lockPinRepository;
        this.bookingRepository = bookingRepository;
        this.roomRepository = roomRepository;
        this.locksGateway = locksGateway;
    }
    async handlePaymentSuccessEvent(payload) {
        await this.generatePasscodeForBooking(payload.bookingId);
    }
    async generatePasscodeForBooking(bookingId) {
        const booking = await this.bookingRepository.findOne({
            where: { id: bookingId },
            relations: ['room'],
        });
        if (!booking) {
            throw new common_1.NotFoundException('Không tìm thấy đơn đặt phòng');
        }
        const lock = await this.lockRepository.findOne({
            where: { room_id: booking.room_id },
        });
        if (!lock) {
            throw new common_1.NotFoundException(`Không tìm thấy ổ khóa TTLock gắn cho phòng ID ${booking.room_id}`);
        }
        const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
        const cloudPwId = 'PW_TTL_' + Math.floor(1000 + Math.random() * 9000);
        const lockPin = this.lockPinRepository.create({
            booking_id: booking.id,
            lock_id: lock.id,
            cloud_pw_id: cloudPwId,
            pin: generatedPin,
            lock_pin_start_time: booking.booked_start_time,
            lock_pin_end_time: booking.booked_end_time,
            status: 'active',
        });
        await this.lockPinRepository.save(lockPin);
        return {
            message: 'Tạo mã PIN mở cửa TTLock thành công',
            booking_id: booking.id,
            lock_id: lock.id,
            passcode: generatedPin,
            start_time: booking.booked_start_time,
            end_time: booking.booked_end_time,
        };
    }
    async getPasscodeForCustomer(bookingId) {
        const lockPin = await this.lockPinRepository.findOne({
            where: { booking_id: bookingId, status: 'active' },
            relations: ['booking', 'lock', 'booking.room', 'booking.room.apartment'],
        });
        if (!lockPin) {
            throw new common_1.NotFoundException('Chưa có mã PIN mở cửa hoặc đơn đặt phòng đã hết hạn');
        }
        return {
            booking_code: lockPin.booking?.booking_code,
            room_number: lockPin.booking?.room?.room_number,
            apartment_name: lockPin.booking?.room?.apartment?.name,
            address: lockPin.booking?.room?.apartment?.address,
            passcode: lockPin.pin,
            valid_from: lockPin.lock_pin_start_time,
            valid_to: lockPin.lock_pin_end_time,
            instructions: 'Bấm mã PIN trên bàn phím khóa vật lý, sau đó bấm phím # để mở cửa.',
        };
    }
    async selfCheckIn(data) {
        const booking = await this.bookingRepository.findOne({ where: { id: data.booking_id } });
        if (!booking) {
            throw new common_1.NotFoundException('Không tìm thấy đơn đặt phòng');
        }
        booking.guests_list = JSON.stringify(data.guests_list);
        booking.check_in_actual = new Date();
        booking.booking_status = 'checked_in';
        await this.bookingRepository.save(booking);
        await this.roomRepository.update(booking.room_id, { status: 'occupied' });
        return {
            message: 'Khai báo check-in thành công. Bạn có thể sử dụng mã PIN để mở cửa phòng.',
            booking_id: booking.id,
            check_in_actual: booking.check_in_actual,
        };
    }
    async earlyCheckOut(bookingId) {
        const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
        if (!booking) {
            throw new common_1.NotFoundException('Không tìm thấy đơn đặt phòng');
        }
        booking.check_out_actual = new Date();
        booking.booking_status = 'checked_out';
        await this.bookingRepository.save(booking);
        await this.lockPinRepository.update({ booking_id: bookingId }, { status: 'revoked' });
        await this.roomRepository.update(booking.room_id, { status: 'maintenance' });
        return {
            message: 'Check-out thành công. Mã PIN đã được vô hiệu hóa.',
            booking_id: booking.id,
            room_status: 'maintenance',
        };
    }
    async remoteUnlock(lockId) {
        const lock = await this.lockRepository.findOne({ where: { id: lockId }, relations: ['room'] });
        if (!lock) {
            throw new common_1.NotFoundException('Không tìm thấy ổ khóa Smart Lock');
        }
        return {
            message: `Đã phát lệnh mở cửa từ xa cho ${lock.lock_name || 'Khóa phòng ' + lock.room?.room_number}`,
            lock_id: lock.id,
            cloud_lock_id: lock.cloud_lock_id,
            status: 'unlocked_remotely',
            timestamp: new Date(),
        };
    }
    async handleTTLockWebhook(body) {
        const { eventType, lockId, message } = body;
        if (eventType === 'tamperAlarm') {
            this.locksGateway.sendLockAlert({
                roomId: lockId || 1,
                alertType: 'TAMPER_ALARM',
                message: message || 'CẢNH BÁO: Phát hiện dấu hiệu cạy khóa khẩn cấp!',
            });
        }
        else if (eventType === 'lowBatteryAlarm') {
            this.locksGateway.sendLockAlert({
                roomId: lockId || 1,
                alertType: 'BATTERY_LOW',
                message: message || 'Cảnh báo: Pin khóa cửa giảm dưới 20%, cần thay Pin gấp.',
            });
        }
        return { success: true, message: 'Đã nhận webhook xử lý từ TTLock SaaS' };
    }
};
exports.LocksService = LocksService;
__decorate([
    (0, event_emitter_1.OnEvent)('payment.success'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LocksService.prototype, "handlePaymentSuccessEvent", null);
exports.LocksService = LocksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_entity_1.Lock)),
    __param(1, (0, typeorm_1.InjectRepository)(booking_entity_1.LockPin)),
    __param(2, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __param(3, (0, typeorm_1.InjectRepository)(room_entity_1.Room)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        locks_gateway_1.LocksGateway])
], LocksService);
//# sourceMappingURL=locks.service.js.map