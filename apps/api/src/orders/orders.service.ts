import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { PaymentEntity } from '../payments/payment.entity';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order-item.dto';
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
  ) {}

  async create(dto: CreateOrderDto, userId: string) {
    const items = this.priceOrderItems(dto.items);
    const totalAmount = items.reduce((total, item) => total + item.lineTotal, 0);

    if (
      !Number.isSafeInteger(totalAmount) ||
      totalAmount < 0 ||
      totalAmount > MAX_DATABASE_INTEGER
    ) {
      throw new BadRequestException('Tổng tiền đơn hàng vượt quá giới hạn');
    }

    const order = await this.dataSource.transaction(async (manager) => {
      const savedOrder = await manager.save(OrderEntity, {
        status: 'PENDING',
        totalAmount,
        userId,
      });

      const savedItems = await manager.save(
        OrderItemEntity,
        items.map((item) => ({
          ...item,
          orderId: savedOrder.id,
        })),
      );

      savedOrder.items = savedItems;
      return savedOrder;
    });

    return {
      id: order.id,
      orderCode: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
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

  async findMine(userId: string) {
    const orders = await this.dataSource.manager.find(OrderEntity, {
      where: { userId },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });

    return this.withLatestPayments(orders);
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
        id: order.id,
        orderCode: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        items: (order.items ?? []).map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          size: item.size,
          toppings: item.toppings,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
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

  private priceOrderItems(requestItems: CreateOrderItemDto[]): PricedOrderItem[] {
    const pricedItems = requestItems.map((item) => {
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

    return pricedItems;
  }
}
