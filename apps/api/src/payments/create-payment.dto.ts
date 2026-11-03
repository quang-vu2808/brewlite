import { IsEnum, IsUUID } from 'class-validator';
import { PaymentMethod } from './payment.entity';

export class CreatePaymentDto {
  @IsUUID()
  orderId!: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}
