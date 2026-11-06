import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { Apartment, RoomType, Room, Amenity, RoomImage, Service } from '../../entities/room.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Apartment, RoomType, Room, Amenity, RoomImage, Service]),
  ],
  providers: [RoomsService],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
