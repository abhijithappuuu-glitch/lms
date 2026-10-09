import { Controller, Get, Post, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GetUser } from '../auth/get-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class DataController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly workflowEngine: WorkflowEngineService
  ) {}

  @Get('leave-types')
  async getLeaveTypes() {
    return this.prisma.leaveType.findMany();
  }

  @Get('colleagues')
  async getColleagues(@GetUser() user: JwtPayload) {
    // Only return colleagues in the same department, unless DEAN/PRINCIPAL
    const where: any = {};
    if (user.role !== 'DEAN' && user.role !== 'PRINCIPAL') {
      where.departmentId = user.departmentId;
    }
    const employees = await this.prisma.employee.findMany({
      where,
      include: { department: true }
    });
    
    return employees.map(emp => ({
      id: emp.id,
      userId: emp.userId,
      fullName: emp.fullName,
      employeeId: emp.employeeId,
      department: emp.department.name,
      designation: emp.designation
    }));
  }

  @Get('ledger/balances')
  async getBalances(@GetUser() user: JwtPayload) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException();
    // We need to resolve the Prisma UUID for the employee. If employeeId is the string EMP-001, look it up.
    const emp = await this.prisma.employee.findFirst({
      where: { OR: [{ id: employeeId }, { employeeId }] }
    });
    
    if (!emp) throw new Error("Employee not found");

    const leaveTypes = await this.prisma.leaveType.findMany({ where: { tracksBalance: true }});
    const balances: Record<string, number> = {};

    for (const lt of leaveTypes) {
      balances[lt.code] = await this.ledgerService.getCurrentBalance(emp.id, lt.code);
    }

    return balances;
  }

  @Post('workflow/process/:id')
  async processWorkflow(@Param('id') id: string, @Body() body: { decision: string, remarks: string }, @GetUser() user: JwtPayload) {
    return this.workflowEngine.processAction(id, body.decision, body.remarks, user);
  }

  @Roles('SYSTEM_ADMIN', 'SECRETARY')
  @Get('admin/policies')
  async getPolicies() {
    return this.prisma.leaveType.findMany();
  }

  @Roles('SYSTEM_ADMIN')
  @Post('admin/policies/:id')
  async updatePolicy(@Param('id') id: string, @Body() body: any) {
    return this.prisma.leaveType.update({
      where: { id },
      data: { name: body.name || undefined } // Dummy update to satisfy ts
    });
  }

  @Roles('SYSTEM_ADMIN')
  @Post('admin/holidays')
  async addHoliday(@Body() body: any) {
    // Mock implementation for demo
    return { success: true };
  }
}
