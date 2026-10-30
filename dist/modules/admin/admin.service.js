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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const dayjs = require("dayjs");
const booking_entity_1 = require("../../entities/booking.entity");
const room_entity_1 = require("../../entities/room.entity");
const user_entity_1 = require("../../entities/user.entity");
let AdminService = class AdminService {
    constructor(bookingRepository, paymentRepository, refundRepository, roomRepository, apartmentRepository, userRepository, lockRepository, lockPinRepository) {
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.refundRepository = refundRepository;
        this.roomRepository = roomRepository;
        this.apartmentRepository = apartmentRepository;
        this.userRepository = userRepository;
        this.lockRepository = lockRepository;
        this.lockPinRepository = lockPinRepository;
    }
    async getDashboardStats() {
        const payments = await this.paymentRepository.find({ where: { payment_status: 'paid' } });
        const totalRevenue = payments.reduce((acc, p) => acc + Number(p.amount), 0);
        const vacantRoomsCount = await this.roomRepository.count({ where: { status: 'available' } });
        const pendingRefundsCount = await this.refundRepository.count({ where: { status: 'requested' } });
        const weeklyBookingsCount = await this.bookingRepository.count();
        const todayStr = dayjs().format('YYYY-MM-DD');
        const upcomingCheckoutsCount = await this.bookingRepository
            .createQueryBuilder('booking')
            .where('DATE(booking.booked_end_time) = :todayStr', { todayStr })
            .andWhere('booking.booking_status = :status', { status: 'checked_in' })
            .getCount();
        return {
            revenue: {
                weekly: totalRevenue * 0.25,
                monthly: totalRevenue * 0.6,
                quarterly: totalRevenue * 0.85,
                yearly: totalRevenue,
                total: totalRevenue,
            },
            vacant_rooms_count: vacantRoomsCount,
            pending_refunds_count: pendingRefundsCount,
            weekly_bookings_count: weeklyBookingsCount,
            upcoming_checkouts_count: upcomingCheckoutsCount,
        };
    }
    async getCustomers() {
        return this.userRepository.find({
            where: { role_id: 3 },
            order: { created_at: 'DESC' },
        });
    }
    async toggleCustomerStatus(id, status) {
        await this.userRepository.update(id, { status });
        return { message: `Đã đổi trạng thái tài khoản thành ${status}`, id, status };
    }
    async getAccessCodes() {
        const lockPins = await this.lockPinRepository.find({
            relations: ['booking', 'lock', 'booking.room', 'booking.room.apartment'],
            order: { created_at: 'DESC' },
        });
        return lockPins.map((lp) => ({
            id: lp.id,
            booking_code: lp.booking?.booking_code,
            apartment_name: lp.booking?.room?.apartment?.name,
            room_number: lp.booking?.room?.room_number,
            passcode: lp.pin,
            lock_status: lp.lock?.lock_status || 'online',
            valid_from: lp.lock_pin_start_time,
            valid_to: lp.lock_pin_end_time,
            status: lp.status,
        }));
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __param(1, (0, typeorm_1.InjectRepository)(booking_entity_1.Payment)),
    __param(2, (0, typeorm_1.InjectRepository)(booking_entity_1.Refund)),
    __param(3, (0, typeorm_1.InjectRepository)(room_entity_1.Room)),
    __param(4, (0, typeorm_1.InjectRepository)(room_entity_1.Apartment)),
    __param(5, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(6, (0, typeorm_1.InjectRepository)(booking_entity_1.Lock)),
    __param(7, (0, typeorm_1.InjectRepository)(booking_entity_1.LockPin)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AdminService);
//# sourceMappingURL=admin.service.js.map