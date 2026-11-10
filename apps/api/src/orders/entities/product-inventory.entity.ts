import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'product_inventory' })
export class ProductInventoryEntity {
  @PrimaryColumn({ name: 'product_id', type: 'integer' })
  productId!: number;

  @Column({ type: 'integer', default: 0 })
  stock!: number;

  @Column({ type: 'integer', default: 1 })
  version!: number;
}
