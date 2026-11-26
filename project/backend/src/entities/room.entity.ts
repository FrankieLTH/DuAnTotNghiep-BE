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

@Entity('apartments')
export class Apartment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  hotline: string;

  @Column({ type: 'enum', enum: ['active', 'hidden', 'inactive', 'under_construction'], default: 'active' })
  status: 'active' | 'hidden' | 'inactive' | 'under_construction';

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

  @Column({ type: 'int', nullable: true })
  parent_id: number | null;

  @ManyToOne(() => RoomType, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: RoomType | null;

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

  @ManyToOne('Room', 'room_blocks', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: any;

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

@Entity('rooms')
@Unique(['apartment_id', 'room_number'])
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  // Alias cho backward-compat với các service dùng room.room_id
  get room_id(): number { return this.id; }
  set room_id(value: number) { this.id = value; }

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

  @Column({ type: 'enum', enum: ['available', 'occupied', 'cleaning', 'maintenance', 'inactive'], default: 'available' })
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'inactive';

  @Column({ type: 'varchar', length: 500, nullable: true, comment: 'Mô tả đặc điểm đặc biệt của phòng (nhập tay, không ảnh hưởng giá)' })
  special_features?: string | null;

  @Column({ default: 0 })
  floor: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  room_group_name: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ default: 'clean' })
  housekeeping: 'clean' | 'dirty';

  @Column({ type: 'datetime', nullable: true })
  deleted_at: Date;

  @Column({ type: 'json', nullable: true })
  feature_ids: number[];

  @Column({ type: 'json', nullable: true })
  blocked_periods: { id: number; room_id: number; from_at: string; to_at: string | null; reason: string; created_by: string; created_at: string }[];

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

@Entity('amenities')
export class Amenity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;
}

@Entity('room_images')
export class RoomImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  room_id: number;

  @ManyToOne('Room', 'images', { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'room_id' })
  room: any;

  @Column({ nullable: true })
  room_types_id: number;  @Column()
  image_url: string;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('services')
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


@Entity('room_features')
export class RoomFeature {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true, length: 100 }) name: string;
  @Column({ length: 20 }) category: string;
  @Column('decimal', { precision: 12, scale: 2, default: 0 }) extra_price_per_night: number;
  @Column({ default: true }) is_active: boolean;
  @CreateDateColumn() created_at: Date;
}

