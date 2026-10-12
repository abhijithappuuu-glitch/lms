import { Controller, Post, Body, Get, Query, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeavePolicyService } from '../leave-policy/leave-policy.service';
import { LedgerService } from '../ledger/ledger.service';
import { differenceInDays } from 'date-fns';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GetUser } from '../auth/get-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { WorkflowEngineService } from './workflow-engine.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave/applications')
export class LeaveApplicationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leavePolicy: LeavePolicyService,
    private readonly ledger: LedgerService,
    private readonly workflowEngine: WorkflowEngineService
  ) {}

  @Post('simulate')
  async simulateApplication(@Body() body: any, @GetUser() user: JwtPayload) {
    const { leaveTypeCode, startDate, endDate, isHalfDay, uploadedDocumentTypes } = body;
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException('User is not an employee');
    const employee = await this.prisma.employee.findUnique({ where: { employeeId } });
    if (!employee) throw new Error("Employee not found");

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Fallback if bad dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { eligible: false, duration: 0, units: 0, balanceBefore: 0, balanceAfter: 0, violations: ['Invalid dates'], warnings: [], requiredDocuments: [], requiresDutyAdjustment: false, policyVersion: 0 };
    }

    const result = await this.leavePolicy.evaluateLeaveApplication({
      employeeId: employee.id,
      leaveTypeCode: leaveTypeCode || 'CL',
      startDate: start,
      endDate: end,
      isHalfDay: !!isHalfDay,
      uploadedDocumentTypes: uploadedDocumentTypes || []
    });

    return result;
  }

  @Post()
  async createApplication(@Body() body: any, @GetUser() user: JwtPayload) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException('User is not an employee');
    const employee = await this.prisma.employee.findUnique({ where: { employeeId }});
    if (!employee) throw new Error("Employee not found");

    const leaveTypeCode = body.leaveTypeCode || 'CL';
    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    const isHalfDay = !!body.isHalfDay;
    const uploadedDocs = body.uploadedDocumentTypes || [];

    const policyEval = await this.leavePolicy.evaluateLeaveApplication({
      employeeId: employee.id,
      leaveTypeCode,
      startDate: start,
      endDate: end,
      isHalfDay,
      uploadedDocumentTypes: uploadedDocs
    });

    if (!policyEval.eligible) {
      throw new Error(`Policy validation failed: ${policyEval.violations.join(', ')}`);
    }

    const leaveType = await this.prisma.leaveType.findUnique({ where: { code: leaveTypeCode } });
    if (!leaveType) throw new Error("Leave type not found");

    // 1. Resolve workflow (Mocking logic for prototype)
    const workflow = await this.prisma.workflowDefinition.findFirst();
    if (!workflow) throw new Error("No active workflow");

    const startStep = await this.prisma.workflowStep.findFirst({
      where: { workflowDefinitionId: workflow.id, stepKey: 'START' }
    });
    if (!startStep) throw new Error("Workflow is missing a START step");

    // 2. Insert Application at START step
    const dutyAdjusteeId = body.dutyAdjustedTo || null;
    if (policyEval.requiresDutyAdjustment && !dutyAdjusteeId) {
      throw new Error('Duty adjustment is required for this application.');
    }

    const app = await this.prisma.leaveApplication.create({
      data: {
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        leavePolicyId: policyEval.leavePolicyId, // pin policy version
        startDate: start,
        endDate: end,
        totalDays: policyEval.duration,
        isHalfDay,
        reason: body.reason,
        status: 'START',
        dutyAdjustedTo: dutyAdjusteeId,
        workflowId: workflow.id,
        currentStepId: startStep.id
      }
    });

    // 3. Auto-submit to advance to the next step
    await this.workflowEngine.processAction(app.id, 'SUBMIT', 'Initial Submission', user);

    return this.prisma.leaveApplication.findUnique({ where: { id: app.id }});
  }

  @Get('pending')
  async getPendingApprovals(@GetUser() user: JwtPayload) {
    const role = user.role;
    const now = new Date();
    
    // Find active delegations
    const activeDelegations = await this.prisma.delegation.findMany({
      where: {
        delegateUserId: user.userId,
        status: 'ACTIVE',
        validFrom: { lte: now },
        validTo: { gte: now }
      }
    });

    const hasApproverRole = ['HOD', 'PRINCIPAL', 'DEAN'].includes(role);
    const orConditions: any[] = [];
    
    // 0. Duty Adjustment Requests (Applicable to any employee)
    if (user.employeeId) {
      orConditions.push({
        currentStep: { actorType: 'DUTY_ADJUSTER' },
        dutyAdjustee: { employeeId: user.employeeId }
      });
    }

    // 1. Permanent role
    if (hasApproverRole) {
      const condition: any = { currentStep: { actorType: role } };
      if (role === 'HOD') {
        if (!user.departmentId) throw new ForbiddenException('HOD has no department assigned');
        condition.employee = { departmentId: user.departmentId };
      }
      orConditions.push(condition);
    }
    
    // 2. Delegated roles
    for (const del of activeDelegations) {
      const condition: any = { currentStep: { actorType: del.scope } };
      if (del.departmentId) {
        condition.employee = { departmentId: del.departmentId };
      }
      orConditions.push(condition);
    }

    const apps = await this.prisma.leaveApplication.findMany({
      where: { OR: orConditions },
      include: { 
        employee: { include: { department: true } }, 
        leaveType: true,
        currentStep: true 
      }
    });

    return apps.map(app => ({
      id: app.id,
      applicant: app.employee.fullName,
      department: app.employee.department.name,
      leaveType: app.leaveType.name,
      dates: `${app.startDate.toDateString()} - ${app.endDate.toDateString()}`,
      duration: app.totalDays,
      status: 'pending',
      actionRequired: true,
      nextRouting: app.currentStep?.displayName || 'Unknown',
      actingAsDelegate: app.currentStep?.actorType !== role
    }));
  }

  @Get('my-applications')
  async getMyApplications(@GetUser() user: JwtPayload) {
    const employeeId = user.employeeId;
    if (!employeeId) return [];
    
    // Get UUID for the user's employee
    const emp = await this.prisma.employee.findUnique({ where: { employeeId }});
    if (!emp) return [];

    const apps = await this.prisma.leaveApplication.findMany({
      where: { employeeId: emp.id },
      include: { employee: { include: { department: true } }, leaveType: true },
      orderBy: { createdAt: 'desc' }
    });

    return apps.map(app => {
      let status = 'pending';
      if (app.status === 'SANCTIONED') status = 'approved';
      if (app.status === 'REJECTED') status = 'rejected';
      if (app.status === 'RETURNED') status = 'returned';

      return {
        id: app.id,
        applicant: "You",
        department: app.employee.department.name,
        leaveType: app.leaveType.name,
        dates: `${app.startDate.toDateString()} - ${app.endDate.toDateString()}`,
        duration: app.totalDays,
        status: status,
      };
    });
  }

  /**
   * Recent decided applications (sanctioned / rejected) — powers the
   * "Recent Approvals" panel. Scoped to the HOD's department when applicable.
   */
  @Get('recent')
  async getRecentApprovals(@GetUser() user: JwtPayload) {
    const role = user.role;
    const where: any = { status: { in: ['SANCTIONED', 'REJECTED'] } };

    if (role === 'HOD') {
      if (!user.departmentId) return [];
      where.employee = { departmentId: user.departmentId };
    }

    const apps = await this.prisma.leaveApplication.findMany({
      where,
      include: {
        employee: { include: { department: true } },
        leaveType: true,
        approvals: { orderBy: { timestamp: 'desc' }, take: 1, include: { actor: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 8
    });

    return apps.map(app => {
      const lastAction = app.approvals[0];
      return {
        id: app.id,
        applicant: app.employee.fullName,
        department: app.employee.department.name,
        leaveType: app.leaveType.name,
        dates: `${app.startDate.toDateString()} - ${app.endDate.toDateString()}`,
        duration: app.totalDays,
        status: app.status === 'SANCTIONED' ? 'approved' : 'rejected',
        decision: app.status === 'SANCTIONED' ? 'Sanctioned' : 'Rejected',
        decidedBy: lastAction?.stage || lastAction?.actor?.email || '—',
        date: (lastAction?.timestamp || app.updatedAt).toDateString(),
      };
    });
  }

  @Get(':id')
  async getApplication(@Param('id') id: string, @GetUser() user: JwtPayload) {
    const app = await this.prisma.leaveApplication.findUnique({
      where: { id },
      include: {
        employee: { include: { department: true } },
        leaveType: true,
        currentStep: true,
        dutyAdjustee: true
      }
    });

    if (!app) throw new Error("Application not found");

    const history = await this.prisma.approvalAction.findMany({
      where: { applicationId: id },
      include: { actor: { include: { employee: true } } },
      orderBy: { timestamp: 'asc' }
    });

    return {
      ...app,
      history: history.map(h => ({
        id: h.id,
        action: h.decision,
        remarks: h.remarks,
        actorName: h.actor?.employee?.fullName || h.actor?.email || 'System',
        stepName: h.stage || 'Unknown',
        createdAt: h.timestamp
      }))
    };
  }

  @Post(':id/cancel')
  async cancelApplication(@Param('id') id: string, @GetUser() user: JwtPayload) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException();

    const emp = await this.prisma.employee.findUnique({ where: { employeeId }});
    if (!emp) throw new ForbiddenException();

    const app = await this.prisma.leaveApplication.findUnique({ where: { id }, include: { leaveType: true } });
    if (!app) throw new Error("App not found");
    
    if (app.employeeId !== emp.id) {
      throw new ForbiddenException("You can only cancel your own applications");
    }

    if (app.status === 'SANCTIONED') {
      if (app.leaveType.tracksBalance) {
        // Create Reversal
        await this.prisma.leaveTransaction.create({
          data: {
            employeeId: app.employeeId,
            leaveTypeCode: app.leaveType.code,
            transactionType: 'REVERSAL',
            amount: app.totalDays, // Full refund
            applicationId: app.id,
            notes: 'Leave Cancelled after Sanction',
          }
        });
      }
    }

    await this.prisma.leaveApplication.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    return { success: true };
  }
}
