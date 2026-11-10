import { IsInt, IsNotEmpty, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Matches(/^[A-Z0-9][A-Z0-9_-]*$/)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  @Matches(/^[\p{L}]+$/u)
  unit!: string;

  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  stock!: number;

  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  warningThreshold!: number;
}
