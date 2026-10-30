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
var WebhooksController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksController = void 0;
const common_1 = require("@nestjs/common");
const ttlock_callback_dto_1 = require("./dto/ttlock-callback.dto");
let WebhooksController = WebhooksController_1 = class WebhooksController {
    constructor() {
        this.logger = new common_1.Logger(WebhooksController_1.name);
    }
    handleTTLockCallback(body) {
        const { notifyType, lockId, lockMac, records } = body;
        this.logger.log(`[TTLock Webhook] Received callback - notifyType: ${notifyType}, lockId: ${lockId}, lockMac: ${lockMac}`);
        let parsedRecords = null;
        if (records) {
            try {
                parsedRecords = typeof records === 'string' ? JSON.parse(records) : records;
            }
            catch (err) {
                this.logger.warn(`Failed to parse TTLock records JSON string: ${records}`);
            }
        }
        return 'success';
    }
};
exports.WebhooksController = WebhooksController;
__decorate([
    (0, common_1.Post)('ttlock/callback'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Header)('Content-Type', 'text/plain'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ttlock_callback_dto_1.TTLockCallbackDto]),
    __metadata("design:returntype", String)
], WebhooksController.prototype, "handleTTLockCallback", null);
exports.WebhooksController = WebhooksController = WebhooksController_1 = __decorate([
    (0, common_1.Controller)('webhooks')
], WebhooksController);
//# sourceMappingURL=webhooks.controller.js.map