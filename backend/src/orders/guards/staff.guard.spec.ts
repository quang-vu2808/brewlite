import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { StaffGuard } from './staff.guard';

describe('StaffGuard', () => {
  const guard = new StaffGuard();

  it('rejects customer JWTs from staff status operations', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'CUSTOMER' } }),
      }),
    } as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows staff JWTs', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'STAFF' } }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });
});
