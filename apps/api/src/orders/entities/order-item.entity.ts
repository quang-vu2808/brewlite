import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderEntity } from './order.entity';

export type OrderToppingSnapshot = {
  id: string;
  name: string;
  surcharge: number;
  quantity?: number;
};

@Entity({ name: 'order_items' })
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => OrderEntity, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ name: 'product_id', type: 'integer' })
  productId!: number;

  @Column({ name: 'product_name', type: 'varchar', length: 200 })
  productName!: string;

  @Column({ type: 'varchar', length: 1 })
  size!: 'S' | 'M' | 'L';

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  toppings!: OrderToppingSnapshot[];

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'integer' })
  unitPrice!: number;

  @Column({ name: 'line_total', type: 'integer' })
  lineTotal!: number;
}
