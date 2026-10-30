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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
let MailService = class MailService {
    constructor(configService) {
        this.configService = configService;
        const port = Number(this.configService.get('SMTP_PORT', 465)) || 465;
        const secure = port === 465;
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
            port,
            secure,
            auth: {
                user: this.configService.get('SMTP_USER'),
                pass: this.configService.get('SMTP_PASS'),
            },
        });
    }
    async sendBookingConfirmation(data) {
        const smtpFrom = this.configService.get('SMTP_FROM', '"Homestay Đồi Bông Gòn" <no-reply@homestay.com>');
        const roomListHtml = data.selectedRooms
            ? data.selectedRooms
                .map((r) => `<tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #F2ECE1; font-size: 13px; color: #3E2C23;">${r.name}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #F2ECE1; font-size: 13px; color: #3E2C23; text-align: center;">${r.quantity}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #F2ECE1; font-size: 13px; color: #C85A32; font-weight: bold; text-align: right;">${r.totalPrice.toLocaleString('vi-VN')}đ</td>
              </tr>`)
                .join('')
            : '';
        const servicesHtml = data.selectedServices?.length
            ? data.selectedServices
                .map((s) => `<tr>
                <td style="padding: 6px 12px; border-bottom: 1px solid #F2ECE1; font-size: 13px; color: #3E2C23;">${s.name}</td>
                <td colspan="2" style="padding: 6px 12px; border-bottom: 1px solid #F2ECE1; font-size: 13px; color: #C85A32; text-align: right;">+${s.price.toLocaleString('vi-VN')}đ</td>
              </tr>`)
                .join('')
            : '';
        const pinSection = data.pinCode
            ? `<div style="background: #3E2C23; color: #fff; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
           <p style="font-size: 11px; color: #E0B97A; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">MÃ PIN SMART LOCK MỞ CỬA</p>
           <p style="font-size: 32px; font-family: monospace; font-weight: bold; color: #E0B97A; letter-spacing: 8px; margin: 0;">${data.pinCode}</p>
           <p style="font-size: 11px; color: rgba(255,255,255,0.7); margin: 8px 0 0;">Có hiệu lực từ 14:00 ngày ${data.checkInDate}</p>
         </div>`
            : '';
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E8DFD1;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3E2C23, #5A3E2E); padding: 30px 24px; text-align: center;">
      <h1 style="color: #E0B97A; font-size: 20px; margin: 0 0 4px;">🏡 Đồi Bông Gòn Homestay</h1>
      <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0;">Xác nhận đặt phòng thành công</p>
    </div>

    <div style="padding: 24px;">
      <!-- Greeting -->
      <p style="font-size: 14px; color: #3E2C23; margin: 0 0 16px;">
        Xin chào <strong>${data.customerName}</strong>,
      </p>
      <p style="font-size: 13px; color: #7A6B63; margin: 0 0 20px; line-height: 1.6;">
        Đơn đặt phòng của bạn đã được xác nhận thành công. Dưới đây là thông tin chi tiết chuyến lưu trú:
      </p>

      <!-- Booking Code -->
      <div style="background: #FAF7F2; border: 1px solid #E8DFD1; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 20px;">
        <p style="font-size: 11px; color: #8C7A70; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Mã đơn hàng</p>
        <p style="font-size: 22px; font-family: monospace; font-weight: bold; color: #C85A32; margin: 0;">${data.bookingCode}</p>
      </div>

      ${pinSection}

      <!-- Booking Details -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #F2ECE1; font-size: 12px; color: #8C7A70; width: 40%;">Chi nhánh:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #F2ECE1; font-size: 13px; color: #3E2C23; font-weight: bold;">${data.branchName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #F2ECE1; font-size: 12px; color: #8C7A70;">Địa chỉ:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #F2ECE1; font-size: 13px; color: #3E2C23;">${data.address}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #F2ECE1; font-size: 12px; color: #8C7A70;">Phòng:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #F2ECE1; font-size: 13px; color: #3E2C23; font-weight: bold;">${data.roomTitle}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #F2ECE1; font-size: 12px; color: #8C7A70;">Nhận phòng:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #F2ECE1; font-size: 13px; color: #3E2C23;"><strong>14:00</strong>, ${data.checkInDate}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #F2ECE1; font-size: 12px; color: #8C7A70;">Trả phòng:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #F2ECE1; font-size: 13px; color: #3E2C23;"><strong>12:00</strong>, ${data.checkOutDate}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #F2ECE1; font-size: 12px; color: #8C7A70;">Thời gian lưu trú:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #F2ECE1; font-size: 13px; color: #3E2C23;">${data.nights} đêm • ${data.guestCount} khách</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #F2ECE1; font-size: 12px; color: #8C7A70;">Người đặt:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #F2ECE1; font-size: 13px; color: #3E2C23;">${data.customerName} • ${data.phone}</td>
        </tr>
      </table>

      ${roomListHtml
            ? `<!-- Room List -->
      <p style="font-size: 12px; font-weight: bold; color: #3E2C23; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 1px;">Danh sách phòng đã đặt:</p>
      <table style="width: 100%; border-collapse: collapse; background: #FAF7F2; border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
        <thead>
          <tr style="background: #3E2C23;">
            <th style="padding: 8px 12px; font-size: 11px; color: #E0B97A; text-align: left;">Tên phòng</th>
            <th style="padding: 8px 12px; font-size: 11px; color: #E0B97A; text-align: center;">SL</th>
            <th style="padding: 8px 12px; font-size: 11px; color: #E0B97A; text-align: right;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${roomListHtml}</tbody>
      </table>`
            : ''}

      ${servicesHtml ? `<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;"><tbody>${servicesHtml}</tbody></table>` : ''}

      ${data.discountAmount > 0
            ? `<div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px;">
               <span style="color: #C85A32;">Giảm giá:</span>
               <span style="color: #C85A32; font-weight: bold;">-${data.discountAmount.toLocaleString('vi-VN')}đ</span>
             </div>`
            : ''}

      <!-- Total -->
      <div style="background: linear-gradient(135deg, #FFF5EB, #FAF2E6); border: 2px solid #C85A32; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; margin: 16px 0;">
        <div>
          <p style="font-size: 12px; font-weight: bold; color: #3E2C23; margin: 0;">Tổng thanh toán:</p>
          <p style="font-size: 10px; color: #7A6B63; margin: 2px 0 0;">Đã bao gồm VAT & phí dịch vụ</p>
        </div>
        <p style="font-size: 24px; font-weight: bold; color: #C85A32; margin: 0;">${data.totalPrice.toLocaleString('vi-VN')}đ</p>
      </div>

      <!-- Info -->
      <div style="background: #FAF7F2; border-radius: 8px; padding: 12px; margin-top: 16px; font-size: 12px; color: #7A6B63; line-height: 1.8;">
        <p style="margin: 0;">📩 Mã PIN Smart Lock đã được gửi qua Email & SMS.</p>
        <p style="margin: 0;">⏰ Hỗ trợ miễn phí đổi lịch hoặc hoàn cọc trước 05 ngày.</p>
        <p style="margin: 0;">📞 Hotline quản gia 24/7: <strong style="color: #3E2C23;">0908.868.888</strong></p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #3E2C23; padding: 16px 24px; text-align: center;">
      <p style="font-size: 11px; color: rgba(255,255,255,0.6); margin: 0;">
        © 2026 Đồi Bông Gòn Homestay — Tự động hóa lưu trú thông minh
      </p>
    </div>
  </div>
</body>
</html>`;
        const mailOptions = {
            from: smtpFrom,
            to: data.to,
            subject: `✅ Xác nhận đặt phòng #${data.bookingCode} — ${data.branchName}`,
            html: htmlContent,
        };
        await this.transporter.sendMail(mailOptions);
    }
    async sendMail(to, subject, htmlContent) {
        const smtpFrom = this.configService.get('SMTP_FROM', '"Homestay Đồi Bông Gòn" <no-reply@homestay.com>');
        const mailOptions = {
            from: smtpFrom,
            to,
            subject,
            html: htmlContent,
        };
        await this.transporter.sendMail(mailOptions);
    }
};
exports.MailService = MailService;
exports.MailService = MailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map