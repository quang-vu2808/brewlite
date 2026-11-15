import { ConflictException } from '@nestjs/common';
import { assertTransition, type OrderStatus } from './order-state';

describe('Order state machine', () => {
  it.each([
    ['PENDING', 'PAID'],
    ['PENDING', 'PAYMENT_FAILED'],
    ['PENDING', 'CANCELLED'],
    ['PAYMENT_FAILED', 'PENDING'],
    ['PAYMENT_FAILED', 'CANCELLED'],
    ['PAID', 'PREPARING'],
    ['PAID', 'CANCELLED'],
    ['PREPARING', 'READY'],
    ['READY', 'COMPLETED'],
  ] as [OrderStatus, OrderStatus][])('allows %s -> %s', (current, next) => {
    expect(() => assertTransition(current, next)).not.toThrow();
  });

  it.each([
    ['PENDING', 'COMPLETED'],
    ['PAID', 'PENDING'],
    ['PREPARING', 'PAID'],
    ['COMPLETED', 'PREPARING'],
    ['CANCELLED', 'PENDING'],
  ] as [OrderStatus, OrderStatus][])('rejects %s -> %s', (current, next) => {
    expect(() => assertTransition(current, next)).toThrow(ConflictException);
  });
});
