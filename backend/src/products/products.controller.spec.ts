
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [ProductsService],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all products', () => {
    const products = controller.findAll();

    expect(products).toHaveLength(3);
  });

  it('should return a product by ID', () => {
    const product = controller.findOne(1);

    expect(product).toBeDefined();
    expect(product.id).toBe(1);
  });

  it('should return 404 when a product does not exist', () => {
    expect(() => controller.findOne(999)).toThrow(NotFoundException);
  });
});
