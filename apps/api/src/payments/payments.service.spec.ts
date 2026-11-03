import 'reflect-metadata';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { DataSource, EntityManager } from 'typeorm';
import { OrderEntity } from '../orders/entities/order.entity';
import { CreatePaymentDto } from './create-payment.dto';
import { PaymentEntity, PaymentMethod } from './payment.entity';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const userId = 'user-id';
  const orderId = 'order-id';
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  let order: OrderEntity;
  let findOne: jest.Mock;
  let save: jest.Mock;
  let transaction: jest.Mock;
  let service: PaymentsService;

  function createService(mode: 'SUCCESS' | 'FAIL' = 'SUCCESS') {
    const config = {
      get: jest.fn().mockReturnValue(mode),
    } as unknown as ConfigService;
    const dataSource = { transaction } as unknown as DataSource;
    return new PaymentsService(dataSource, config);
  }

  beforeEach(() => {
    order = Object.assign(new OrderEntity(), {
      id: orderId,
      userId,
      status: 'PENDING',
      totalAmount: 75000,
      createdAt,
    });
    findOne = jest.fn().mockImplementation(async () => order);
    save = jest.fn().mockImplementation(async (target, values) => {
      if (target === PaymentEntity) {
        return Object.assign(new PaymentEntity(), values, {
          id: 'payment-id',
          createdAt,
        });
      }
      return values;
    });
    const manager = { findOne, save } as unknown as EntityManager;
    transaction = jest.fn(
      async (work: (manager: EntityManager) => Promise<unknown>) => work(manager),
    );
    service = createService();
  });

  it.each([
    [PaymentMethod.WALLET],
    [PaymentMethod.CARD],
  ])('marks a %s payment PAID using the stored order amount', async (method) => {
    const dto = { orderId, method } as CreatePaymentDto & { amount: number };
    dto.amount = 1;

    await expect(service.pay(dto, userId)).resolves.toMatchObject({
      paymentId: 'payment-id',
      orderId,
      method,
      status: 'SUCCESS',
      orderStatus: 'PAID',
      amount: 75000,
      message: 'Thanh toán giả lập thành công',
      createdAt,
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith(OrderEntity, {
      where: { id: orderId },
      lock: { mode: 'pessimistic_write' },
    });
    expect(save).toHaveBeenNthCalledWith(1, PaymentEntity, {
      orderId,
      method,
      status: 'SUCCESS',
      amount: 75000,
    });
    expect(order.status).toBe('PAID');
  });

  it('records a deterministic mock failure and marks the order PAYMENT_FAILED', async () => {
    service = createService('FAIL');

    await expect(service.pay({
      orderId,
      method: PaymentMethod.CARD,
    }, userId)).resolves.toMatchObject({
      status: 'FAILED',
      orderStatus: 'PAYMENT_FAILED',
      amount: 75000,
      message: 'Thanh toán giả lập thất bại',
    });
    expect(order.status).toBe('PAYMENT_FAILED');
    expect(save).toHaveBeenNthCalledWith(1, PaymentEntity, expect.objectContaining({
      status: 'FAILED',
      amount: 75000,
    }));
  });

  it('hides an order owned by another user', async () => {
    await expect(service.pay({
      orderId,
      method: PaymentMethod.WALLET,
    }, 'another-user')).rejects.toBeInstanceOf(NotFoundException);
    expect(save).not.toHaveBeenCalled();
  });

  it('returns 404 when the order does not exist', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.pay({
      orderId,
      method: PaymentMethod.WALLET,
    }, userId)).rejects.toBeInstanceOf(NotFoundException);
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects already-paid orders and does not create another payment', async () => {
    order.status = 'PAID';

    await expect(service.pay({
      orderId,
      method: PaymentMethod.CARD,
    }, userId)).rejects.toBeInstanceOf(ConflictException);
    expect(save).not.toHaveBeenCalled();
  });

  it('allows a failed order to retry without creating another order', async () => {
    order.status = 'PAYMENT_FAILED';

    await service.pay({
      orderId,
      method: PaymentMethod.WALLET,
    }, userId);

    expect(save).toHaveBeenCalledWith(PaymentEntity, expect.objectContaining({
      orderId,
      status: 'SUCCESS',
    }));
    expect(order.id).toBe(orderId);
    expect(order.status).toBe('PAID');
  });

  it('rejects unsupported order states', async () => {
    order.status = 'CANCELLED';

    await expect(service.pay({
      orderId,
      method: PaymentMethod.CARD,
    }, userId)).rejects.toBeInstanceOf(ConflictException);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not continue if a database write fails inside the transaction', async () => {
    save.mockRejectedValueOnce(new Error('database write failed'));

    await expect(service.pay({
      orderId,
      method: PaymentMethod.WALLET,
    }, userId)).rejects.toThrow('database write failed');
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
