import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { UserEntity } from '../../users/user.entity';
import type { UsersService } from '../../users/users.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const request: {
    headers: { authorization?: string };
    user?: { id: string; email: string };
  } = {
    headers: { authorization: 'Bearer valid-token' },
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const jwt = { verifyAsync: jest.fn() } as unknown as JwtService;
  const users = { findById: jest.fn() } as unknown as UsersService;
  const guard = new JwtAuthGuard(jwt, users);

  beforeEach(() => {
    request.headers.authorization = 'Bearer valid-token';
    request.user = undefined;
    jest.clearAllMocks();
  });

  it('attaches the database user identified by a verified token', async () => {
    const userId = '60e38bee-b7fa-4f4e-98eb-5c0d0f0f9b31';
    jest.spyOn(jwt, 'verifyAsync').mockResolvedValue({ sub: userId });
    jest.spyOn(users, 'findById').mockResolvedValue(Object.assign(new UserEntity(), {
      id: userId,
      email: 'customer@example.com',
    }));

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: userId, email: 'customer@example.com' });
  });

  it.each([
    ['missing', undefined],
    ['malformed', 'Basic token'],
    ['expired or forged', 'Bearer invalid-token'],
  ])('rejects a %s token', async (_label, authorization) => {
    request.headers.authorization = authorization;
    if (authorization === 'Bearer invalid-token') {
      jest.spyOn(jwt, 'verifyAsync').mockRejectedValue(new Error('invalid token'));
    }

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
