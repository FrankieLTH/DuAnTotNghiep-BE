import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { Role, User, Staff, Customer } from './entities/user.entity';
import { Apartment, RoomType, Room, Amenity, RoomImage, Service } from './entities/room.entity';
import {
  Lock,
  Voucher,
  Booking,
  BookingGuest,
  BookingRoom,
  Transaction,
  AuditLog,
  LockPin,
  PaymentMethod,
  Payment,
  Refund,
  AIChatLog,
  BookingRequest,
} from './entities/booking.entity';

import { AuthModule } from './modules/auth/auth.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LocksModule } from './modules/locks/locks.module';
import { AIModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';
import { CronModule } from './modules/cron/cron.module';
import { CustomerModule } from './modules/customer/customer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USERNAME', 'root'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_DATABASE', 'duantotnghiep'),
        entities: [
          Role, User, Staff, Customer, Apartment, RoomType, Room, Amenity, RoomImage, Service,
          Lock, Voucher, Booking, BookingGuest, BookingRoom, Transaction, AuditLog, LockPin, PaymentMethod, Payment, Refund, AIChatLog, BookingRequest
        ],
        synchronize: false, // Dùng schema MySQL có sẵn
        logging: false,
      }),
    }),

    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),

    AuthModule,
    CustomerModule,
    RoomsModule,
    BookingsModule,
    PaymentsModule,
    LocksModule,
    AIModule,
    AdminModule,
    CronModule,
  ],
})
export class AppModule {}
