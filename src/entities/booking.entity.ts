import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Room } from './room.entity';

@Entity('locks')
export class Lock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  room_id: number;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column()
  cloud_lock_id: string;

  @Column({ nullable: true })
  lock_name: string;

  @Column({ type: 'enum', enum: ['ttlock', 'manual', 'other'], default: 'ttlock' })
  lock_type: string;

  @Column({ type: 'enum', enum: ['online', 'offline', 'unknown'], default: 'unknown' })
  lock_status: string;

  @Column({ nullable: true })
  master_pin: string;

  @Column({ type: 'datetime', nullable: true })
  last_sync_at: Date;

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

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  booking_code: string;

  @Column({ nullable: true })
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  room_id: number;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ nullable: true })
  voucher_id: number;

  @ManyToOne(() => Voucher)
  @JoinColumn({ name: 'voucher_id' })
  voucher: Voucher;

  @Column({ type: 'longtext', nullable: true })
  guests_list: string;

  @Column({ type: 'enum', enum: ['short_stay', 'long_stay', 'monthly'], default: 'short_stay' })
  booking_type: string;

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
    enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    default: 'pending',
  })
  booking_status: string;

  @Column('decimal', { precision: 12, scale: 2 })
  total_price: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ default: false })
  is_archived: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
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

@Entity('ai_chat_logs')
export class AIChatLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  user_id: number;

  @Column()
  session_id: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text' })
  response: string;

  @CreateDateColumn()
  created_at: Date;
}
