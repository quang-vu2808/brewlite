import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('trả về danh sách sản phẩm', () => {
    const products = service.findAll();

    expect(products).toHaveLength(3);
    expect(products[0].name).toBe('Cà phê sữa');
  });

  it('tìm sản phẩm theo ID', () => {
    const product = service.findOne(1);

    expect(product).toBeDefined();
    expect(product?.id).toBe(1);
  });

  it('trả về undefined khi không tìm thấy sản phẩm', () => {
    const product = service.findOne(999);

    expect(product).toBeUndefined();
  });
});