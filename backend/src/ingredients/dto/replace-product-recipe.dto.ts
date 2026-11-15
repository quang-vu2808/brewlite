import { ArrayMaxSize, ArrayUnique, IsArray, IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RecipeLineDto {
  @IsUUID()
  ingredientId!: string;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  quantityRequired!: number;
}

export class ReplaceProductRecipeDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique((line: RecipeLineDto) => line.ingredientId)
  @ValidateNested({ each: true })
  @Type(() => RecipeLineDto)
  items!: RecipeLineDto[];
}
