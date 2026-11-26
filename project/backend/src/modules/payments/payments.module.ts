import { RoomsModule } from '../rooms/rooms.module';
import { Module } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PayosGateway } from './payos.gateway';
@Module({ imports: [CustomerModule, RoomsModule], providers: [PaymentsService, PayosGateway], controllers: [PaymentsController], exports: [PaymentsService] })
export class PaymentsModule {}
