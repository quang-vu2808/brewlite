import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderEntity } from '../../orders/entities/order.entity';
import { IngredientEntity } from './ingredient.entity';

@Entity({ name: 'order_ingredient_consumptions' })
export class OrderIngredientConsumptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => OrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ name: 'ingredient_id', type: 'uuid' })
  ingredientId!: string;

  @ManyToOne(() => IngredientEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient!: IngredientEntity;

  @Column({ name: 'ingredient_name', type: 'varchar', length: 160 })
  ingredientName!: string;

  @Column({ name: 'ingredient_code', type: 'varchar', length: 40 })
  ingredientCode!: string;

  @Column({ name: 'ingredient_unit', type: 'varchar', length: 24 })
  ingredientUnit!: string;

  @Column({ type: 'integer' })
  quantity!: number;
}
