import { Injectable, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/jwt.strategy';

const ALLOWED_SCOPES = ['HOD', 'DEAN', 'PRINCIPAL'];

@Injectable()
export class DelegationService {
  constructor(private prisma: PrismaService) {}

  async createDelegation(user: JwtPayload, body: { delegateUserId: string; scope: string; validFrom: string; validTo: string; reason: string }) {
    if (user.userId === body.delegateUserId) throw new BadRequestException('Cannot delegate to self');
    if (!ALLOWED_SCOPES.includes(body.scope)) throw new BadRequestException('Invalid scope');
    
    const validFrom = new Date(body.validFrom);
    const validTo = new Date(body.validTo);
    if (validFrom >= validTo) throw new BadRequestException('validFrom must be before validTo');

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: { employee: true, roles: true }
    });
    if (!dbUser) throw new ForbiddenException('User not found');

    const userRoles = dbUser.roles.map(r => r.name);
    const actualDepartmentId = dbUser.employee?.departmentId;

    // Delegator must have the role they are delegating
    if (!userRoles.includes(body.scope)) {
      throw new ForbiddenException(`You do not have the authority to delegate ${body.scope} scope`);
    }

    const delegateUser = await this.prisma.user.findUnique({ where: { id: body.delegateUserId }, include: { employee: true } });
    if (!delegateUser) throw new BadRequestException('Delegate user not found');
    if (!delegateUser.employee) throw new BadRequestException('Delegate must be an employee');

    const departmentId = body.scope === 'HOD' ? actualDepartmentId : null;

    // Overlap prevention
    const overlapping = await this.prisma.delegation.findFirst({
      where: {
        delegatorUserId: user.userId,
        scope: body.scope,
        departmentId,
        status: 'ACTIVE',
        validFrom: { lt: validTo },
        validTo: { gt: validFrom },
      },
    });

    if (overlapping) {
      throw new ConflictException('An active delegation for this scope already overlaps with the requested dates');
    }

    return this.prisma.delegation.create({
      data: {
        delegatorUserId: user.userId,
        delegateUserId: body.delegateUserId,
        scope: body.scope,
        departmentId,
        validFrom,
        validTo,
        reason: body.reason,
      },
    });
  }

  async getDelegationsGiven(userId: string) {
    return this.prisma.delegation.findMany({ where: { delegatorUserId: userId }, include: { delegate: { include: { employee: true } } } });
  }

  async getDelegationsReceived(userId: string) {
    return this.prisma.delegation.findMany({ where: { delegateUserId: userId, status: 'ACTIVE' }, include: { delegator: { include: { employee: true } } } });
  }

  async revokeDelegation(userId: string, delegationId: string) {
    const delegation = await this.prisma.delegation.findUnique({ where: { id: delegationId } });
    if (!delegation) throw new BadRequestException('Delegation not found');
    if (delegation.delegatorUserId !== userId) {
      throw new ForbiddenException('Not authorized to revoke this delegation');
    }

    return this.prisma.delegation.update({
      where: { id: delegationId },
      data: { status: 'REVOKED' },
    });
  }
}
