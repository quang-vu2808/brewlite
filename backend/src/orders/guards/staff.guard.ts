import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/guards/jwt-auth.guard';

@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user.role !== 'STAFF') {
      throw new ForbiddenException('Chức năng chỉ dành cho nhân viên');
    }
    return true;
  }
}
