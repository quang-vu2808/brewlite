import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, In } from 'typeorm';
import { CreateOrders1710000000000 } from '../src/database/migrations/1710000000000-CreateOrders';
import { AddUsersAndOrderOwner1710000001000 } from '../src/database/migrations/1710000001000-AddUsersAndOrderOwner';
import { CreatePayments1710000002000 } from '../src/database/migrations/1710000002000-CreatePayments';
import { Task10BusinessRules1710000003000 } from '../src/database/migrations/1710000003000-Task10BusinessRules';
import { RedemptionAndPromotionRules1710000004000 } from '../src/database/migrations/1710000004000-RedemptionAndPromotionRules';
import { OrderEntity } from '../src/orders/entities/order.entity';
import { OrderItemEntity } from '../src/orders/entities/order-item.entity';
import { ProductInventoryEntity } from '../src/orders/entities/product-inventory.entity';
import { InventoryService } from '../src/orders/inventory.service';
import { OrdersService } from '../src/orders/orders.service';
import { PaymentEntity, PaymentMethod } from '../src/payments/payment.entity';
import { PaymentsService } from '../src/payments/payments.service';
import { MockPaymentProvider } from '../src/payments/mock-payment.provider';
import { PromotionEntity } from '../src/promotions/promotion.entity';
import { PromotionsService } from '../src/promotions/promotions.service';
import { ProductsService } from '../src/products/products.service';
import { UserEntity } from '../src/users/user.entity';
import { IngredientEntity } from '../src/ingredients/entities/ingredient.entity';
import { IngredientRecipeEntity } from '../src/ingredients/entities/ingredient-recipe.entity';
import { OrderIngredientConsumptionEntity } from '../src/ingredients/entities/order-ingredient-consumption.entity';
import { CreateIngredientInventory1710000005000 } from '../src/database/migrations/1710000005000-CreateIngredientInventory';
import { IngredientsService } from '../src/ingredients/ingredients.service';
import { IngredientAdjustmentEntity } from '../src/ingredients/entities/ingredient-adjustment.entity';

const enabled = process.env.TEST_DB_ALLOW_MUTATIONS === '1' &&
  Boolean(process.env.TEST_DB_NAME && process.env.TEST_DB_PASSWORD);
const describeWithDatabase = enabled ? describe : describe.skip;

