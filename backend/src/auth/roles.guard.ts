import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from './permissions';
import { ROLES_KEY } from './roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      // If no roles are required, it still requires authentication if JwtAuthGuard is used,
      // but no specific role check is needed.
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const payload: JwtPayload = request.user;
    
    if (!payload || !payload.userId) {
      throw new ForbiddenException('User identity not found in request');
    }

    // Resolve current state from the database
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      include: { roles: true }
    });

    if (!user) {
      throw new ForbiddenException('User no longer exists');
    }
    
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('User account is not active');
    }

    const userRoles = user.roles.map(r => r.name as RoleName);
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Attach fresh DB state to request for controllers to use if needed
    request.dbUser = user;
    
    return true;
  }
}
