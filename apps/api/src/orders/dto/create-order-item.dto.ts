import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export const ORDER_SIZES = ['S', 'M', 'L'] as const;
export const ORDER_TOPPINGS = ['pearls', 'cheese-foam', 'espresso'] as const;

export class CreateOrderItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number;

  @IsIn(ORDER_SIZES)
  size!: (typeof ORDER_SIZES)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsIn([...ORDER_TOPPINGS], { each: true })
  toppings: string[] = [];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayNotEmpty()
  @ArrayUnique((item: unknown) => {
    if (typeof item !== 'object' || item === null) return item;
    const option = item as Partial<CreateOrderItemDto>;
    const toppings = Array.isArray(option.toppings)
      ? [...option.toppings].sort()
      : option.toppings;
    return JSON.stringify([option.productId, option.size, toppings]);
  })
  @Type(() => CreateOrderItemDto)
  @ValidateNested({ each: true })
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,40}$/)
  promoCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  redeemPoints?: number;
}
