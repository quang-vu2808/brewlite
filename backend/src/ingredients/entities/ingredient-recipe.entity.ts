import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { IngredientEntity } from './ingredient.entity';

@Entity({ name: 'product_recipes' })
@Unique('UQ_product_recipes_product_ingredient', ['productId', 'ingredientId'])
export class IngredientRecipeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'integer' })
  productId!: number;

  @Column({ name: 'ingredient_id', type: 'uuid' })
  ingredientId!: string;

  @ManyToOne(() => IngredientEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient!: IngredientEntity;

  @Column({ name: 'quantity_required', type: 'integer' })
  quantityRequired!: number;
}
