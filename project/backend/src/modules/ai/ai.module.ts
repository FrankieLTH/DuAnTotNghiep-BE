import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { AIChatLog, Booking, LockPin } from '../../entities/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AIChatLog, Booking, LockPin])],
  providers: [AIService],
  controllers: [AIController],
  exports: [AIService],
})
export class AIModule {}
