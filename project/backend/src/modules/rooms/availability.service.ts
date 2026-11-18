import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RoomType } from '../../entities/room.entity';
import { SearchCriteria, AvailableRoomType, computeStayWindow } from '@shared/recommendation';
import { RoomInventoryService } from './room-inventory.service';
@Injectable()
export class AvailabilityService {
  constructor(private db:DataSource,private inventory:RoomInventoryService) {}
  async getAvailableRoomTypes(criteria:SearchCriteria):Promise<AvailableRoomType[]> {
    const window=computeStayWindow(criteria.checkIn,criteria.checkOut,criteria.stayType);
    const typeQuery=this.db.getRepository(RoomType).createQueryBuilder('variant').innerJoinAndSelect('variant.parent','parent').where('variant.is_active = 1').andWhere('parent.is_active = 1').andWhere('variant.parent_id IS NOT NULL');
    if(criteria.apartmentId)typeQuery.andWhere('variant.apartment_id = :apartmentId',{apartmentId:criteria.apartmentId});
    const types=await typeQuery.getMany();
    const units=await this.inventory.available(types.map(t=>t.id),new Date(`${window.startAt}+07:00`),new Date(`${window.endAt}+07:00`));
    const groups=new Map<string,any>();
    for(const unit of units){const key=String(unit.type.id);let row=groups.get(key);
      if(!row){row={roomTypeId:unit.type.id,roomId:unit.room.id,roomIds:[],variantKey:key,variantGroup:unit.type.parent?.name||unit.type.name,variantLabel:unit.type.name,parentId:unit.type.parent?.id??unit.type.id,apartmentId:unit.type.apartment_id,apartmentName:unit.room.apartment?.name,name:unit.type.name,maxOccupancy:unit.type.max_occupancy,basePrice:Number(unit.type.base_price),featurePricePerNight:0,features:[],availableCount:0,area:unit.type.area,bedConfig:unit.type.bed_config,image:'',specialFeatures:unit.room.special_features||''};groups.set(key,row);}
      row.availableCount++;row.roomIds.push(unit.room.id);
    }
    const images=await this.db.query('SELECT room_id,room_types_id,image_url FROM ROOM_IMAGES ORDER BY id');
    for(const row of groups.values()){row.image=images.find(i=>i.room_id===row.roomId)?.image_url||images.find(i=>i.room_types_id===row.roomTypeId)?.image_url||images.find(i=>i.room_types_id===row.parentId)?.image_url||'';}
    return [...groups.values()].sort((a,b)=>(a.basePrice*window.priceFactor+a.featurePricePerNight)-(b.basePrice*window.priceFactor+b.featurePricePerNight));
  }
}
