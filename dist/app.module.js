"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
const event_emitter_1 = require("@nestjs/event-emitter");
const user_entity_1 = require("./entities/user.entity");
const room_entity_1 = require("./entities/room.entity");
const booking_entity_1 = require("./entities/booking.entity");
const auth_module_1 = require("./modules/auth/auth.module");
const rooms_module_1 = require("./modules/rooms/rooms.module");
const bookings_module_1 = require("./modules/bookings/bookings.module");
const payments_module_1 = require("./modules/payments/payments.module");
const locks_module_1 = require("./modules/locks/locks.module");
const ai_module_1 = require("./modules/ai/ai.module");
const admin_module_1 = require("./modules/admin/admin.module");
const cron_module_1 = require("./modules/cron/cron.module");
const mail_module_1 = require("./modules/mail/mail.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'mysql',
                    host: config.get('DB_HOST', 'localhost'),
                    port: config.get('DB_PORT', 3306),
                    username: config.get('DB_USERNAME', 'root'),
                    password: config.get('DB_PASSWORD', ''),
                    database: config.get('DB_DATABASE', 'duantotnghiep'),
                    entities: [
                        user_entity_1.Role, user_entity_1.User, room_entity_1.Apartment, room_entity_1.RoomType, room_entity_1.Room, room_entity_1.Amenity, room_entity_1.RoomImage, room_entity_1.Service,
                        booking_entity_1.Lock, booking_entity_1.Voucher, booking_entity_1.Booking, booking_entity_1.LockPin, booking_entity_1.PaymentMethod, booking_entity_1.Payment, booking_entity_1.Refund, booking_entity_1.AIChatLog
                    ],
                    synchronize: false,
                    logging: false,
                }),
            }),
            schedule_1.ScheduleModule.forRoot(),
            event_emitter_1.EventEmitterModule.forRoot(),
            auth_module_1.AuthModule,
            rooms_module_1.RoomsModule,
            bookings_module_1.BookingsModule,
            payments_module_1.PaymentsModule,
            locks_module_1.LocksModule,
            ai_module_1.AIModule,
            admin_module_1.AdminModule,
            cron_module_1.CronModule,
            mail_module_1.MailModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map