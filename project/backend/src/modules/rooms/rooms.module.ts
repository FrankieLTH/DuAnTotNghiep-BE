import { RoomInventoryService } from './room-inventory.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { AvailabilityService } from './availability.service';
import { RecommendationService } from './recommendation.service';
import { BasketService } from './basket.service';
import { Apartment, RoomType, Room, Amenity, RoomImage, Service, StayTypeConfig, RoomGroup, RoomFeature, RoomBlock } from '../../entities/room.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Apartment, RoomType, Room, Amenity, RoomImage, Service, StayTypeConfig, RoomGroup, RoomFeature, RoomBlock]),
  ],
  providers: [RoomInventoryService,RoomsService, AvailabilityService, RecommendationService, BasketService],
  controllers: [RoomsController],
  exports: [RoomInventoryService,RoomsService, AvailabilityService, RecommendationService, BasketService],
})
export class RoomsModule {}
