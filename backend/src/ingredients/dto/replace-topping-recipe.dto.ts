import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class ProductToppingLineDto {
  @IsString()
  @MaxLength(40)
  toppingId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  quantityRequired!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  maxPortions!: number;
}

export class ReplaceToppingRecipeDto {
  @IsIn(['S', 'M', 'L'])
  size!: 'S' | 'M' | 'L';

  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique((item: ProductToppingLineDto) => item.toppingId)
  @ValidateNested({ each: true })
  @Type(() => ProductToppingLineDto)
  items!: ProductToppingLineDto[];
}
