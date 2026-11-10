import { IsInt, IsString, Max, MaxLength, Min, NotEquals } from 'class-validator';

export class AdjustIngredientStockDto {
  @IsInt()
  @Min(-2_147_483_647)
  @Max(2_147_483_647)
  @NotEquals(0)
  delta!: number;

  @IsString()
  @MaxLength(200)
  reason!: string;
}
