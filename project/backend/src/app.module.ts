import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { databaseConnection, initializeDatabase } from './common/config/database.config';
import { InfrastructureModule } from './common/infrastructure/infrastructure.module';

import { Role, User, Staff, Customer } from './entities/user.entity';
import { Apartment, RoomType, Room, Amenity, RoomImage, Service, RoomFeature } from './entities/room.entity';
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
} from './entities/booking.entity';

import { AuthModule } from './modules/auth/auth.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LocksModule } from './modules/locks/locks.module';
import { AIModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';
import { CustomerModule } from './modules/customer/customer.module';
import { CronModule } from './modules/cron/cron.module';

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
        ...databaseConnection(config),
        entities: [
          Role, User, Staff, Customer, Apartment, RoomType, Room, Amenity, RoomImage, Service, RoomFeature,
          Lock, Voucher, Booking, BookingGuest, BookingRoom, Transaction, AuditLog, LockPin, PaymentMethod, Payment, Refund, AIChatLog
        ],
        synchronize: false, // Dùng schema MySQL có sẵn
        logging: false,
      }),
      dataSourceFactory: initializeDatabase,
    }),

    InfrastructureModule,
    // Vercel Schedules invokes protected routes; local Docker keeps Nest timers.
    ...(process.env.VERCEL === '1' ? [] : [ScheduleModule.forRoot()]),
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
