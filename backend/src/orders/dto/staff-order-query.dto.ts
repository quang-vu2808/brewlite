import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const STAFF_ORDER_STATUSES = [
  'PENDING',
  'PAYMENT_FAILED',
  'PAID',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
] as const;

export class StaffOrderQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsIn(STAFF_ORDER_STATUSES)
  status?: (typeof STAFF_ORDER_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;
}