describeWithDatabase('Task 10 PostgreSQL integration', () => {
  let dataSource: DataSource;
  let orders: OrdersService;
  let promotions: PromotionsService;
  let payments: PaymentsService;
  let failingPayments: PaymentsService;
  let ingredients: IngredientsService;
  const userIds: string[] = [];
  const promotionCodes: string[] = [];

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.TEST_DB_HOST ?? '127.0.0.1',
      port: Number(process.env.TEST_DB_PORT ?? 55432),
      username: process.env.TEST_DB_USER ?? 'task10',
      password: process.env.TEST_DB_PASSWORD,
      database: process.env.TEST_DB_NAME,
      entities: [
        OrderEntity,
        OrderItemEntity,
        UserEntity,
        PaymentEntity,
        ProductInventoryEntity,
        PromotionEntity,
        IngredientEntity,
        IngredientRecipeEntity,
        OrderIngredientConsumptionEntity,
        IngredientAdjustmentEntity,
      ],
      migrations: [
        CreateOrders1710000000000,
        AddUsersAndOrderOwner1710000001000,
        CreatePayments1710000002000,
        Task10BusinessRules1710000003000,
        RedemptionAndPromotionRules1710000004000,
        CreateIngredientInventory1710000005000,
      ],
      migrationsRun: true,
      synchronize: false,
    });
    await dataSource.initialize();
    const successConfig = { get: () => 'false' } as unknown as ConfigService;
    const failConfig = { get: () => 'true' } as unknown as ConfigService;
    ingredients = new IngredientsService(dataSource, new ProductsService());
    orders = new OrdersService(
      dataSource,
      new ProductsService(),
      new InventoryService(),
      ingredients,
    );
    promotions = new PromotionsService(dataSource);
    payments = new PaymentsService(dataSource, successConfig, new MockPaymentProvider());
    failingPayments = new PaymentsService(dataSource, failConfig, new MockPaymentProvider());
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.query(
      'UPDATE "product_inventory" SET "stock" = 1, "version" = "version" + 1 WHERE "product_id" = 1',
    );
    const inventory = await dataSource.getRepository(ProductInventoryEntity)
      .findOneByOrFail({ productId: 1 });
    expect(inventory.stock).toBe(1);
    await dataSource.query(
      'UPDATE "ingredients" SET "stock" = 10000, "version" = "version" + 1',
    );
  });

  afterEach(async () => {
    if (promotionCodes.length > 0) {
      await dataSource.getRepository(PromotionEntity).delete({ code: In(promotionCodes) });
      promotionCodes.length = 0;
    }
    if (userIds.length > 0) {
      await dataSource.query(
        'DELETE FROM "ingredient_adjustments" WHERE "staff_user_id" = ANY($1::uuid[])',
        [userIds],
      );
      await dataSource.query(
        'DELETE FROM "orders" WHERE "user_id" = ANY($1::uuid[])',
        [userIds],
      );
      await dataSource.getRepository(UserEntity).delete({ id: In(userIds) });
      userIds.length = 0;
    }
    await dataSource.query(
      'UPDATE "product_inventory" SET "stock" = 100, "version" = "version" + 1 WHERE "product_id" = 1',
    );
    await dataSource.query(
      'UPDATE "ingredients" SET "stock" = 10000, "version" = "version" + 1',
    );
  });

  async function createUser(role: 'CUSTOMER' | 'STAFF' = 'CUSTOMER') {
    const user = await dataSource.getRepository(UserEntity).save({
      email: `task10-${randomUUID()}@example.invalid`,
      passwordHash: 'unused-test-hash',
      role,
      loyaltyPoints: 0,
    });
    userIds.push(user.id);
    return user;
  }

  async function createOrder(userId: string, promoCode?: string, redeemPoints?: number) {
    return orders.create({
      items: [{ productId: 1, size: 'S', toppings: [], quantity: 1 }],
      ...(promoCode ? { promoCode } : {}),
      ...(redeemPoints !== undefined ? { redeemPoints } : {}),
    }, userId);
  }

  it('previews coupon and loyalty pricing without consuming stock, points, or promotion usage', async () => {
    const user = await createUser();
    await dataSource.getRepository(UserEntity).update({ id: user.id }, { loyaltyPoints: 100 });
    const code = `PREVIEW${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    promotionCodes.push(code);
    await dataSource.getRepository(PromotionEntity).save({
      code,
      discountType: 'PERCENT',
      value: 10,
      minimumAmount: 0,
      maximumDiscount: null,
      isActive: true,
      startsAt: null,
      endsAt: null,
      usageLimit: 2,
      usageCount: 0,
    });

    const beforeStock = await dataSource.getRepository(ProductInventoryEntity)
      .findOneByOrFail({ productId: 1 });
    const preview = await orders.preview({
      items: [{ productId: 1, size: 'S', toppings: [], quantity: 1 }],
      promoCode: code,
      redeemPoints: 100,
    }, user.id);

    expect(preview).toMatchObject({
      subtotalAmount: 25000,
      discountAmount: 2500,
      redeemedPoints: 100,
      loyaltyDiscountAmount: 10000,
      totalAmount: 12500,
      projectedLoyaltyPoints: 12,
    });
    expect(await dataSource.getRepository(OrderEntity).countBy({ userId: user.id })).toBe(0);
    expect((await dataSource.getRepository(UserEntity).findOneByOrFail({ id: user.id })).loyaltyPoints)
      .toBe(100);
    expect((await dataSource.getRepository(ProductInventoryEntity)
      .findOneByOrFail({ productId: 1 })).stock).toBe(beforeStock.stock);
    expect((await dataSource.getRepository(PromotionEntity).findOneByOrFail({ code })).usageCount)
      .toBe(0);

    const order = await orders.create({
      items: [{ productId: 1, size: 'S', toppings: [], quantity: 1 }],
      promoCode: code,
      redeemPoints: 100,
    }, user.id);
    expect(order).toMatchObject({
      subtotalAmount: preview.subtotalAmount,
      discountAmount: preview.discountAmount,
      loyaltyDiscountAmount: preview.loyaltyDiscountAmount,
      totalAmount: preview.totalAmount,
      redeemedPoints: preview.redeemedPoints,
    });
  });

  it('rejects invalid codes, excessive points, and points beyond the remaining payable total in preview', async () => {
    const user = await createUser();
    await dataSource.getRepository(UserEntity).update({ id: user.id }, { loyaltyPoints: 500 });
    const items = [{ productId: 1, size: 'S' as const, toppings: [], quantity: 1 }];

    await expect(orders.preview({ items, promoCode: 'NOTREAL' }, user.id))
      .rejects.toThrow('Mã khuyến mãi không hợp lệ');
    await expect(orders.preview({ items, redeemPoints: 501 }, user.id))
      .rejects.toThrow('Số điểm thành viên không đủ');
    await expect(orders.preview({ items, redeemPoints: 251 }, user.id))
      .rejects.toThrow('Điểm đổi vượt quá giá trị đơn hàng');
  });

  it('reserves and refunds loyalty points within order transactions', async () => {
    const user = await createUser();
    await dataSource.getRepository(UserEntity).update({ id: user.id }, { loyaltyPoints: 100 });
    const order = await createOrder(user.id, 'BREW10', 100);
    expect(order).toMatchObject({
      subtotalAmount: 25000,
      discountAmount: 2500,
      loyaltyDiscountAmount: 10000,
      redeemedPoints: 100,
      totalAmount: 12500,
      loyaltyPoints: 0,
    });
    expect((await dataSource.getRepository(UserEntity).findOneByOrFail({ id: user.id })).loyaltyPoints)
      .toBe(0);

    await orders.cancelForUser(order.id, user.id);
    expect((await dataSource.getRepository(UserEntity).findOneByOrFail({ id: user.id })).loyaltyPoints)
      .toBe(100);
    expect((await dataSource.getRepository(OrderEntity).findOneByOrFail({ id: order.id })).status)
      .toBe('CANCELLED');
  });

  it('enforces a promotion redemption limit without consuming inventory on rejection', async () => {
    const code = `TEST${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    promotionCodes.push(code);
    await dataSource.getRepository(PromotionEntity).save({
      code,
      discountType: 'FIXED',
      value: 1000,
      minimumAmount: 0,
      maximumDiscount: null,
      isActive: true,
      startsAt: null,
      endsAt: null,
      usageLimit: 1,
      usageCount: 0,
    });

    await dataSource.query(
      'UPDATE "product_inventory" SET "stock" = 5, "version" = "version" + 1 WHERE "product_id" = 1',
    );
    const first = await createUser();
    const second = await createUser();
    const order = await createOrder(first.id, code);
    await expect(createOrder(second.id, code)).rejects.toThrow('Mã khuyến mãi không hợp lệ');
    expect((await dataSource.getRepository(PromotionEntity).findOneByOrFail({ code })).usageCount)
      .toBe(1);
    expect((await dataSource.getRepository(ProductInventoryEntity).findOneByOrFail({ productId: 1 })).stock)
      .toBe(4);
    expect(await dataSource.getRepository(OrderEntity).countBy({ userId: second.id })).toBe(0);
    expect(order.totalAmount).toBe(24000);
  });

  it('creates, updates, lists, and soft-disables staff promotions', async () => {
    const code = `STAFF${randomUUID().replace(/-/g, '').slice(0, 7).toUpperCase()}`;
    promotionCodes.push(code);
    await expect(promotions.create({
      code,
      discountType: 'PERCENT',
      value: 101,
      minimumAmount: 0,
    })).rejects.toThrow('Phần trăm giảm giá không thể lớn hơn 100');
    await expect(promotions.create({
      code,
      discountType: 'PERCENT',
      value: 15,
      minimumAmount: 10000,
      usageLimit: 10,
    })).resolves.toMatchObject({
      code,
      discountType: 'PERCENT',
      value: 15,
      usageCount: 0,
      isActive: true,
    });

    await expect(promotions.update(code, { minimumAmount: 20000 }))
      .resolves.toMatchObject({ minimumAmount: 20000 });
    await expect(promotions.findAllForStaff()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ code, minimumAmount: 20000 })]),
    );
    await promotions.deactivate(code);
    await expect(promotions.findAvailable()).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code })]),
    );
    await expect(promotions.findAllForStaff()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ code, isActive: false })]),
    );
  });

  it('applies a valid promotion and persists discount and payable total', async () => {
    const user = await createUser();
    const order = await createOrder(user.id, 'BREW10');

    expect(order).toMatchObject({
      status: 'PENDING',
      subtotalAmount: 25000,
      discountAmount: 2500,
      promotionCode: 'BREW10',
      totalAmount: 22500,
    });
    const stored = await dataSource.getRepository(OrderEntity).findOneByOrFail({ id: order.id });
    expect(stored.discountAmount).toBe(2500);
    expect(stored.totalAmount).toBe(22500);
  });

  it('rejects invalid promotion codes and rolls back reserved inventory', async () => {
    const user = await createUser();
    await expect(createOrder(user.id, 'NOTREAL'))
      .rejects.toThrow('Mã khuyến mãi không hợp lệ');
    const inventory = await dataSource.getRepository(ProductInventoryEntity)
      .findOneByOrFail({ productId: 1 });
    expect(inventory.stock).toBe(1);
    expect(await dataSource.getRepository(OrderEntity).countBy({ userId: user.id })).toBe(0);
  });

  it('allows only one concurrent order when stock is one', async () => {
    const first = await createUser();
    const second = await createUser();
    const outcomes = await Promise.allSettled([
      createOrder(first.id),
      createOrder(second.id),
    ]);

    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const inventory = await dataSource.getRepository(ProductInventoryEntity)
      .findOneByOrFail({ productId: 1 });
    expect(inventory.stock).toBe(0);
    const [{ count }] = await dataSource.query(
      'SELECT count(*)::integer AS count FROM "orders" WHERE "user_id" = ANY($1::uuid[])',
      [[first.id, second.id]],
    ) as { count: number }[];
    expect(count).toBe(1);
  });

  it('releases reserved stock once when an owner cancels an unpaid order', async () => {
    const user = await createUser();
    const order = await createOrder(user.id);
    await orders.cancelForUser(order.id, user.id);
    await expect(orders.cancelForUser(order.id, user.id))
      .rejects.toBeInstanceOf(ConflictException);

    const inventory = await dataSource.getRepository(ProductInventoryEntity)
      .findOneByOrFail({ productId: 1 });
    expect(inventory.stock).toBe(1);
    expect((await dataSource.getRepository(OrderEntity).findOneByOrFail({
      id: order.id,
    })).status).toBe('CANCELLED');
  });

  it('consumes recipe ingredients with an order and restores them once on staff cancellation', async () => {
    const user = await createUser();
    const coffeeBeans = await dataSource.getRepository(IngredientEntity)
      .findOneByOrFail({ code: 'COFFEE_BEANS' });
    const milk = await dataSource.getRepository(IngredientEntity)
      .findOneByOrFail({ code: 'FRESH_MILK' });
    const order = await createOrder(user.id);
    expect((await dataSource.getRepository(IngredientEntity)
      .findOneByOrFail({ id: coffeeBeans.id })).stock).toBe(coffeeBeans.stock - 18);
    expect((await dataSource.getRepository(IngredientEntity)
      .findOneByOrFail({ id: milk.id })).stock).toBe(milk.stock - 120);
    expect(await dataSource.getRepository(OrderIngredientConsumptionEntity).countBy({
      orderId: order.id,
    })).toBe(2);

    await orders.changeStatusByStaff(order.id, 'CANCELLED');
    await expect(orders.changeStatusByStaff(order.id, 'CANCELLED'))
      .rejects.toBeInstanceOf(ConflictException);
    expect((await dataSource.getRepository(IngredientEntity)
      .findOneByOrFail({ id: coffeeBeans.id })).stock).toBe(coffeeBeans.stock);
    expect((await dataSource.getRepository(IngredientEntity)
      .findOneByOrFail({ id: milk.id })).stock).toBe(milk.stock);
    await expect(orders.findStaffQueue({
      page: 1,
      limit: 20,
      status: 'CANCELLED',
    })).resolves.toMatchObject({
      items: [expect.objectContaining({ id: order.id, status: 'CANCELLED' })],
    });
  });

  it('does not oversell an ingredient when two orders race', async () => {
    const first = await createUser();
    const second = await createUser();
    await dataSource.query(
      'UPDATE "product_inventory" SET "stock" = 100, "version" = "version" + 1 WHERE "product_id" = 1',
    );
    const coffee = await dataSource.getRepository(IngredientEntity)
      .findOneByOrFail({ code: 'COFFEE_BEANS' });
    await dataSource.getRepository(IngredientEntity).update(
      { id: coffee.id },
      { stock: 18, version: coffee.version + 1 },
    );

    const outcomes = await Promise.allSettled([
      createOrder(first.id),
      createOrder(second.id),
    ]);

    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect((await dataSource.getRepository(IngredientEntity)
      .findOneByOrFail({ id: coffee.id })).stock).toBe(0);
    expect(await dataSource.getRepository(OrderEntity).countBy({
      userId: In([first.id, second.id]),
    })).toBe(1);
  });

  it('rejects orders for products without a configured ingredient recipe', async () => {
    const user = await createUser();
    const savedRecipe = await dataSource.getRepository(IngredientRecipeEntity)
      .findBy({ productId: 1 });
    await ingredients.replaceRecipe(1, []);
    try {
      await expect(createOrder(user.id)).rejects.toThrow('Chưa cấu hình công thức nguyên liệu');
      expect(await dataSource.getRepository(OrderEntity).countBy({ userId: user.id })).toBe(0);
      expect((await dataSource.getRepository(ProductInventoryEntity)
        .findOneByOrFail({ productId: 1 })).stock).toBe(1);
    } finally {
      await ingredients.replaceRecipe(1, savedRecipe.map((line) => ({
        ingredientId: line.ingredientId,
        quantityRequired: line.quantityRequired,
      })));
    }
  });

  it('audits staff stock adjustments and validates ingredient metadata updates', async () => {
    const staff = await createUser('STAFF');
    const coffee = await dataSource.getRepository(IngredientEntity)
      .findOneByOrFail({ code: 'COFFEE_BEANS' });
    const updated = await ingredients.update(coffee.id, {
      name: 'Hạt cà phê rang',
      warningThreshold: 700,
    });
    expect(updated).toMatchObject({
      name: 'Hạt cà phê rang',
      warningThreshold: 700,
    });

    await ingredients.adjustStock(coffee.id, 125, 'Nhập hàng kiểm thử', staff.id);
    const refreshed = await dataSource.getRepository(IngredientEntity)
      .findOneByOrFail({ id: coffee.id });
    expect(refreshed.stock).toBe(coffee.stock + 125);
    await expect(ingredients.listAdjustments(coffee.id)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({
        delta: 125,
        reason: 'Nhập hàng kiểm thử',
        staffEmail: staff.email,
      })]),
    );
    await expect(ingredients.adjustStock(coffee.id, -(refreshed.stock + 1), 'Không hợp lệ', staff.id))
      .rejects.toThrow();
    expect((await dataSource.getRepository(IngredientEntity)
      .findOneByOrFail({ id: coffee.id })).stock).toBe(refreshed.stock);
  });

  it('keeps completed and cancelled orders available in their staff history filters', async () => {
    const user = await createUser();
    await dataSource.query(
      'UPDATE "product_inventory" SET "stock" = 10, "version" = "version" + 1 WHERE "product_id" = 1',
    );
    const completed = await createOrder(user.id);
    await payments.pay(
      { orderId: completed.id, method: PaymentMethod.CARD },
      user.id,
      'completed-history-payment',
    );
    await orders.changeStatusByStaff(completed.id, 'PREPARING');
    await orders.changeStatusByStaff(completed.id, 'READY');
    await orders.changeStatusByStaff(completed.id, 'COMPLETED');

    const cancelled = await createOrder(user.id);
    await orders.changeStatusByStaff(cancelled.id, 'CANCELLED');

    await expect(orders.findStaffQueue({ page: 1, limit: 20, status: 'COMPLETED' }))
      .resolves.toMatchObject({ items: [expect.objectContaining({ id: completed.id })] });
    await expect(orders.findStaffQueue({ page: 1, limit: 20, status: 'CANCELLED' }))
      .resolves.toMatchObject({ items: [expect.objectContaining({ id: cancelled.id })] });
    expect(await dataSource.getRepository(OrderEntity).countBy({
      id: In([completed.id, cancelled.id]),
    })).toBe(2);
  });

  it('serializes duplicate payment keys and advances persisted status once', async () => {
    const user = await createUser();
    const order = await createOrder(user.id);
    const dto = { orderId: order.id, method: PaymentMethod.WALLET };

    const results = await Promise.all([
      payments.pay(dto, user.id, 'concurrent-payment-01'),
      payments.pay(dto, user.id, 'concurrent-payment-01'),
    ]);
    expect(results[0].paymentId).toBe(results[1].paymentId);
    expect(await dataSource.getRepository(PaymentEntity).countBy({
      userId: user.id,
      idempotencyKey: 'concurrent-payment-01',
    })).toBe(1);
    const storedOrder = await dataSource.getRepository(OrderEntity).findOneByOrFail({
      id: order.id,
    });
    const storedUser = await dataSource.getRepository(UserEntity).findOneByOrFail({
      id: user.id,
    });
    expect(storedOrder.status).toBe('PAID');
    expect(storedOrder.loyaltyPointsAwarded).toBe(25);
    expect(storedUser.loyaltyPoints).toBe(25);

    await orders.changeStatusByStaff(order.id, 'PREPARING');
    await orders.changeStatusByStaff(order.id, 'READY');
    await orders.changeStatusByStaff(order.id, 'COMPLETED');
    await expect(orders.changeStatusByStaff(order.id, 'READY'))
      .rejects.toBeInstanceOf(ConflictException);
    expect((await dataSource.getRepository(OrderEntity).findOneByOrFail({ id: order.id })).status)
      .toBe('COMPLETED');
  });

  it('filters and paginates the newest staff queue and reports live status counts', async () => {
    const user = await createUser();
    const order = await createOrder(user.id);
    await payments.pay(
      { orderId: order.id, method: PaymentMethod.CARD },
      user.id,
      'staff-queue-payment-01',
    );

    await expect(orders.findStaffQueue({
      page: 1,
      limit: 1,
      status: 'PAID',
      search: order.id.slice(0, 8),
    })).resolves.toMatchObject({
      total: 1,
      page: 1,
      limit: 1,
      items: [expect.objectContaining({ id: order.id, status: 'PAID' })],
    });
    await expect(orders.getStaffSummary()).resolves.toMatchObject({
      pending: 1,
      preparing: 0,
      ready: 0,
    });

    await orders.changeStatusByStaff(order.id, 'PREPARING');
    await orders.changeStatusByStaff(order.id, 'READY');
    await expect(orders.getStaffSummary()).resolves.toMatchObject({
      pending: 0,
      preparing: 0,
      ready: 1,
    });
  });

  it('rejects changed payload for a used key and never awards points on failure', async () => {
    const user = await createUser();
    const order = await createOrder(user.id);
    const key = 'payload-payment-01';
    await payments.pay({ orderId: order.id, method: PaymentMethod.WALLET }, user.id, key);
    await expect(payments.pay({ orderId: order.id, method: PaymentMethod.CARD }, user.id, key))
      .rejects.toBeInstanceOf(ConflictException);

    const failedOrder = await orders.create({
      items: [{ productId: 2, size: 'S', toppings: [], quantity: 1 }],
    }, user.id);
    const result = await failingPayments.pay(
      { orderId: failedOrder.id, method: PaymentMethod.WALLET, simulateFailure: true },
      user.id,
      'failure-payment-01',
    );
    expect(result.orderStatus).toBe('PAYMENT_FAILED');
    const storedUser = await dataSource.getRepository(UserEntity).findOneByOrFail({
      id: user.id,
    });
    expect(storedUser.loyaltyPoints).toBe(25);
    expect((await dataSource.getRepository(OrderEntity).findOneByOrFail({
      id: failedOrder.id,
    })).status).toBe('PAYMENT_FAILED');
  });
});
