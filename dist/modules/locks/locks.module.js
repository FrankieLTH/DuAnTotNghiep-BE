"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocksModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const locks_service_1 = require("./locks.service");
const locks_controller_1 = require("./locks.controller");
const locks_gateway_1 = require("./locks.gateway");
const booking_entity_1 = require("../../entities/booking.entity");
const room_entity_1 = require("../../entities/room.entity");
let LocksModule = class LocksModule {
};
exports.LocksModule = LocksModule;
exports.LocksModule = LocksModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([booking_entity_1.Lock, booking_entity_1.LockPin, booking_entity_1.Booking, room_entity_1.Room])],
        providers: [locks_service_1.LocksService, locks_gateway_1.LocksGateway],
        controllers: [locks_controller_1.LocksController],
        exports: [locks_service_1.LocksService, locks_gateway_1.LocksGateway],
    })
], LocksModule);
//# sourceMappingURL=locks.module.js.map