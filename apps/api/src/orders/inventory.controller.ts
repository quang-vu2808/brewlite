import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { ProductInventoryEntity } from './entities/product-inventory.entity';

@Controller('inventory')
export class InventoryController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  async findAll() {
    const products = this.productsService.findAll();
    const inventory = await this.dataSource.manager.find(ProductInventoryEntity);
    const stockByProduct = new Map(inventory.map((row) => [row.productId, row.stock]));
    return products.map((product) => ({
      productId: product.id,
      productName: product.name,
      stock: stockByProduct.get(product.id) ?? 0,
      available: (stockByProduct.get(product.id) ?? 0) > 0,
    }));
  }
}
