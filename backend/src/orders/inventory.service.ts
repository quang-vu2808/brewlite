import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ProductInventoryEntity } from './entities/product-inventory.entity';

type InventoryRow = { stock: number; version: number };

@Injectable()
export class InventoryService {
  async reserve(manager: EntityManager, productId: number, quantity: number) {
    await this.changeStock(manager, productId, quantity, 'reserve');
  }

  async release(manager: EntityManager, productId: number, quantity: number) {
    await this.changeStock(manager, productId, quantity, 'release');
  }

  private async changeStock(
    manager: EntityManager,
    productId: number,
    quantity: number,
    action: 'reserve' | 'release',
  ) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const current = await manager.findOne(ProductInventoryEntity, {
        where: { productId },
      });
      if (!current) {
        throw new NotFoundException(`Chưa cấu hình tồn kho sản phẩm ${productId}`);
      }
      if (action === 'reserve' && current.stock < quantity) {
        throw new ConflictException(`Sản phẩm ${productId} không đủ tồn kho`);
      }

      const stockExpression = action === 'reserve'
        ? '"stock" - $1'
        : '"stock" + $1';
      const result: unknown = await manager.query(
        `UPDATE "product_inventory"
         SET "stock" = ${stockExpression}, "version" = "version" + 1
         WHERE "product_id" = $2 AND "version" = $3
           AND ($4::boolean = false OR "stock" >= $1)
         RETURNING "stock", "version"`,
        [quantity, productId, current.version, action === 'reserve'],
      );
      const rows = Array.isArray(result) && Array.isArray(result[0])
        ? result[0] as InventoryRow[]
        : result as InventoryRow[];
      if (rows.length === 1) return;
    }

    throw new ConflictException('Tồn kho vừa thay đổi; vui lòng thử lại');
  }
}
