import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import { CreateOrderDto } from './dto/create-order-item.dto';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { ProductsService } from '../products/products.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  const createdAt = new Date('2025-01-01T00:00:00.000Z');
  const product = { id: 1, name: 'Cà phê sữa', price: 25000, image: '' };
  const save = jest.fn(
    async (
      target: typeof OrderEntity | typeof OrderItemEntity,
      values: object | object[],
    ): Promise<OrderEntity | OrderItemEntity[]> => {
      if (target === OrderEntity) {
        return Object.assign(new OrderEntity(), values, {
          id: 'order-id',
          createdAt,
        });
      }

      return (values as object[]).map((item, index) =>
        Object.assign(new OrderItemEntity(), item, { id: `item-${index}` }),
      );
    },
  );
  const transaction = jest.fn(
    (work: (manager: EntityManager) => Promise<unknown>) =>
      work({ save } as unknown as EntityManager),
  );
  const dataSource = { transaction } as unknown as DataSource;
  const productsService = new ProductsService();
  const findOne = jest.spyOn(productsService, 'findOne');
  const service = new OrdersService(dataSource, productsService);

  beforeEach(() => {
    save.mockClear();
    transaction.mockClear();
    findOne.mockReset();
    findOne.mockImplementation((id) => id === product.id ? product : undefined);
  });

  it('recalculates prices and saves a PENDING order and its items transactionally', async () => {
    const dto: CreateOrderDto = {
      items: [{
        productId: 1,
        size: 'M',
        toppings: ['pearls'],
        quantity: 2,
      }],
    };

    await expect(service.create(dto, 'user-id')).resolves.toMatchObject({
      id: 'order-id',
      orderCode: 'order-id',
      status: 'PENDING',
      totalAmount: 70000,
      createdAt,
      items: [{
        productId: 1,
        productName: 'Cà phê sữa',
        unitPrice: 35000,
        lineTotal: 70000,
      }],
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenNthCalledWith(1, OrderEntity, {
      status: 'PENDING',
      totalAmount: 70000,
      userId: 'user-id',
    });
    expect(save.mock.calls[1][0]).toBe(OrderItemEntity);
    expect(save.mock.calls[1][1]).toEqual([expect.objectContaining({
      productId: 1,
      size: 'M',
      toppings: [{ id: 'pearls', name: 'Trân châu', surcharge: 5000 }],
      quantity: 2,
      unitPrice: 35000,
      lineTotal: 70000,
      orderId: 'order-id',
    })]);
  });

  it('rejects unknown products before starting a transaction', async () => {
    await expect(service.create({
      items: [{ productId: 999, size: 'S', quantity: 1, toppings: [] }],
    }, 'user-id')).rejects.toBeInstanceOf(NotFoundException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
