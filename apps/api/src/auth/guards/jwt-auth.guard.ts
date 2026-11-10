import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import { UsersService } from '../../users/users.service';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'STAFF';
  loyaltyPoints: number;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token, ...extra] = authorization?.split(' ') ?? [];

    if (
      scheme?.toLowerCase() !== 'bearer' ||
      !token ||
      extra.length > 0
    ) {
      throw new UnauthorizedException('Bearer token không hợp lệ');
    }

    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync<Record<string, unknown>>(token);
    } catch {
      throw new UnauthorizedException('Bearer token không hợp lệ hoặc đã hết hạn');
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('sub' in payload) ||
      typeof payload.sub !== 'string' ||
      !isUUID(payload.sub)
    ) {
      throw new UnauthorizedException('Bearer token không hợp lệ');
    }

    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Tài khoản không còn tồn tại');
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      loyaltyPoints: user.loyaltyPoints,
    };
    return true;
  }
}
