import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Room, RoomType } from '../../entities/room.entity';
import { Booking, BookingRoom } from '../../entities/booking.entity';

export interface AvailableRoomUnit {
  room: Room; type: RoomType; features: {id:number;name:string;extra_price_per_night:number}[]; featurePricePerNight:number;
}
@Injectable()
export class RoomInventoryService {
  constructor(private db: DataSource) {}
  async available(typeIds:number[],start:Date,end:Date,manager:EntityManager=this.db.manager,excludeBookingId=0,apartmentId?:number):Promise<AvailableRoomUnit[]> {
    if(!typeIds.length)return [];
    let qb = manager.getRepository(Room).createQueryBuilder('r').leftJoinAndSelect('r.room_type','t').leftJoinAndSelect('t.parent','tp').leftJoinAndSelect('r.apartment','a')
      .where('r.room_type_id IN (:...types)',{types:typeIds}).andWhere('r.is_hidden=0 AND r.deleted_at IS NULL')
      .andWhere("r.status = 'available' AND r.housekeeping='clean'");
    if (apartmentId) {
      qb = qb.andWhere('r.apartment_id = :aptId', { aptId: apartmentId });
    }
    const rooms = await qb.orderBy('r.room_id').getMany();
    const bookings=await manager.getRepository(Booking).createQueryBuilder('b').leftJoinAndSelect('b.booking_rooms','br').leftJoinAndSelect('b.room','legacy')
      .where('b.id != :exclude',{exclude:excludeBookingId}).andWhere('b.booked_start_time<:end AND b.booked_end_time>:start',{start,end})
      .andWhere("(b.booking_status IN ('confirmed','checked_in') OR (b.booking_status IN ('draft','pending_payment') AND (b.hold_expires_at> :now OR (b.hold_expires_at IS NULL AND b.room_id IS NOT NULL))))",{now:new Date()}).getMany();
    const occupied=new Set<number>();const unassigned=new Map<number,number>();
    for(const b of bookings){
      if(b.booking_rooms?.length){for(const line of b.booking_rooms){if(line.room_id)occupied.add(line.room_id);else unassigned.set(line.room_types_id,(unassigned.get(line.room_types_id)||0)+1);}}
      else if(b.room_id)occupied.add(b.room_id);else if(b.room_type_id)unassigned.set(b.room_type_id,(unassigned.get(b.room_type_id)||0)+1);
    }
    const units:AvailableRoomUnit[]=[];
    for(const room of rooms){
      const blocks=Array.isArray(room.blocked_periods)?room.blocked_periods:[];
      if(occupied.has(room.id)||blocks.some(b=>new Date(b.from_at)<end&&(!b.to_at||new Date(b.to_at)>start)))continue;
      units.push({room,type:room.room_type,features:[],featurePricePerNight:0});
    }
    // Existing type-only reservations consume capacity before offering specific rooms.
    const result:AvailableRoomUnit[]=[];
    for(const typeId of typeIds){const pool=units.filter(u=>u.type.id===typeId).sort((a,b)=>a.room.id-b.room.id);result.push(...pool.slice(unassigned.get(typeId)||0));}
    return result;
  }
  snapshot(unit:AvailableRoomUnit,nights:number,factor:number,extraBed=false){
    const base=Number(unit.type.base_price);const baseNightly=Math.round(base*factor);const features=unit.features.map(f=>({...f}));const featureNightly=unit.featurePricePerNight;
    return {room_id:unit.room.id,room_number:unit.room.room_number,room_type_id:unit.type.id,base_price_per_night:base,stay_price_factor:factor,base_nightly_price:baseNightly,features,feature_price_per_night:featureNightly,extra_bed:extraBed,extra_bed_price_per_night:extraBed?150000:0,nights,room_total:(baseNightly+featureNightly)*nights,extra_bed_total:extraBed?150000*nights:0};
  }
}
