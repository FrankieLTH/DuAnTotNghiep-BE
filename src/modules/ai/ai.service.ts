import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIChatLog, Booking, LockPin } from '../../entities/booking.entity';

@Injectable()
export class AIService {
  constructor(
    @InjectRepository(AIChatLog)
    private aiChatLogRepository: Repository<AIChatLog>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(LockPin)
    private lockPinRepository: Repository<LockPin>,
  ) {}

  async processChat(data: { user_id?: number; session_id?: string; message: string }) {
    const session_id = data.session_id || 'session_' + Math.floor(Math.random() * 10000);
    const messageLower = data.message.toLowerCase();
    let responseText = '';

    // Kiểm tra câu hỏi có liên quan đến mã PIN mở cửa không
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
          } else {
            responseText = `Hệ thống ghi nhận đơn đặt phòng ${booking.booking_code} của bạn nhưng mã PIN chưa được kích hoạt. Vui lòng liên hệ quản lý.`;
          }
        } else {
          responseText = 'Tôi không tìm thấy đơn đặt phòng đang lưu trú của bạn. Vui lòng kiểm tra lại thông tin đăng nhập hoặc mã booking.';
        }
      } else {
        responseText = 'Bạn cần Đăng nhập vào tài khoản đặt phòng để tôi có thể tra cứu mã PIN mở cửa phòng cho bạn một cách an toàn nhất!';
      }
    } else if (messageLower.includes('lịch trình') || messageLower.includes('du lịch') || messageLower.includes('ăn gì') || messageLower.includes('chơi gì')) {
      responseText = `📍 **Gợi ý lịch trình khám phá 2 ngày 1 đêm cho bạn:**
• **Ngày 1:** Check-in Homestay nhận phòng tự động $\rightarrow$ Thưởng thức đặc sản địa phương $\rightarrow$ Check-in các quán café View đẹp $\rightarrow$ Dạo phố đêm.
• **Ngày 2:** Đón bình minh $\rightarrow$ Thăm quan các điểm di tích / danh thắng nổi tiếng $\rightarrow$ Tự động Check-out trước 12:00 PM.

Chúc bạn có chuyến du lịch trải nghiệm thật tuyệt vời tại Homestay!`;
    } else {
      responseText = 'Xin chào! Tôi là Trợ lý AI của Homestay. Tôi có thể hỗ trợ bạn tra cứu mã PIN mở cửa phòng, hướng dẫn tự động check-in và gợi ý lịch trình du lịch. Bạn cần hỗ trợ thông tin gì ạ?';
    }

    // Lưu nhật ký trò chuyện
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
}
