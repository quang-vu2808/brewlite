import { PaymentMethod, PaymentStatus } from './payment.entity';

export type PaymentRequest = {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  simulateFailure: boolean;
};

export type PaymentProviderResult = {
  status: PaymentStatus;
  qrPayload: string;
  message: string;
};

export interface PaymentProvider {
  readonly name: string;
  process(request: PaymentRequest): Promise<PaymentProviderResult>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
