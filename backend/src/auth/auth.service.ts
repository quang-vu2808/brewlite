import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;
const DUMMY_PASSWORD_HASH =
  '$2b$12$tQwgCclUZ358azpNjjEGGOlJmOgwyg9BSMizA8rvnHrWibTr7wAhy';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      const user = await this.users.create(email, passwordHash);
      return this.toPublicUser(user);
    } catch (error) {
      if (this.isEmailConflict(error)) {
        throw new ConflictException('Email đã được đăng ký');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    const passwordMatches = user
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      user: this.toPublicUser(user),
    };
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    loyaltyPoints: number;
    role: 'CUSTOMER' | 'STAFF';
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      loyaltyPoints: user.loyaltyPoints,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private isEmailConflict(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('driverError' in error)) {
      return false;
    }
    const driverError = error.driverError;
    return typeof driverError === 'object' &&
      driverError !== null &&
      'code' in driverError &&
      driverError.code === '23505';
  }
}
