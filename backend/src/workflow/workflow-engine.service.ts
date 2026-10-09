import { Injectable, ForbiddenException, UnprocessableEntityException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { JwtPayload } from '../auth/jwt.strategy';
import { Prisma } from '@prisma/client';
import { LeavePolicyService } from '../leave-policy/leave-policy.service';

@Injectable()
export class WorkflowEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly leavePolicyService: LeavePolicyService
  ) {}

  async processAction(applicationId: string, action: string, remarks: string, user: JwtPayload) {
    if (!user.userId) throw new ForbiddenException('Unauthenticated');

    // 1 & 2. Load application with current workflow step
    const app = await this.prisma.leaveApplication.findUnique({
      where: { id: applicationId },
      include: {
        employee: true,
        dutyAdjustee: true,
        leaveType: true,
        documents: true,
        workflow: {
          include: {
            steps: true,
            transitions: true
          }
        },
        currentStep: true
      }
    });

    if (!app) throw new NotFoundException('Leave application not found');

    const wf = app.workflow;
    const currentStep = app.currentStep;

    if (!currentStep) {
      throw new UnprocessableEntityException('Application has no active workflow step');
    }

    if (currentStep.isTerminal) {
      throw new UnprocessableEntityException('Workflow has already reached a terminal state');
    }

    // 4. Validate actor authorization
    const delegationId = await this.authorizeActor(currentStep.actorType, app, user);

    // 5. Evaluate transitions
    const possibleTransitions = wf.transitions.filter(t => t.fromStepKey === currentStep.stepKey && t.action === action && t.isActive);
    
    if (possibleTransitions.length === 0) {
      throw new UnprocessableEntityException(`Action ${action} is not valid for step ${currentStep.stepKey}`);
    }

    let nextTransition: any = null;
    
    for (const t of possibleTransitions) {
      if (this.evaluateConditions(t.conditions, app)) {
        nextTransition = t;
        break;
      }
    }

    if (!nextTransition) {
      throw new UnprocessableEntityException(`Action ${action} executed but no conditional transitions matched.`);
    }

    // 6. Determine next step
    const nextStep = wf.steps.find(s => s.stepKey === nextTransition.toStepKey);
    if (!nextStep) {
      throw new Error(`Invalid workflow configuration: next step ${nextTransition.toStepKey} not found.`);
    }

    const isTerminal = nextStep.isTerminal;
    let nextStatus = nextStep.stepKey;

    await this.prisma.$transaction(async (tx) => {
      // 13. Concurrency / Immutability
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`workflow:${app.id}`}))`;

      const latestApp = await tx.leaveApplication.findUnique({ where: { id: applicationId } });
      if (latestApp?.currentStepId !== currentStep.id) {
        throw new UnprocessableEntityException('Application state was modified concurrently.');
      }

      // If transition to Sanctioned
      if (nextStatus === 'COMPLETED' || nextStatus === 'SANCTIONED') {
        // Phase 4A: Final Sanction Policy Revalidation
        const policyEval = await this.leavePolicyService.evaluateLeaveApplication({
          employeeId: app.employee.id,
          leaveTypeCode: app.leaveType.code,
          startDate: app.startDate,
          endDate: app.endDate,
          isHalfDay: app.isHalfDay,
          uploadedDocumentTypes: app.documents?.map((d: any) => d.documentType) || [],
          applicationId: app.id
        });

        if (!policyEval.eligible) {
          throw new UnprocessableEntityException(`Final Sanction Failed due to Policy changes: ${policyEval.violations.join(', ')}`);
        }

        // Detect if pinned policy version changed (optional strictly enforce, but we update duration here to be safe)
        if (app.totalDays !== policyEval.duration) {
          // You could block or silently update. We'll update the duration.
          await tx.leaveApplication.update({
            where: { id: app.id },
            data: { totalDays: policyEval.duration }
          });
        }

        await this.ledgerService.postSanctionedLeave(app.id, tx);
        nextStatus = 'SANCTIONED';
      }

      // 8 & 9. Update workflow position and lifecycle status
      await tx.leaveApplication.update({
        where: { id: app.id },
        data: {
          status: nextStatus,
          currentStepId: nextStep.id
        }
      });

      // 7. Record ApprovalAction
      await tx.approvalAction.create({
        data: {
          applicationId: app.id,
          actorId: user.userId,
          delegationId: delegationId,
          stage: currentStep.stepKey,
          workflowStepId: currentStep.id,
          decision: action,
          remarks: remarks || "",
          previousState: currentStep.stepKey,
          resultingState: nextStatus
        }
      });
    });

    return { success: true, nextStatus, nextStepKey: nextStep.stepKey, isTerminal };
  }

  private async authorizeActor(actorType: string, app: any, user: JwtPayload): Promise<string | null> {
    if (actorType === 'EMPLOYEE') {
      if (app.employee.employeeId !== user.employeeId) throw new ForbiddenException('Not your application');
      return null;
    }
    if (actorType === 'DUTY_ADJUSTER') {
      if (app.dutyAdjustee?.employeeId !== user.employeeId) throw new ForbiddenException('Not assigned as duty adjustee');
      return null;
    }
    if (actorType === 'SYSTEM') {
      throw new ForbiddenException('System steps cannot be progressed manually');
    }

    // Fetch fresh user from DB instead of relying on JWT claims
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: { employee: true, roles: true }
    });

    if (!dbUser) throw new ForbiddenException('User not found');

    const userRoles = dbUser.roles.map(r => r.name);
    const actualDepartmentId = dbUser.employee?.departmentId;

    // Check permanent role first
    let hasPermanentRole = false;
    let deptMatch = true;

    if (actorType === 'HOD') {
      if (userRoles.includes('HOD')) {
        hasPermanentRole = true;
        if (app.employee.departmentId !== actualDepartmentId) deptMatch = false;
      }
    } else {
      if (userRoles.includes(actorType)) {
        hasPermanentRole = true;
      }
    }

    if (hasPermanentRole && deptMatch) return null; // authorized normally

    // Not authorized via permanent role. Check active delegations.
    const now = new Date();
    const activeDelegation = await this.prisma.delegation.findFirst({
      where: {
        delegateUserId: user.userId,
        scope: actorType,
        status: 'ACTIVE',
        validFrom: { lte: now },
        validTo: { gte: now },
        // if department matters (like HOD), we must ensure the delegation covers the application's department
        ...(actorType === 'HOD' ? { departmentId: app.employee.departmentId } : {})
      }
    });

    if (activeDelegation) return activeDelegation.id;

    console.log("DEBUG AUTH:", { userRoles, appDept: app.employee.departmentId, actualDept: actualDepartmentId, actorType });
    throw new ForbiddenException(`Requires ${actorType} authority (permanent or delegated)`);
  }

  private evaluateConditions(conditions: any, context: any): boolean {
    if (!conditions) return true; // Empty conditions = unconditionally true

    // Evaluate 'all' array
    if (conditions.all && Array.isArray(conditions.all)) {
      for (const cond of conditions.all) {
        if (!this.evaluateCondition(cond, context)) return false;
      }
    }

    // Evaluate 'any' array
    if (conditions.any && Array.isArray(conditions.any) && conditions.any.length > 0) {
      let anyPassed = false;
      for (const cond of conditions.any) {
        if (this.evaluateCondition(cond, context)) {
          anyPassed = true;
          break;
        }
      }
      if (!anyPassed) return false;
    }

    return true;
  }

  private evaluateCondition(cond: any, context: any): boolean {
    const { field, op, value } = cond;
    const actualValue = this.resolveField(field, context);

    switch (op) {
      case 'EQ': return actualValue === value;
      case 'NEQ': return actualValue !== value;
      case 'IN': return Array.isArray(value) && value.includes(actualValue);
      case 'NOT_IN': return Array.isArray(value) && !value.includes(actualValue);
      case 'GT': return actualValue > value;
      case 'GTE': return actualValue >= value;
      case 'LT': return actualValue < value;
      case 'LTE': return actualValue <= value;
      case 'IS_TRUE': return actualValue === true;
      case 'IS_FALSE': return actualValue === false;
      case 'IS_NULL': return actualValue == null;
      case 'NOT_NULL': return actualValue != null;
      default: throw new Error(`Unknown operator: ${op}`);
    }
  }

  private resolveField(field: string, context: any): any {
    const parts = field.split('.');
    let val = context;
    for (const p of parts) {
      if (val == null) return null;
      val = val[p];
    }
    return val;
  }
}
