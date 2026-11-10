import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class PackagingLineDto {
  @IsUUID()
  ingredientId!: string;

  @IsIn(['PER_SERVING', 'PER_ORDER', 'PER_GROUP'])
  usageType!: 'PER_SERVING' | 'PER_ORDER' | 'PER_GROUP';

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  quantityRequired!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  servingsPerUnit?: number;
}

export class ReplacePackagingRecipeDto {
  @IsIn(['S', 'M', 'L'])
  size!: 'S' | 'M' | 'L';

  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique((line: PackagingLineDto) => line.ingredientId)
  @ValidateNested({ each: true })
  @Type(() => PackagingLineDto)
  items!: PackagingLineDto[];
}
