import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OrderEntity } from '../orders/entities/order.entity';
import { CreatePaymentDto } from './create-payment.dto';
import {
  PaymentEntity,
  PaymentStatus,
} from './payment.entity';

type MockPaymentMode = 'SUCCESS' | 'FAIL';

@Injectable()
export class PaymentsService {
  private readonly mockMode: MockPaymentMode;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    config: ConfigService,
  ) {
    const mode = (config.get<string>('MOCK_PAYMENT_MODE') ?? 'SUCCESS').toUpperCase();
    if (mode !== 'SUCCESS' && mode !== 'FAIL') {
      throw new Error('MOCK_PAYMENT_MODE chỉ nhận SUCCESS hoặc FAIL');
    }
    this.mockMode = mode;
  }

  async pay(dto: CreatePaymentDto, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(OrderEntity, {
        where: { id: dto.orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order || order.userId !== userId) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      if (order.status === 'PAID') {
        throw new ConflictException('Đơn hàng đã được thanh toán');
      }

      if (order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED') {
        throw new ConflictException('Trạng thái đơn hàng không cho phép thanh toán');
      }

      const status = this.mockMode === 'SUCCESS'
        ? PaymentStatus.SUCCESS
        : PaymentStatus.FAILED;
      const orderStatus = status === PaymentStatus.SUCCESS ? 'PAID' : 'PAYMENT_FAILED';
      const payment = await manager.save(PaymentEntity, {
        orderId: order.id,
        method: dto.method,
        status,
        amount: order.totalAmount,
      });

      order.status = orderStatus;
      await manager.save(OrderEntity, order);

      return {
        paymentId: payment.id,
        orderId: order.id,
        method: payment.method,
        status: payment.status,
        orderStatus,
        amount: payment.amount,
        message: status === PaymentStatus.SUCCESS
          ? 'Thanh toán giả lập thành công'
          : 'Thanh toán giả lập thất bại',
        createdAt: payment.createdAt,
      };
    });
  }
}
