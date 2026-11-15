import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { OrderItemEntity } from './order-item.entity';
import { UserEntity } from '../../users/user.entity';
import { PaymentEntity } from '../../payments/payment.entity';

@Entity({ name: 'orders' })
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status!: import('../order-state').OrderStatus;

  @Column({ name: 'total_amount', type: 'integer' })
  totalAmount!: number;

  @Column({ name: 'discount_amount', type: 'integer', default: 0 })
  discountAmount!: number;

  @Column({ name: 'subtotal_amount', type: 'integer', default: 0 })
  subtotalAmount!: number;

  @Column({ name: 'loyalty_discount_amount', type: 'integer', default: 0 })
  loyaltyDiscountAmount!: number;

  @Column({ name: 'redeemed_points', type: 'integer', default: 0 })
  redeemedPoints!: number;

  @Column({ name: 'promotion_code', type: 'varchar', length: 40, nullable: true })
  promotionCode!: string | null;

  @Column({ name: 'loyalty_points_awarded', type: 'integer', default: 0 })
  loyaltyPointsAwarded!: number;

  @Column({ name: 'inventory_released_at', type: 'timestamptz', nullable: true })
  inventoryReleasedAt!: Date | null;

  @Column({ name: 'promotion_usage_released_at', type: 'timestamptz', nullable: true })
  promotionUsageReleasedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => UserEntity, (user) => user.orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity | null;

  @OneToMany(() => OrderItemEntity, (item) => item.order)
  items!: OrderItemEntity[];

  @OneToMany(() => PaymentEntity, (payment) => payment.order)
  payments!: PaymentEntity[];
}
