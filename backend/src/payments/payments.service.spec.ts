import 'reflect-metadata';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { DataSource, EntityManager } from 'typeorm';
import { OrderEntity } from '../orders/entities/order.entity';
import { UserEntity } from '../users/user.entity';
import { CreatePaymentDto } from './create-payment.dto';
import { PaymentEntity, PaymentMethod } from './payment.entity';
import { PaymentsService } from './payments.service';
import { MockPaymentProvider } from './mock-payment.provider';

describe('PaymentsService', () => {
  const userId = 'user-id';
  const orderId = 'order-id';
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  let order: OrderEntity;
  let user: UserEntity;
  let previousPayment: PaymentEntity | null;
  let findOne: jest.Mock;
  let save: jest.Mock;
  let transaction: jest.Mock;
  let service: PaymentsService;

  function createService(demoEnabled = false) {
    const config = {
      get: jest.fn(() => demoEnabled ? 'true' : 'false'),
    } as unknown as ConfigService;
    return new PaymentsService(
      { transaction } as unknown as DataSource,
      config,
      new MockPaymentProvider(),
    );
  }

  beforeEach(() => {
    order = Object.assign(new OrderEntity(), {
      id: orderId,
      userId,
      status: 'PENDING',
      totalAmount: 75000,
      discountAmount: 0,
      loyaltyPointsAwarded: 0,
      createdAt,
    });
    user = Object.assign(new UserEntity(), {
      id: userId,
      email: 'member@example.invalid',
      loyaltyPoints: 0,
      role: 'CUSTOMER',
    });
    previousPayment = null;
    findOne = jest.fn().mockImplementation(async (target) => {
      if (target === UserEntity) return user;
      if (target === PaymentEntity) return previousPayment;
      if (target === OrderEntity) return order;
      return null;
    });
    save = jest.fn().mockImplementation(async (target, values) => {
      if (target === PaymentEntity) {
        const payment = Object.assign(new PaymentEntity(), values, {
          id: 'payment-id',
          createdAt,
        });
        if (payment.resultSnapshot) previousPayment = payment;
        return payment;
      }
      return values;
    });
    const manager = { findOne, save } as unknown as EntityManager;
    transaction = jest.fn(
      async (work: (manager: EntityManager) => Promise<unknown>) => work(manager),
    );
    service = createService();
  });

  const dto: CreatePaymentDto = {
    orderId,
    method: PaymentMethod.WALLET,
  };
  const key = 'payment-demo-001';

  it('uses the server total, transitions to PAID, and awards points transactionally', async () => {
    const result = await service.pay({
      orderId,
      method: PaymentMethod.CARD,
    }, userId, key);

    expect(result).toMatchObject({
      paymentId: 'payment-id',
      orderId,
      status: 'SUCCESS',
      orderStatus: 'PAID',
      amount: 75000,
      loyaltyPoints: 75,
      pointsEarned: 75,
    });
    expect(order.status).toBe('PAID');
    expect(order.loyaltyPointsAwarded).toBe(75);
    expect(user.loyaltyPoints).toBe(75);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(PaymentEntity, expect.objectContaining({
      idempotencyKey: key,
      amount: 75000,
    }));
  });

  it('returns the saved response for a repeated key without changing points again', async () => {
    const first = await service.pay(dto, userId, key);
    const saveCount = save.mock.calls.length;
    const repeated = await service.pay(dto, userId, key);

    expect(repeated).toEqual(first);
    expect(save).toHaveBeenCalledTimes(saveCount);
    expect(user.loyaltyPoints).toBe(75);
  });

  it('rejects reusing a key with a different payload', async () => {
    await service.pay(dto, userId, key);

    await expect(service.pay({
      orderId,
      method: PaymentMethod.CARD,
    }, userId, key)).rejects.toBeInstanceOf(ConflictException);
    expect(user.loyaltyPoints).toBe(75);
  });

  it('requires an idempotency key', async () => {
    await expect(service.pay(dto, userId, undefined))
      .rejects.toThrow('Idempotency-Key');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects a simulated failure when demo controls are disabled', async () => {
    await expect(service.pay({
      orderId: dto.orderId,
      method: dto.method,
      simulateFailure: true,
    }, userId, key)).rejects.toThrow('Giả lập thất bại đang bị tắt');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('treats a changed demo outcome as a different payload for an idempotency key', async () => {
    service = createService(true);
    await service.pay(dto, userId, key);
    await expect(service.pay({
      orderId: dto.orderId,
      method: dto.method,
      simulateFailure: true,
    }, userId, key)).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not award points for a failed payment and permits a retry with a new key', async () => {
    service = createService(true);
    await expect(service.pay({
      orderId: dto.orderId,
      method: dto.method,
      simulateFailure: true,
    }, userId, key)).resolves.toMatchObject({
      status: 'FAILED',
      orderStatus: 'PAYMENT_FAILED',
      pointsEarned: 0,
    });
    expect(user.loyaltyPoints).toBe(0);

    previousPayment = null;
    service = createService();
    await expect(service.pay(dto, userId, 'payment-demo-002')).resolves.toMatchObject({
      status: 'SUCCESS',
      orderStatus: 'PAID',
    });
    expect(user.loyaltyPoints).toBe(75);
  });

  it('hides an order owned by another user', async () => {
    findOne.mockImplementation(async (target) => {
      if (target === UserEntity) return user;
      if (target === PaymentEntity) return null;
      if (target === OrderEntity) return null;
      return null;
    });

    await expect(service.pay(dto, userId, key)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects unsupported transitions', async () => {
    order.status = 'CANCELLED';

    await expect(service.pay(dto, userId, key)).rejects.toBeInstanceOf(ConflictException);
    expect(save).not.toHaveBeenCalled();
  });
});
