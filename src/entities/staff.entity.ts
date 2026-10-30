// src/entities/staff.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string; // store hashed password in production

  @Column()
  name: string;

  @Column({ default: 'staff' })
  role: string; // e.g., 'admin', 'manager'
}
