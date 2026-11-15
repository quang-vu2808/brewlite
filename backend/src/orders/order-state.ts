import { ConflictException } from '@nestjs/common';

export const ORDER_STATUSES = [
  'PENDING',
  'PAYMENT_FAILED',
  'PAID',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_FAILED: ['PENDING', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function assertTransition(
  currentStatus: string,
  nextStatus: OrderStatus,
): asserts currentStatus is OrderStatus {
  if (
    !ORDER_STATUSES.includes(currentStatus as OrderStatus) ||
    !ALLOWED_TRANSITIONS[currentStatus as OrderStatus].includes(nextStatus)
  ) {
    throw new ConflictException(
      `Không thể chuyển trạng thái đơn từ ${currentStatus} sang ${nextStatus}`,
    );
  }
}
