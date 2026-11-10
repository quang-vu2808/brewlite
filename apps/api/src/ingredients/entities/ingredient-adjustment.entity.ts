import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/user.entity';
import { IngredientEntity } from './ingredient.entity';

@Entity({ name: 'ingredient_adjustments' })
export class IngredientAdjustmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ingredient_id', type: 'uuid' })
  ingredientId!: string;

  @ManyToOne(() => IngredientEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient!: IngredientEntity;

  @Column({ name: 'staff_user_id', type: 'uuid' })
  staffUserId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'staff_user_id' })
  staffUser!: UserEntity;

  @Column({ type: 'integer' })
  delta!: number;

  @Column({ type: 'varchar', length: 200 })
  reason!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
