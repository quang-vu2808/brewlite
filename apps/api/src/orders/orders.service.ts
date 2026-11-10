import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { PaymentEntity } from '../payments/payment.entity';
import { PromotionEntity } from '../promotions/promotion.entity';
import { UserEntity } from '../users/user.entity';
import { IngredientsService } from '../ingredients/ingredients.service';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order-item.dto';
import { assertTransition, type OrderStatus } from './order-state';
import { InventoryService } from './inventory.service';
import { OrderEntity } from './entities/order.entity';
import {
  OrderItemEntity,
  type OrderToppingSnapshot,
} from './entities/order-item.entity';

const SIZE_SURCHARGES = {
  S: 0,
  M: 5000,
  L: 10000,
} as const;

const TOPPING_CATALOG: Record<string, OrderToppingSnapshot> = {
  pearls: { id: 'pearls', name: 'Trân châu', surcharge: 5000 },
  'cheese-foam': { id: 'cheese-foam', name: 'Kem cheese', surcharge: 10000 },
  espresso: { id: 'espresso', name: 'Shot espresso', surcharge: 8000 },
};

const MAX_DATABASE_INTEGER = 2_147_483_647;
export const LOYALTY_POINT_REDEMPTION_VND = 100;

type PricedOrderItem = {
  productId: number;
  productName: string;
  size: CreateOrderItemDto['size'];
  toppings: OrderToppingSnapshot[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly productsService: ProductsService,
    @Inject(InventoryService)
    private readonly inventory: Pick<InventoryService, 'reserve' | 'release'>,
    @Inject(IngredientsService)
    private readonly ingredients: Pick<
      IngredientsService,
      'reserveForOrder' | 'saveOrderConsumption' | 'releaseOrderConsumption'
    >,
  ) {}

  async create(dto: CreateOrderDto, userId: string) {
    const items = this.priceOrderItems(dto.items);
    const subtotalAmount = items.reduce((total, item) => total + item.lineTotal, 0);

    this.assertValidSubtotal(subtotalAmount);

    let loyaltyPoints: number | undefined;
    const order = await this.dataSource.transaction(async (manager) => {
      const user = dto.redeemPoints
        ? await manager.findOne(UserEntity, {
          where: { id: userId },
          lock: { mode: 'pessimistic_write' },
        })
        : null;
      if (dto.redeemPoints && !user) throw new NotFoundException('Không tìm thấy tài khoản');

      const quantities = new Map<number, number>();
      for (const item of items) {
        quantities.set(
          item.productId,
          (quantities.get(item.productId) ?? 0) + item.quantity,
        );
      }
      for (const [productId, quantity] of quantities) {
        await this.inventory.reserve(manager, productId, quantity);
      }
      const ingredientConsumptions = await this.ingredients.reserveForOrder(
        manager,
        quantities,
      );

      const promotionCode = dto.promoCode?.trim().toUpperCase() ?? null;
      const promotion = promotionCode
        ? await this.reservePromotion(manager, promotionCode, subtotalAmount)
        : null;
      const discountAmount = promotion?.discount ?? 0;
      const afterPromotion = subtotalAmount - discountAmount;
      const redeemPoints = dto.redeemPoints ?? 0;
      const loyaltyDiscountAmount = redeemPoints * LOYALTY_POINT_REDEMPTION_VND;
      if (redeemPoints > 0) {
        if (!user || redeemPoints > user.loyaltyPoints) {
          throw new BadRequestException('Số điểm thành viên không đủ');
        }
        if (loyaltyDiscountAmount > afterPromotion) {
          throw new BadRequestException('Điểm đổi vượt quá giá trị đơn hàng sau khuyến mãi');
        }
        user.loyaltyPoints -= redeemPoints;
        await manager.save(UserEntity, user);
        loyaltyPoints = user.loyaltyPoints;
      }
      const totalAmount = afterPromotion - loyaltyDiscountAmount;

      const savedOrder = await manager.save(OrderEntity, {
        status: 'PENDING',
        totalAmount,
        subtotalAmount,
        discountAmount,
        loyaltyDiscountAmount,
        redeemedPoints: redeemPoints,
        promotionCode,
        loyaltyPointsAwarded: 0,
        inventoryReleasedAt: null,
        promotionUsageReleasedAt: null,
        userId,
      });

      const savedItems = await manager.save(
        OrderItemEntity,
        items.map((item) => ({
          ...item,
          orderId: savedOrder.id,
        })),
      );
      await this.ingredients.saveOrderConsumption(
        manager,
        savedOrder.id,
        ingredientConsumptions,
      );

      savedOrder.items = savedItems;
      if (promotion) {
        promotion.entity.usageCount += 1;
        await manager.save(PromotionEntity, promotion.entity);
      }
      return savedOrder;
    });

    return this.orderResponse(order, undefined, loyaltyPoints);
  }

  async preview(dto: CreateOrderDto, userId: string) {
    const items = this.priceOrderItems(dto.items);
    const subtotalAmount = items.reduce((total, item) => total + item.lineTotal, 0);
    this.assertValidSubtotal(subtotalAmount);

    const promotionCode = dto.promoCode?.trim().toUpperCase() ?? null;
    const promotion = promotionCode
      ? await this.dataSource.manager.findOne(PromotionEntity, {
        where: { code: promotionCode, isActive: true },
      })
      : null;
    if (promotionCode && !promotion) {
      throw new BadRequestException('Mã khuyến mãi không hợp lệ hoặc đã hết hạn');
    }
    const discountAmount = promotion
      ? this.calculatePromotionDiscount(promotion, subtotalAmount)
      : 0;
    const redeemedPoints = dto.redeemPoints ?? 0;
    const user = redeemedPoints > 0
      ? await this.dataSource.manager.findOne(UserEntity, { where: { id: userId } })
      : null;
    if (redeemedPoints > 0 && !user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }
    if (user && redeemedPoints > user.loyaltyPoints) {
      throw new BadRequestException('Số điểm thành viên không đủ');
    }

    const loyaltyDiscountAmount = redeemedPoints * LOYALTY_POINT_REDEMPTION_VND;
    const afterPromotion = subtotalAmount - discountAmount;
    if (loyaltyDiscountAmount > afterPromotion) {
      throw new BadRequestException('Điểm đổi vượt quá giá trị đơn hàng sau khuyến mãi');
    }
    const totalAmount = afterPromotion - loyaltyDiscountAmount;
    if (!Number.isSafeInteger(totalAmount) || totalAmount < 0) {
      throw new BadRequestException('Tổng tiền đơn hàng không hợp lệ');
    }

    return {
      subtotalAmount,
      promoCode: promotionCode,
      discountAmount,
      redeemedPoints,
      loyaltyDiscountAmount,
      totalAmount,
      loyaltyPointsAvailable: user?.loyaltyPoints ?? null,
      projectedLoyaltyPoints: Math.floor(totalAmount / 1000),
    };
  }

  async findMine(userId: string) {
    const orders = await this.dataSource.manager.find(OrderEntity, {
      where: { userId },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });

    return this.withLatestPayments(orders);
  }

  async findStaffQueue(options: {
    page: number;
    limit: number;
    status?: OrderStatus;
    search?: string;
  }) {
    const activeStatuses: OrderStatus[] = ['PAID', 'PREPARING', 'READY'];
    const query = this.dataSource.manager.createQueryBuilder(OrderEntity, 'order')
      .leftJoinAndSelect('order.items', 'item');
    if (options.status) {
      query.where('order.status = :status', { status: options.status });
    } else {
      query.where('order.status IN (:...statuses)', { statuses: activeStatuses });
    }
    if (options.search?.trim()) {
      query.andWhere('CAST(order.id AS text) ILIKE :search', {
        search: `%${options.search.trim()}%`,
      });
    }
    const [orders, total] = await query
      .orderBy('order.createdAt', 'DESC')
      .skip((options.page - 1) * options.limit)
      .take(options.limit)
      .getManyAndCount();
    return {
      items: await this.withLatestPayments(orders),
      total,
      page: options.page,
      limit: options.limit,
    };
  }

  async getStaffSummary() {
    const rows = await this.dataSource.manager.createQueryBuilder(OrderEntity, 'order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.status IN (:...statuses)', { statuses: ['PAID', 'PREPARING', 'READY'] })
      .groupBy('order.status')
      .getRawMany<{ status: OrderStatus; count: string }>();
    const counts = { pending: 0, preparing: 0, ready: 0 };
    for (const row of rows) {
      if (row.status === 'PAID') counts.pending = Number(row.count);
      if (row.status === 'PREPARING') counts.preparing = Number(row.count);
      if (row.status === 'READY') counts.ready = Number(row.count);
    }
    return counts;
  }

  async findOneForUser(orderId: string, userId: string) {
    const order = await this.dataSource.manager.findOne(OrderEntity, {
      where: { id: orderId, userId },
      relations: { items: true },
    });

    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    const [result] = await this.withLatestPayments([order]);
    return result;
  }

  async cancelForUser(orderId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(OrderEntity, {
        where: { id: orderId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      return this.cancelOrderWithinTransaction(manager, order);
    });
  }

  async changeStatusByStaff(orderId: string, nextStatus: OrderStatus) {
    if (!['PREPARING', 'READY', 'COMPLETED', 'CANCELLED'].includes(nextStatus)) {
      throw new BadRequestException('Nhân viên chỉ được cập nhật trạng thái pha chế/bàn giao');
    }
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(OrderEntity, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      if (nextStatus === 'CANCELLED') {
        return this.cancelOrderWithinTransaction(manager, order);
      }
      assertTransition(order.status, nextStatus);
      order.status = nextStatus;
      await manager.save(OrderEntity, order);
      const items = await manager.find(OrderItemEntity, {
        where: { orderId: order.id },
      });
      return this.orderResponse(order, items);
    });
  }

  private async cancelOrderWithinTransaction(
    manager: import('typeorm').EntityManager,
    order: OrderEntity,
  ) {
    assertTransition(order.status, 'CANCELLED');
    const items = await manager.find(OrderItemEntity, {
      where: { orderId: order.id },
    });
    if (!order.inventoryReleasedAt) {
      const quantities = this.aggregateQuantities(items);
      for (const [productId, quantity] of quantities) {
        await this.inventory.release(manager, productId, quantity);
      }
      await this.ingredients.releaseOrderConsumption(manager, order.id);
      order.inventoryReleasedAt = new Date();
    }

    const pointsToRefund = order.redeemedPoints;
    const pointsToRevoke = order.status === 'PAID' ? order.loyaltyPointsAwarded : 0;
    let remainingPoints: number | undefined;
    if (pointsToRefund > 0 || pointsToRevoke > 0) {
      if (!order.userId) throw new ConflictException('Không thể hoàn điểm cho đơn hàng này');
      const user = await manager.findOne(UserEntity, {
        where: { id: order.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
      if (pointsToRevoke > user.loyaltyPoints) {
        throw new ConflictException('Không thể cân đối điểm thưởng khi hủy đơn');
      }
      user.loyaltyPoints = user.loyaltyPoints - pointsToRevoke + pointsToRefund;
      await manager.save(UserEntity, user);
      remainingPoints = user.loyaltyPoints;
      order.loyaltyPointsAwarded = 0;
    }

    if (order.promotionCode && !order.promotionUsageReleasedAt) {
      const promotion = await manager.findOne(PromotionEntity, {
        where: { code: order.promotionCode },
        lock: { mode: 'pessimistic_write' },
      });
      if (promotion && promotion.usageCount > 0) {
        promotion.usageCount -= 1;
        await manager.save(PromotionEntity, promotion);
      }
      order.promotionUsageReleasedAt = new Date();
    }

    order.status = 'CANCELLED';
    await manager.save(OrderEntity, order);
    return this.orderResponse(order, items, remainingPoints);
  }

  private async reservePromotion(
    manager: import('typeorm').EntityManager,
    code: string,
    subtotalAmount: number,
  ) {
    const promotion = await manager.findOne(PromotionEntity, {
      where: { code, isActive: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!promotion) throw new BadRequestException('Mã khuyến mãi không hợp lệ hoặc đã hết hạn');
    const discount = this.calculatePromotionDiscount(promotion, subtotalAmount);
    return { entity: promotion, discount };
  }

  private calculatePromotionDiscount(promotion: PromotionEntity, subtotalAmount: number) {
    const now = new Date();
    if ((promotion.startsAt && promotion.startsAt > now) ||
        (promotion.endsAt && promotion.endsAt <= now) ||
        (promotion.usageLimit !== null && promotion.usageCount >= promotion.usageLimit)) {
      throw new BadRequestException('Mã khuyến mãi không hợp lệ hoặc đã hết hạn');
    }
    if (subtotalAmount < promotion.minimumAmount) {
      throw new BadRequestException('Đơn hàng chưa đạt giá trị tối thiểu của mã khuyến mãi');
    }

    const calculated = promotion.discountType === 'PERCENT'
      ? Math.floor(subtotalAmount * promotion.value / 100)
      : promotion.value;
    const discount = promotion.maximumDiscount === null
      ? calculated
      : Math.min(calculated, promotion.maximumDiscount);
    if (!Number.isSafeInteger(discount) || discount <= 0 || discount > subtotalAmount) {
      throw new BadRequestException('Giá trị khuyến mãi không hợp lệ');
    }
    return discount;
  }

  private assertValidSubtotal(subtotalAmount: number) {
    if (
      !Number.isSafeInteger(subtotalAmount) ||
      subtotalAmount < 0 ||
      subtotalAmount > MAX_DATABASE_INTEGER
    ) {
      throw new BadRequestException('Tổng tiền đơn hàng vượt quá giới hạn');
    }
  }

  private async withLatestPayments(orders: OrderEntity[]) {
    if (orders.length === 0) return [];

    const orderIds = orders.map((order) => order.id);
    const payments = await this.dataSource.manager.find(PaymentEntity, {
      where: { orderId: In(orderIds) },
      order: { createdAt: 'DESC' },
    });
    const latestPayments = new Map<string, PaymentEntity>();
    for (const payment of payments) {
      if (!latestPayments.has(payment.orderId)) {
        latestPayments.set(payment.orderId, payment);
      }
    }

    return orders.map((order) => {
      const latestPayment = latestPayments.get(order.id);
      return {
        ...this.orderResponse(order),
        payment: latestPayment
          ? {
            id: latestPayment.id,
            method: latestPayment.method,
            status: latestPayment.status,
            amount: latestPayment.amount,
            createdAt: latestPayment.createdAt,
          }
          : null,
      };
    });
  }

  private orderResponse(
    order: OrderEntity,
    itemList: OrderItemEntity[] = order.items ?? [],
    loyaltyPoints?: number,
  ) {
    return {
      id: order.id,
      orderCode: order.id,
      status: order.status,
      subtotalAmount: order.subtotalAmount || order.totalAmount +
        (order.discountAmount ?? 0) + (order.loyaltyDiscountAmount ?? 0),
      discountAmount: order.discountAmount,
      loyaltyDiscountAmount: order.loyaltyDiscountAmount ?? 0,
      redeemedPoints: order.redeemedPoints ?? 0,
      loyaltyPointsAwarded: order.loyaltyPointsAwarded ?? 0,
      ...(loyaltyPoints !== undefined ? { loyaltyPoints } : {}),
      promotionCode: order.promotionCode,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      items: itemList.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        size: item.size,
        toppings: item.toppings,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    };
  }

  private priceOrderItems(requestItems: CreateOrderItemDto[]): PricedOrderItem[] {
    return requestItems.map((item) => {
      const product = this.productsService.findOne(item.productId);
      if (!product) {
        throw new NotFoundException(`Không tìm thấy sản phẩm ${item.productId}`);
      }

      const toppings = [...new Set(item.toppings ?? [])].map((id) => {
        const topping = Object.hasOwn(TOPPING_CATALOG, id) ? TOPPING_CATALOG[id] : undefined;
        if (!topping) throw new BadRequestException(`Topping không hợp lệ: ${id}`);
        return { ...topping };
      });
      const unitPrice = product.price +
        SIZE_SURCHARGES[item.size] +
        toppings.reduce((total, topping) => total + topping.surcharge, 0);
      const lineTotal = unitPrice * item.quantity;

      if (
        !Number.isSafeInteger(unitPrice) ||
        unitPrice < 0 ||
        !Number.isSafeInteger(lineTotal) ||
        lineTotal < 0 ||
        lineTotal > MAX_DATABASE_INTEGER
      ) {
        throw new BadRequestException('Giá sản phẩm không hợp lệ');
      }

      return {
        productId: product.id,
        productName: product.name,
        size: item.size,
        toppings,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });
  }

  private aggregateQuantities(items: OrderItemEntity[]) {
    const quantities = new Map<number, number>();
    for (const item of items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.quantity,
      );
    }
    return quantities;
  }
}
