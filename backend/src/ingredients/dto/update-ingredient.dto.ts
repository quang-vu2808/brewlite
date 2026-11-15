import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class UpdateIngredientDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Matches(/^[A-Z0-9][A-Z0-9_-]*$/)
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  @Matches(/^[\p{L}]+$/u)
  unit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  warningThreshold?: number;

  @IsOptional()
  @IsIn(['INGREDIENT', 'PACKAGING'])
  kind?: 'INGREDIENT' | 'PACKAGING';

  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsIn(['S', 'M', 'L'], { each: true })
  compatibleSizes?: Array<'S' | 'M' | 'L'>;
}
