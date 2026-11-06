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

  @ManyToMany(() => Amenity)
  @JoinTable({
    name: 'room_type_amenities',
    joinColumn: { name: 'room_types_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'amenity_id', referencedColumnName: 'id' },
  })
  amenities: Amenity[];

  @CreateDateColumn()
  created_at: Date;
}

@Entity('ROOMS')
@Unique(['apartment_id', 'room_number'])
export class Room {
  @PrimaryGeneratedColumn({ name: 'room_id' })
  id: number;

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

  @Column({ type: 'enum', enum: ['available', 'maintenance'], default: 'available' })
  status: 'available' | 'maintenance';

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
