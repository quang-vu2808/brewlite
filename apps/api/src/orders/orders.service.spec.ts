import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import { PaymentEntity } from '../payments/payment.entity';
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
  const inventory = {
    reserve: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  };
  const ingredients = {
    reserveForOrder: jest.fn().mockResolvedValue([]),
    saveOrderConsumption: jest.fn().mockResolvedValue(undefined),
    releaseOrderConsumption: jest.fn().mockResolvedValue(undefined),
  };
  const findOne = jest.spyOn(productsService, 'findOne');
  const service = new OrdersService(dataSource, productsService, inventory, ingredients);

  beforeEach(() => {
    save.mockClear();
    transaction.mockClear();
    inventory.reserve.mockClear();
    ingredients.reserveForOrder.mockClear();
    ingredients.saveOrderConsumption.mockClear();
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
      subtotalAmount: 70000,
      discountAmount: 0,
      loyaltyDiscountAmount: 0,
      redeemedPoints: 0,
      promotionCode: null,
      loyaltyPointsAwarded: 0,
      inventoryReleasedAt: null,
      promotionUsageReleasedAt: null,
      userId: 'user-id',
    });
    expect(inventory.reserve).toHaveBeenCalledWith(expect.anything(), 1, 2);
    expect(ingredients.reserveForOrder).toHaveBeenCalledWith(
      expect.anything(),
      new Map([[1, 2]]),
    );
    expect(ingredients.saveOrderConsumption).toHaveBeenCalledWith(
      expect.anything(),
      'order-id',
      [],
    );
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

  it('returns only the authenticated user orders and their latest payment', async () => {
    const find = jest.fn()
      .mockResolvedValueOnce([Object.assign(new OrderEntity(), {
        id: 'order-id',
        userId: 'user-id',
        status: 'PAID',
        totalAmount: 35000,
        discountAmount: 0,
        promotionCode: null,
        createdAt,
        items: [],
      })])
      .mockResolvedValueOnce([Object.assign(new PaymentEntity(), {
        id: 'payment-id',
        orderId: 'order-id',
        method: 'CARD',
        status: 'SUCCESS',
        amount: 35000,
        createdAt,
      })]);
    const listService = new OrdersService(
      { manager: { find } } as unknown as DataSource,
      productsService,
      inventory,
      ingredients,
    );

    await expect(listService.findMine('user-id')).resolves.toEqual([{
      id: 'order-id',
      orderCode: 'order-id',
      status: 'PAID',
      subtotalAmount: 35000,
      discountAmount: 0,
      loyaltyDiscountAmount: 0,
      redeemedPoints: 0,
      loyaltyPointsAwarded: 0,
      promotionCode: null,
      totalAmount: 35000,
      createdAt,
      items: [],
      payment: {
        id: 'payment-id',
        method: 'CARD',
        status: 'SUCCESS',
        amount: 35000,
        createdAt,
      },
    }]);
    expect(find).toHaveBeenNthCalledWith(1, OrderEntity, {
      where: { userId: 'user-id' },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
    expect(find).toHaveBeenNthCalledWith(2, PaymentEntity, {
      where: { orderId: expect.anything() },
      order: { createdAt: 'DESC' },
    });
  });

  it('does not disclose an order owned by another user', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const detailService = new OrdersService(
      { manager: { findOne } } as unknown as DataSource,
      productsService,
      inventory,
      ingredients,
    );

    await expect(detailService.findOneForUser('order-id', 'user-id'))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(findOne).toHaveBeenCalledWith(OrderEntity, {
      where: { id: 'order-id', userId: 'user-id' },
      relations: { items: true },
    });
  });
});
