import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'ingredients' })
export class IngredientEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 24 })
  unit!: string;

  @Column({ type: 'integer', default: 0 })
  stock!: number;

  @Column({ name: 'warning_threshold', type: 'integer', default: 0 })
  warningThreshold!: number;

  @Column({ type: 'varchar', length: 16, default: 'INGREDIENT' })
  kind!: 'INGREDIENT' | 'PACKAGING';

  @Column({ type: 'varchar', length: 40, nullable: true })
  category!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'compatible_sizes', type: 'varchar', array: true, length: 1, default: () => "ARRAY[]::varchar(1)[]" })
  compatibleSizes!: Array<'S' | 'M' | 'L'>;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
