import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerBookingsService } from './customer-bookings.service';
import { CustomerController } from './customer.controller';
import { CustomerGuard } from './customer.guard';
import { CustomerManagementService } from './customer-management.service';
import { CustomerAccountService } from './customer-account.service';
import { CustomerMailService } from './customer-mail.service';
@Module({ imports: [AuthModule], providers: [CustomerAuthService, CustomerAccountService, CustomerMailService, CustomerBookingsService, CustomerManagementService, CustomerGuard], controllers: [CustomerController] })
export class CustomerModule {}
