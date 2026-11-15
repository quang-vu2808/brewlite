import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaymentMethod } from './payment.entity';

export class CreatePaymentDto {
  @IsUUID()
  orderId!: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}
