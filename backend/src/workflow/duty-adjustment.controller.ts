import { Controller, Post, Param, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { GetUser } from '../auth/get-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('duty-adjustments')
export class DutyAdjustmentController {
  constructor(
    private readonly workflowEngine: WorkflowEngineService,
    private readonly prisma: PrismaService
  ) {}

  @Post(':id/accept')
  async accept(@Param('id') id: string, @GetUser() user: JwtPayload) {
    const app = await this.prisma.leaveApplication.findUnique({ where: { id }, include: { dutyAdjustee: true }});
    if (!app) throw new Error("Application not found");

    return this.workflowEngine.processAction(id, 'APPROVE', 'Duty adjustment accepted by colleague', user);
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body('remarks') remarks: string,
    @GetUser() user: JwtPayload,
  ) {
    const app = await this.prisma.leaveApplication.findUnique({ where: { id }, include: { dutyAdjustee: true }});
    if (!app) throw new Error("Application not found");

    return this.workflowEngine.processAction(id, 'REJECT', remarks || 'Duty adjustment rejected by colleague', user);
  }
}
