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
exports.BookingsController = void 0;
const common_1 = require("@nestjs/common");
const bookings_service_1 = require("./bookings.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const mail_service_1 = require("../mail/mail.service");
let BookingsController = class BookingsController {
    constructor(bookingsService, mailService) {
        this.bookingsService = bookingsService;
        this.mailService = mailService;
    }
    async getVouchers() {
        return this.bookingsService.getVouchers();
    }
    async applyVoucher(body) {
        return this.bookingsService.applyVoucher(body.code, body.order_value);
    }
    async createBooking(body) {
        return this.bookingsService.createBooking(body);
    }
    async getMyBookings(req) {
        return this.bookingsService.getUserBookings(req.user.userId);
    }
    async getBookingById(id) {
        return this.bookingsService.getBookingById(id);
    }
    async cancelBooking(id, body) {
        return this.bookingsService.cancelBooking(id, body?.reason);
    }
    async sendBookingConfirmation(body) {
        try {
            await this.mailService.sendBookingConfirmation(body);
            return { status: 1, message: 'Gửi email xác nhận đặt phòng thành công' };
        }
        catch (err) {
            console.error('Lỗi gửi mail xác nhận:', err);
            return { status: 0, message: 'Gửi email thất bại. Vui lòng kiểm tra lại địa chỉ email.' };
        }
    }
    async sendMail(body) {
        try {
            await this.mailService.sendMail(body.to, body.subject, body.content);
            return { status: 1, message: 'Gửi mail thành công' };
        }
        catch (err) {
            console.error('Lỗi gửi mail:', err);
            return { status: 0, message: 'Gửi mail thất bại' };
        }
    }
};
exports.BookingsController = BookingsController;
__decorate([
    (0, common_1.Get)('../vouchers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getVouchers", null);
__decorate([
    (0, common_1.Post)('../vouchers/apply'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "applyVoucher", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "createBooking", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('my-bookings'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getMyBookings", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getBookingById", null);
__decorate([
    (0, common_1.Put)(':id/cancel'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "cancelBooking", null);
__decorate([
    (0, common_1.Post)('send-booking-confirmation'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "sendBookingConfirmation", null);
__decorate([
    (0, common_1.Post)('../send-mail'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "sendMail", null);
exports.BookingsController = BookingsController = __decorate([
    (0, common_1.Controller)('bookings'),
    __metadata("design:paramtypes", [bookings_service_1.BookingsService,
        mail_service_1.MailService])
], BookingsController);
//# sourceMappingURL=bookings.controller.js.map