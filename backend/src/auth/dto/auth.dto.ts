import { Transform } from 'class-transformer';
import {
  IsByteLength,
  IsEmail,
  IsString,
  IsStrongPassword,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsByteLength(12, 72)
  @IsStrongPassword({
    minLength: 12,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password!: string;
}

export class LoginDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsByteLength(1, 72)
  password!: string;
}
