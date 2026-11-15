import { Injectable } from '@nestjs/common';
import { PaymentStatus } from './payment.entity';
import type { PaymentProvider, PaymentRequest, PaymentProviderResult } from './payment-provider';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'MOCK';

  async process(request: PaymentRequest): Promise<PaymentProviderResult> {
    const status = request.simulateFailure ? PaymentStatus.FAILED : PaymentStatus.SUCCESS;
    const payload = new URLSearchParams({
      order: request.orderId,
      amount: String(request.amount),
      method: request.method,
      provider: this.name,
    });
    return {
      status,
      qrPayload: `BREWLITE-DEMO://${request.method.toLowerCase()}?${payload.toString()}`,
      message: request.simulateFailure
        ? 'Thanh toán mô phỏng thất bại'
        : 'Thanh toán mô phỏng thành công',
    };
  }
}
