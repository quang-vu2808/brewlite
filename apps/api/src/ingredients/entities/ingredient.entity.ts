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

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
