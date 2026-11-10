import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';
import { assertTransition } from '../orders/order-state';
import { OrderEntity } from '../orders/entities/order.entity';
import { CreatePaymentDto } from './create-payment.dto';
import { PaymentEntity, PaymentStatus } from './payment.entity';
import { UserEntity } from '../users/user.entity';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider';

@Injectable()
export class PaymentsService {
  private readonly demoEnabled: boolean;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    config: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {
    this.demoEnabled = config.get<string>('PAYMENT_DEMO_ENABLED') === 'true';
  }

  getConfig() {
    return { provider: this.provider.name, demoFailureEnabled: this.demoEnabled };
  }

  async pay(dto: CreatePaymentDto, userId: string, idempotencyKey: string | undefined) {
    if (!idempotencyKey || !/^[\x21-\x7E]{8,128}$/.test(idempotencyKey)) {
      throw new BadRequestException('Idempotency-Key là bắt buộc và phải dài 8–128 ký tự');
    }
    if (dto.simulateFailure && !this.demoEnabled) {
      throw new BadRequestException('Giả lập thất bại đang bị tắt');
    }
    const requestHash = createHash('sha256')
      .update(JSON.stringify({
        orderId: dto.orderId,
        method: dto.method,
        ...(dto.simulateFailure === true ? { simulateFailure: true } : {}),
      }))
      .digest('hex');

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(UserEntity, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

      const previous = await manager.findOne(PaymentEntity, {
        where: { userId, idempotencyKey },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) {
          throw new ConflictException('Idempotency-Key đã được dùng cho yêu cầu khác');
        }
        if (previous.resultSnapshot) return previous.resultSnapshot;
        throw new ConflictException('Không tìm thấy kết quả đã lưu cho yêu cầu này');
      }

      const order = await manager.findOne(OrderEntity, {
        where: { id: dto.orderId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

      const previousStatus = order.status;
      if (previousStatus === 'PAYMENT_FAILED') {
        assertTransition(previousStatus, 'PENDING');
      } else if (previousStatus !== 'PENDING') {
        assertTransition(previousStatus, 'PAID');
      }

      const providerResult = await this.provider.process({
        orderId: order.id,
        amount: order.totalAmount,
        method: dto.method,
        simulateFailure: dto.simulateFailure === true,
      });
      const status = providerResult.status;
      const orderStatus = status === PaymentStatus.SUCCESS ? 'PAID' : 'PAYMENT_FAILED';
      assertTransition('PENDING', orderStatus);

      const payment = await manager.save(PaymentEntity, {
        userId,
        orderId: order.id,
        idempotencyKey,
        requestHash,
        method: dto.method,
        status,
        amount: order.totalAmount,
      });

      order.status = orderStatus;
      if (status === PaymentStatus.SUCCESS) {
        if (order.loyaltyPointsAwarded !== 0) {
          throw new ConflictException('Điểm thưởng của đơn hàng đã được cộng');
        }
        const points = Math.floor(order.totalAmount / 1000);
        if (!Number.isSafeInteger(user.loyaltyPoints + points) ||
            user.loyaltyPoints + points > 2_147_483_647) {
          throw new ConflictException('Số điểm thành viên vượt giới hạn');
        }
        user.loyaltyPoints += points;
        order.loyaltyPointsAwarded = points;
        await manager.save(UserEntity, user);
      }
      await manager.save(OrderEntity, order);

      const result = {
        paymentId: payment.id,
        orderId: order.id,
        method: payment.method,
        status: payment.status,
        orderStatus,
        amount: payment.amount,
        loyaltyPoints: user.loyaltyPoints,
        pointsEarned: order.loyaltyPointsAwarded,
        message: providerResult.message,
        provider: this.provider.name,
        qrPayload: providerResult.qrPayload,
        createdAt: payment.createdAt,
      };
      payment.resultSnapshot = result;
      await manager.save(PaymentEntity, payment);
      return result;
    });
  }
}
