import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Apartment } from './room.entity';

@Entity('ROLES')
export class Role {
  @PrimaryGeneratedColumn({ name: 'role_id' })
  id: number;

  @Column({ name: 'role_name', unique: true })
  role_name: string;
}

@Entity('STAFF')
export class Staff {
  @PrimaryGeneratedColumn({ name: 'staff_id' })
  id: number;

  @Column()
  role_id: number;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ nullable: true })
  apartment_id: number;

  @ManyToOne(() => Apartment, { nullable: true })
  @JoinColumn({ name: 'apartment_id' })
  apartment: Apartment;

  @Column()
  full_name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  password_hash: string;

  @Column({ default: false })
  is_blocked: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@Entity('CUSTOMER')
export class Customer {
  @PrimaryGeneratedColumn({ name: 'customer_id' })
  id: number;

  @Column()
  full_name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true, select: false })
  password_hash: string;

  @Column({ type: 'datetime', nullable: true })
  account_created_at: Date;

  @Column({ type: 'datetime', nullable: true })
  email_verified_at: Date;

  @Column({ default: false })
  is_blocked: boolean;

  @Column({ default: false })
  is_hidden: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

// User entity kept for backwards compatibility with auth module
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 1 })
  role_id: number;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column()
  full_name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  password_hash: string;

  @Column({ type: 'enum', enum: ['active', 'blocked'], default: 'active' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
