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
exports.AIService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const booking_entity_1 = require("../../entities/booking.entity");
let AIService = class AIService {
    constructor(aiChatLogRepository, bookingRepository, lockPinRepository) {
        this.aiChatLogRepository = aiChatLogRepository;
        this.bookingRepository = bookingRepository;
        this.lockPinRepository = lockPinRepository;
    }
    async processChat(data) {
        const session_id = data.session_id || 'session_' + Math.floor(Math.random() * 10000);
        const messageLower = data.message.toLowerCase();
        let responseText = '';
        if (messageLower.includes('mật khẩu') || messageLower.includes('mã pin') || messageLower.includes('mở cửa') || messageLower.includes('passcode')) {
            if (data.user_id) {
                const booking = await this.bookingRepository.findOne({
                    where: { user_id: data.user_id, booking_status: 'checked_in' },
                    relations: ['room', 'room.apartment'],
                    order: { created_at: 'DESC' },
                });
                if (booking) {
                    const pinRecord = await this.lockPinRepository.findOne({
                        where: { booking_id: booking.id, status: 'active' },
                    });
                    if (pinRecord) {
                        responseText = `Chào bạn, mã PIN mở cửa của phòng ${booking.room?.room_number} (${booking.room?.apartment?.name}) là **${pinRecord.pin}**. Vui lòng bấm số PIN trên bàn phím khóa và kết thúc bằng phím #.`;
                    }
                    else {
                        responseText = `Hệ thống ghi nhận đơn đặt phòng ${booking.booking_code} của bạn nhưng mã PIN chưa được kích hoạt. Vui lòng liên hệ quản lý.`;
                    }
                }
                else {
                    responseText = 'Tôi không tìm thấy đơn đặt phòng đang lưu trú của bạn. Vui lòng kiểm tra lại thông tin đăng nhập hoặc mã booking.';
                }
            }
            else {
                responseText = 'Bạn cần Đăng nhập vào tài khoản đặt phòng để tôi có thể tra cứu mã PIN mở cửa phòng cho bạn một cách an toàn nhất!';
            }
        }
        else if (messageLower.includes('lịch trình') || messageLower.includes('du lịch') || messageLower.includes('ăn gì') || messageLower.includes('chơi gì')) {
            responseText = `📍 **Gợi ý lịch trình khám phá 2 ngày 1 đêm cho bạn:**
• **Ngày 1:** Check-in Homestay nhận phòng tự động $\rightarrow$ Thưởng thức đặc sản địa phương $\rightarrow$ Check-in các quán café View đẹp $\rightarrow$ Dạo phố đêm.
• **Ngày 2:** Đón bình minh $\rightarrow$ Thăm quan các điểm di tích / danh thắng nổi tiếng $\rightarrow$ Tự động Check-out trước 12:00 PM.

Chúc bạn có chuyến du lịch trải nghiệm thật tuyệt vời tại Homestay!`;
        }
        else {
            responseText = 'Xin chào! Tôi là Trợ lý AI của Homestay. Tôi có thể hỗ trợ bạn tra cứu mã PIN mở cửa phòng, hướng dẫn tự động check-in và gợi ý lịch trình du lịch. Bạn cần hỗ trợ thông tin gì ạ?';
        }
        const chatLog = this.aiChatLogRepository.create({
            user_id: data.user_id || null,
            session_id,
            message: data.message,
            response: responseText,
        });
        await this.aiChatLogRepository.save(chatLog);
        return {
            session_id,
            response: responseText,
            timestamp: new Date(),
        };
    }
};
exports.AIService = AIService;
exports.AIService = AIService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_entity_1.AIChatLog)),
    __param(1, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __param(2, (0, typeorm_1.InjectRepository)(booking_entity_1.LockPin)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AIService);
//# sourceMappingURL=ai.service.js.map