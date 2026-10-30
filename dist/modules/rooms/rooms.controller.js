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
exports.RoomsController = void 0;
const common_1 = require("@nestjs/common");
const rooms_service_1 = require("./rooms.service");
let RoomsController = class RoomsController {
    constructor(roomsService) {
        this.roomsService = roomsService;
    }
    async getApartments() {
        return this.roomsService.getApartments();
    }
    async getRooms(apartment_id, min_price, max_price, status, check_in, check_out, guests) {
        return this.roomsService.getRooms({
            apartment_id: apartment_id ? parseInt(apartment_id, 10) : undefined,
            min_price: min_price ? parseFloat(min_price) : undefined,
            max_price: max_price ? parseFloat(max_price) : undefined,
            status,
            check_in,
            check_out,
            guests: guests ? parseInt(guests, 10) : undefined,
        });
    }
    async getRoomById(id) {
        return this.roomsService.getRoomById(id);
    }
    async getServices() {
        return this.roomsService.getServices();
    }
};
exports.RoomsController = RoomsController;
__decorate([
    (0, common_1.Get)('apartments'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "getApartments", null);
__decorate([
    (0, common_1.Get)('rooms'),
    __param(0, (0, common_1.Query)('apartment_id')),
    __param(1, (0, common_1.Query)('min_price')),
    __param(2, (0, common_1.Query)('max_price')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('check_in')),
    __param(5, (0, common_1.Query)('check_out')),
    __param(6, (0, common_1.Query)('guests')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "getRooms", null);
__decorate([
    (0, common_1.Get)('rooms/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "getRoomById", null);
__decorate([
    (0, common_1.Get)('services'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "getServices", null);
exports.RoomsController = RoomsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [rooms_service_1.RoomsService])
], RoomsController);
//# sourceMappingURL=rooms.controller.js.map