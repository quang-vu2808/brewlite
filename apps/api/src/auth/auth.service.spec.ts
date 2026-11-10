import 'reflect-metadata';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import type { LoginDto, RegisterDto } from './dto/auth.dto';

describe('AuthService', () => {
  const password = 'CoffeeSecure2026!';
  const user = {
    id: '60e38bee-b7fa-4f4e-98eb-5c0d0f0f9b31',
    email: 'customer@example.com',
    passwordHash: '',
    loyaltyPoints: 0,
    role: 'CUSTOMER' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    orders: [],
  };
  const createUser = jest.fn<
    ReturnType<UsersService['create']>,
    Parameters<UsersService['create']>
  >();
  const findUserByEmail = jest.fn<
    ReturnType<UsersService['findByEmail']>,
    Parameters<UsersService['findByEmail']>
  >();
  const signToken = jest.fn<
    ReturnType<JwtService['signAsync']>,
    Parameters<JwtService['signAsync']>
  >();
  const users = {
    create: createUser,
    findByEmail: findUserByEmail,
  } as unknown as UsersService;
  const jwt = { signAsync: signToken } as unknown as JwtService;
  const service = new AuthService(users, jwt);

  beforeAll(async () => {
    user.passwordHash = await bcrypt.hash(password, 4);
  });

  beforeEach(() => {
    createUser.mockReset();
    findUserByEmail.mockReset();
    signToken.mockReset();
  });

  it('hashes a normalized email registration and returns only public user data', async () => {
    createUser.mockResolvedValue(user);

    const result = await service.register({
      email: ' Customer@Example.com ',
      password,
    } as RegisterDto);
    expect(result).toEqual({
      id: user.id,
      email: user.email,
      loyaltyPoints: 0,
      role: 'CUSTOMER',
      createdAt: user.createdAt,
    });

    const [email, passwordHash] = createUser.mock.calls[0];
    expect(email).toBe('customer@example.com');
    expect(passwordHash).not.toBe(password);
    await expect(bcrypt.compare(password, passwordHash)).resolves.toBe(true);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('returns conflict when the database reports a concurrent duplicate email', async () => {
    createUser.mockRejectedValue({
      driverError: { code: '23505' },
    });

    await expect(service.register({
      email: user.email,
      password,
    } as RegisterDto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('issues a short-lived access token after password verification', async () => {
    findUserByEmail.mockResolvedValue(user);
    signToken.mockResolvedValue('signed-access-token');

    await expect(service.login({
      email: ' CUSTOMER@example.com ',
      password,
    } as LoginDto)).resolves.toEqual({
      accessToken: 'signed-access-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        loyaltyPoints: 0,
        role: 'CUSTOMER',
        createdAt: user.createdAt,
      },
    });
    expect(signToken).toHaveBeenCalledWith({ sub: user.id });
  });

  it('uses the same unauthorized response for an unknown email and a bad password', async () => {
    findUserByEmail.mockResolvedValue(null);
    await expect(service.login({
      email: user.email,
      password,
    } as LoginDto)).rejects.toMatchObject({
      response: { message: 'Email hoặc mật khẩu không chính xác' },
    });

    findUserByEmail.mockResolvedValue(user);
    await expect(service.login({
      email: user.email,
      password: 'WrongCoffee2026!',
    } as LoginDto)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
