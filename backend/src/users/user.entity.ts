import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderEntity } from '../orders/entities/order.entity';

@Entity({ name: 'users' })
@Index('UQ_users_email', ['email'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 60 })
  passwordHash!: string;

  @Column({ name: 'loyalty_points', type: 'integer', default: 0 })
  loyaltyPoints!: number;

  @Column({ type: 'varchar', length: 20, default: 'CUSTOMER' })
  role!: 'CUSTOMER' | 'STAFF';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => OrderEntity, (order) => order.user)
  orders!: OrderEntity[];
}
