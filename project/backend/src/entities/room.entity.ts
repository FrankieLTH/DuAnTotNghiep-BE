import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  Unique,
} from 'typeorm';

@Entity('APARTMENT')
export class Apartment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  hotline: string;

  @Column({ type: 'enum', enum: ['active', 'hidden'], default: 'active' })
  status: 'active' | 'hidden';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@Entity('room_types')
export class RoomType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  apartment_id: number;

  @ManyToOne(() => Apartment)
  @JoinColumn({ name: 'apartment_id' })
  apartment: Apartment;

  @Column('decimal', { precision: 12, scale: 2 })
  base_price: number;

  @Column()
  max_occupancy: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: '1 giường đôi' })
  bed_config: string;

  @Column({ default: 28 })
  area: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('ROOMS')
@Unique(['apartment_id', 'room_number'])
export class Room {
  @PrimaryGeneratedColumn({ name: 'room_id' })
  id: number;

  @Column({ name: 'room_id', insert: false, update: false })
  room_id: number;

  @Column()
  apartment_id: number;

  @ManyToOne(() => Apartment)
  @JoinColumn({ name: 'apartment_id' })
  apartment: Apartment;

  @Column()
  room_type_id: number;

  @ManyToOne(() => RoomType)
  @JoinColumn({ name: 'room_type_id' })
  room_type: RoomType;

  @Column()
  room_number: string;

  @Column({ type: 'int', default: 1 })
  floor: number;

  @Column({ type: 'int', nullable: true })
  room_group_id?: number | null;

  @ManyToOne(() => RoomGroup, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'room_group_id' })
  room_group?: RoomGroup | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({ type: 'enum', enum: ['clean', 'dirty'], default: 'clean' })
  housekeeping: 'clean' | 'dirty';

  @Column({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;

  @Column({ type: 'enum', enum: ['available', 'occupied', 'cleaning', 'maintenance'], default: 'available' })
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';

  @Column({ type: 'varchar', length: 500, nullable: true, comment: 'Mô tả đặc điểm đặc biệt của phòng (nhập tay, không ảnh hưởng giá)' })
  special_features?: string | null;

  @Column({ type: 'date', nullable: true })
  last_maintenance_date: string;

  @Column({ default: false })
  is_hidden: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => RoomImage, (image) => image.room)
  images: RoomImage[];

  @ManyToMany(() => Amenity)
  @JoinTable({
    name: 'room_amenities',
    joinColumn: { name: 'room_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'amenity_id', referencedColumnName: 'id' },
  })
  amenities: Amenity[];

  @ManyToMany(() => RoomFeature)
  @JoinTable({
    name: 'room_feature_map',
    joinColumn: { name: 'room_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'feature_id', referencedColumnName: 'id' },
  })
  features: RoomFeature[];

  @OneToMany(() => RoomBlock, (block) => block.room)
  room_blocks: RoomBlock[];
}

@Entity('room_groups')
export class RoomGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('room_features')
export class RoomFeature {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'enum', enum: ['view', 'sunlight', 'comfort', 'amenity'] })
  category: 'view' | 'sunlight' | 'comfort' | 'amenity';

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('room_blocks')
export class RoomBlock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  room_id: number;

  @ManyToOne(() => Room, (room) => room.room_blocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ type: 'datetime' })
  from_at: Date;

  @Column({ type: 'datetime', nullable: true })
  to_at: Date | null;

  @Column({ length: 500 })
  reason: string;

  @Column({ nullable: true, length: 100 })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('amenities')
export class Amenity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;
}

@Entity('ROOM_IMAGES')
export class RoomImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  room_id: number;

  @ManyToOne(() => Room, (room) => room.images, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ nullable: true })
  room_types_id: number;

  @Column()
  image_url: string;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('SERVICES')
export class Service {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('decimal', { precision: 12, scale: 2 })
  price: number;

  @Column({ default: false })
  is_compensation: boolean;

  @Column({ default: true })
  is_active: boolean;
}

@Entity('stay_type_config')
export class StayTypeConfig {
  @Column({ primary: true, length: 20 })
  stay_type: string;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time' })
  end_time: string;

  @Column('decimal', { precision: 3, scale: 2 })
  price_factor: number;
}

