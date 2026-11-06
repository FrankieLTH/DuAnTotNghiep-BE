import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { User, Staff, Customer } from './user.entity';
import { Room, Apartment, RoomType } from './room.entity';
import {
  BookingStatus,
  BookingType,
  VerificationStatus,
  BookingSource,
  GuestType,
  DocType,
  GuestSlotStatus,
  TransactionType,
  LockStatus,
  LockType,
} from '@shared/enums';

@Entity('lock')
export class Lock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  room_id: number;

  @ManyToOne(() => Room, { nullable: true })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column()
  cloud_lock_id: string;

  @Column({ nullable: true })
  lock_name: string;

  @Column({ type: 'enum', enum: LockType, default: LockType.TTLOCK })
  lock_type: LockType;

  @Column({ type: 'enum', enum: LockStatus, default: LockStatus.UNKNOWN })
  lock_status: LockStatus;

  @Column({ default: 100 })
  battery_level: number;

  @Column({ nullable: true })
  master_pin: string;

  @Column({ type: 'datetime', nullable: true })
  last_sync_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('vouchers')
export class Voucher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'enum', enum: ['percentage', 'fixed_amount'] })
  discount_type: string;

  @Column('decimal', { precision: 12, scale: 2 })
  discount_value: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  max_discount_amount: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  min_order_value: number;

  @Column({ nullable: true })
  usage_limit: number;

  @Column({ default: 0 })
  used_count: number;

  @Column({ type: 'datetime', nullable: true })
  start_date: Date;

  @Column({ type: 'datetime', nullable: true })
  end_date: Date;

  @Column({ default: true })
  is_active: boolean;
}

@Entity('BOOKINGS')
@Index('idx_bookings_apt_status_start', ['apartment_id', 'booking_status', 'booked_start_time'])
@Index('idx_bookings_customer_hold', ['customer_id', 'hold_expires_at'])
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  booking_code: string;

  @Column()
  apartment_id: number;

  @ManyToOne(() => Apartment)
  @JoinColumn({ name: 'apartment_id' })
  apartment: Apartment;

  @Column({ nullable: true })
  customer_id: number;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  // Backwards compatibility for user_id
  @Column({ nullable: true })
  user_id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  room_id: number;

  @ManyToOne(() => Room, { nullable: true })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ nullable: true })
  voucher_id: number;

  @ManyToOne(() => Voucher, { nullable: true })
  @JoinColumn({ name: 'voucher_id' })
  voucher: Voucher;

  @Column({ default: 1 })
  adults: number;

  @Column({ default: 0 })
  children: number;

  @Column({ type: 'longtext', nullable: true })
  guests_list: string;

  @Column({ default: false })
  is_booked_for_other: boolean;

  @Column({ nullable: true })
  lock_email: string;

  @Column({ type: 'enum', enum: BookingType, default: BookingType.OVERNIGHT })
  booking_type: BookingType;

  @Column({ type: 'datetime' })
  booked_start_time: Date;

  @Column({ type: 'datetime' })
  booked_end_time: Date;

  @Column({ type: 'datetime', nullable: true })
  check_in_actual: Date;

  @Column({ type: 'datetime', nullable: true })
  check_out_actual: Date;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING_PAYMENT,
  })
  booking_status: BookingStatus;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verification_status: VerificationStatus;

  @Column({ nullable: true })
  reviewed_by: number;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: Staff;

  @Column({ type: 'datetime', nullable: true })
  reviewed_at: Date;

  @Column({ type: 'datetime', nullable: true })
  consent_at: Date;

  @Column({ nullable: true })
  stay_reason: string;

  @Column({ type: 'enum', enum: BookingSource, default: BookingSource.ONLINE })
  source: BookingSource;

  @Column({ nullable: true })
  created_by: number;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: Staff;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'text', nullable: true })
  cancel_reason: string;

  @Column({ type: 'datetime', nullable: true })
  cancelled_at: Date;

  @Column({ nullable: true })
  cancelled_by: number;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'cancelled_by' })
  canceller: Staff;

  @Column('decimal', { precision: 12, scale: 2 })
  total_price: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ type: 'datetime', nullable: true })
  hold_expires_at: Date;

  @Column({ default: false })
  is_archived: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => BookingGuest, (guest) => guest.booking)
  guests: BookingGuest[];

  @OneToMany(() => BookingRoom, (br) => br.booking)
  booking_rooms: BookingRoom[];

  @OneToMany(() => Transaction, (tx) => tx.booking)
  transactions: Transaction[];

  @OneToMany(() => LockPin, (lp) => lp.booking)
  lock_pins: LockPin[];
}

