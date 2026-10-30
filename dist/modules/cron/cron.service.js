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
var CronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const booking_entity_1 = require("../../entities/booking.entity");
const room_entity_1 = require("../../entities/room.entity");
let CronService = CronService_1 = class CronService {
    constructor(bookingRepository, lockPinRepository, roomRepository) {
        this.bookingRepository = bookingRepository;
        this.lockPinRepository = lockPinRepository;
        this.roomRepository = roomRepository;
        this.logger = new common_1.Logger(CronService_1.name);
    }
    async handleAutoCheckOutCron() {
        this.logger.log('Running Auto Check-out & Lock PIN Revocation Cron Job...');
        const now = new Date();
        const expiredBookings = await this.bookingRepository.find({
            where: [
                { booked_end_time: (0, typeorm_2.LessThan)(now), booking_status: 'checked_in' },
                { booked_end_time: (0, typeorm_2.LessThan)(now), booking_status: 'confirmed' },
            ],
        });
        for (const b of expiredBookings) {
            b.booking_status = 'checked_out';
            b.check_out_actual = now;
            await this.bookingRepository.save(b);
            await this.lockPinRepository.update({ booking_id: b.id, status: 'active' }, { status: 'expired' });
            await this.roomRepository.update(b.room_id, { status: 'maintenance' });
            this.logger.log(`Auto Check-out booking ${b.booking_code} for room ${b.room_id}. PIN revoked, room set to maintenance.`);
        }
    }
};
exports.CronService = CronService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronService.prototype, "handleAutoCheckOutCron", null);
exports.CronService = CronService = CronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __param(1, (0, typeorm_1.InjectRepository)(booking_entity_1.LockPin)),
    __param(2, (0, typeorm_1.InjectRepository)(room_entity_1.Room)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CronService);
//# sourceMappingURL=cron.service.js.map