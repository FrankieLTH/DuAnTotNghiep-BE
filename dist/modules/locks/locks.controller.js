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
exports.LocksController = void 0;
const common_1 = require("@nestjs/common");
const locks_service_1 = require("./locks.service");
let LocksController = class LocksController {
    constructor(locksService) {
        this.locksService = locksService;
    }
    async selfCheckIn(body) {
        return this.locksService.selfCheckIn(body);
    }
    async getMyPasscode(booking_id) {
        return this.locksService.getPasscodeForCustomer(booking_id);
    }
    async earlyCheckOut(body) {
        return this.locksService.earlyCheckOut(body.booking_id);
    }
    async remoteUnlock(body) {
        return this.locksService.remoteUnlock(body.lock_id);
    }
    async handleTTLockWebhook(body) {
        return this.locksService.handleTTLockWebhook(body);
    }
};
exports.LocksController = LocksController;
__decorate([
    (0, common_1.Post)('checkin/self-checkin'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LocksController.prototype, "selfCheckIn", null);
__decorate([
    (0, common_1.Get)('locks/my-passcode'),
    __param(0, (0, common_1.Query)('booking_id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], LocksController.prototype, "getMyPasscode", null);
__decorate([
    (0, common_1.Post)('checkout/early-checkout'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LocksController.prototype, "earlyCheckOut", null);
__decorate([
    (0, common_1.Post)('admin/locks/remote-unlock'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LocksController.prototype, "remoteUnlock", null);
__decorate([
    (0, common_1.Post)('webhooks/ttlock'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LocksController.prototype, "handleTTLockWebhook", null);
exports.LocksController = LocksController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [locks_service_1.LocksService])
], LocksController);
//# sourceMappingURL=locks.controller.js.map