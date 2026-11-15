import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'promotions' })
export class PromotionEntity {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  code!: string;

  @Column({ name: 'discount_type', type: 'varchar', length: 10 })
  discountType!: 'PERCENT' | 'FIXED';

  @Column({ type: 'integer' })
  value!: number;

  @Column({ name: 'minimum_amount', type: 'integer', default: 0 })
  minimumAmount!: number;

  @Column({ name: 'maximum_discount', type: 'integer', nullable: true })
  maximumDiscount!: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt!: Date | null;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt!: Date | null;

  @Column({ name: 'usage_limit', type: 'integer', nullable: true })
  usageLimit!: number | null;

  @Column({ name: 'usage_count', type: 'integer', default: 0 })
  usageCount!: number;
}