@Entity('booking_guests')
export class BookingGuest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bookings_id: number;

  @ManyToOne(() => Booking, (b) => b.guests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookings_id' })
  booking: Booking;

  @Column({ type: 'enum', enum: GuestType, default: GuestType.PRIMARY })
  guest_type: GuestType;

  @Column({ default: true })
  is_staying: boolean;

  @Column()
  full_name: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @Column({ type: 'enum', enum: ['male', 'female', 'other'], nullable: true })
  gender: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'enum', enum: DocType, nullable: true })
  doc_type: DocType;

  @Column({ nullable: true })
  doc_number: string;

  @Column({ nullable: true })
  doc_image_front: string;

  @Column({ nullable: true })
  doc_image_back: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  ocr_confidence: number;

  @Column({ type: 'longtext', nullable: true })
  ocr_raw: string;

  @Column({ type: 'enum', enum: GuestSlotStatus, default: GuestSlotStatus.EMPTY })
  status: GuestSlotStatus;

  @Column({ type: 'datetime', nullable: true })
  doc_deleted_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@Entity('Booking_rooms')
export class BookingRoom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bookings_id: number;

  @ManyToOne(() => Booking, (b) => b.booking_rooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookings_id' })
  booking: Booking;

  @Column()
  room_types_id: number;

  @ManyToOne(() => RoomType)
  @JoinColumn({ name: 'room_types_id' })
  room_type: RoomType;

  @Column({ nullable: true })
  room_id: number;

  @ManyToOne(() => Room, { nullable: true })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('lock_pin')
export class LockPin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  booking_id: number;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column()
  lock_id: number;

  @ManyToOne(() => Lock)
  @JoinColumn({ name: 'lock_id' })
  lock: Lock;

  @Column({ nullable: true })
  cloud_pw_id: string;

  @Column()
  pin: string;

  @Column({ type: 'datetime', nullable: true })
  lock_pin_start_time: Date;

  @Column({ type: 'datetime', nullable: true })
  lock_pin_end_time: Date;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('TRANSACTION')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  booking_id: number;

  @ManyToOne(() => Booking, (b) => b.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'counter_cash' })
  payment_method: string;

  @Column({ nullable: true })
  transaction_code: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ nullable: true })
  created_by: number;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: Staff;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('Audit_logs')
@Index('idx_audit_logs_entity', ['entity_type', 'entity_id'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  actor: string;

  @Column({ nullable: true })
  actor_id: number;

  @Column()
  action: string;

  @Column()
  entity_type: string;

  @Column()
  entity_id: number;

  @Column({ type: 'longtext', nullable: true })
  old_value: string;

  @Column({ type: 'longtext', nullable: true })
  new_value: string;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  method_name: string;

  @Column({ nullable: true })
  provider_code: string;

  @Column({ default: true })
  is_active: boolean;
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  booking_id: number;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column()
  payment_method_id: number;

  @ManyToOne(() => PaymentMethod)
  @JoinColumn({ name: 'payment_method_id' })
  payment_method: PaymentMethod;

  @Column({ nullable: true })
  transaction_id: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending',
  })
  payment_status: string;

  @Column({ type: 'datetime', nullable: true })
  paid_at: Date;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  payment_id: number;

  @Column()
  booking_id: number;

  @Column('decimal', { precision: 12, scale: 2 })
  refund_amount: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  refund_percentage: number;

  @Column({ type: 'enum', enum: ['requested', 'approved', 'rejected', 'processed'], default: 'requested' })
  status: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn()
  created_at: Date;
}

export type CustomerRequestType = 'cancel' | 'refund' | 'extend' | 'change_room';
export type CustomerRequestStatus = 'pending' | 'reviewing' | 'resolved' | 'rejected';

@Entity('booking_requests')
@Index(['booking_id', 'created_at'])
export class BookingRequest {
  @PrimaryGeneratedColumn() id: number;
  @Column() booking_id: number;
  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' }) booking: Booking;
  @Column() customer_id: number;
  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' }) customer: Customer;
  @Column({ type: 'enum', enum: ['cancel', 'refund', 'extend', 'change_room'] }) type: CustomerRequestType;
  @Column({ type: 'enum', enum: ['pending', 'reviewing', 'resolved', 'rejected'], default: 'pending' }) status: CustomerRequestStatus;
  @Column({ type: 'text' }) reason: string;
  @Column({ type: 'date', nullable: true }) requested_end_date: string;
  @Column({ type: 'int', nullable: true }) requested_room_type_id: number;
  @Column({ type: 'text', nullable: true }) staff_reply: string;
  @Column({ nullable: true }) handled_by: string;
  @Column({ type: 'datetime', nullable: true }) handled_at: Date;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

@Entity('ai_chat_logs')
export class AIChatLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  customer_id: number;

  @Column()
  session_id: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text' })
  response: string;

  @CreateDateColumn()
  created_at: Date;
}
