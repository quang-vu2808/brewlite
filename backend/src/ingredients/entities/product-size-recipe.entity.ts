import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { IngredientEntity } from './ingredient.entity';

@Entity({ name: 'product_size_recipes' })
export class ProductSizeRecipeEntity {
  @PrimaryColumn({ name: 'product_id', type: 'integer' })
  productId!: number;

  @PrimaryColumn({ type: 'varchar', length: 1 })
  size!: 'S' | 'M' | 'L';

  @Column({ name: 'approval_status', type: 'varchar', length: 16, default: 'PENDING' })
  approvalStatus!: 'PENDING' | 'CONFIRMED';

  @CreateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity({ name: 'product_size_recipe_items' })
export class ProductSizeRecipeItemEntity {
  @PrimaryColumn({ name: 'product_id', type: 'integer' })
  productId!: number;

  @PrimaryColumn({ type: 'varchar', length: 1 })
  size!: 'S' | 'M' | 'L';

  @PrimaryColumn({ name: 'ingredient_id', type: 'uuid' })
  ingredientId!: string;

  @ManyToOne(() => ProductSizeRecipeEntity, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'product_id', referencedColumnName: 'productId' },
    { name: 'size', referencedColumnName: 'size' },
  ])
  recipe!: ProductSizeRecipeEntity;

  @ManyToOne(() => IngredientEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient!: IngredientEntity;

  @Column({ name: 'quantity_required', type: 'integer' })
  quantityRequired!: number;
}

@Entity({ name: 'product_packaging_recipes' })
export class ProductPackagingRecipeEntity {
  @PrimaryColumn({ name: 'product_id', type: 'integer' })
  productId!: number;

  @PrimaryColumn({ type: 'varchar', length: 1 })
  size!: 'S' | 'M' | 'L';

  @PrimaryColumn({ name: 'ingredient_id', type: 'uuid' })
  ingredientId!: string;

  @ManyToOne(() => IngredientEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient!: IngredientEntity;

  @Column({ name: 'usage_type', type: 'varchar', length: 16 })
  usageType!: 'PER_SERVING' | 'PER_ORDER' | 'PER_GROUP';

  @Column({ name: 'quantity_required', type: 'integer' })
  quantityRequired!: number;

  @Column({ name: 'servings_per_unit', type: 'integer', default: 1 })
  servingsPerUnit!: number;
}

@Entity({ name: 'toppings' })
export class ToppingEntity {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'integer' })
  surcharge!: number;

  @Column({ name: 'ingredient_id', type: 'uuid', nullable: true })
  ingredientId!: string | null;

  @ManyToOne(() => IngredientEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient!: IngredientEntity | null;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean;

  @Column({ name: 'portion_quantity_required', type: 'integer', nullable: true })
  portionQuantityRequired!: number | null;
}

@Entity({ name: 'product_topping_recipes' })
export class ProductToppingRecipeEntity {
  @PrimaryColumn({ name: 'product_id', type: 'integer' })
  productId!: number;

  @PrimaryColumn({ type: 'varchar', length: 1 })
  size!: 'S' | 'M' | 'L';

  @PrimaryColumn({ name: 'topping_id', type: 'varchar', length: 40 })
  toppingId!: string;

  @ManyToOne(() => ToppingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'topping_id' })
  topping!: ToppingEntity;

  @Column({ name: 'quantity_required', type: 'integer' })
  quantityRequired!: number;

  @Column({ name: 'max_portions', type: 'integer', default: 1 })
  maxPortions!: number;
}
