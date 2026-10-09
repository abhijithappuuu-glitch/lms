import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from './calendar.service';
import { PolicyEvaluationRequest, PolicyEvaluationResult } from './leave-policy.contracts';

@Injectable()
export class LeavePolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendarService: CalendarService
  ) {}

  async evaluateLeaveApplication(req: PolicyEvaluationRequest): Promise<PolicyEvaluationResult> {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { id: req.employeeId },
      include: { user: true }
    });

    const leaveType = await this.prisma.leaveType.findUniqueOrThrow({
      where: { code: req.leaveTypeCode }
    });

    const policy = await this.prisma.leavePolicy.findFirst({
      where: {
        leaveTypeId: leaveType.id,
        employeeCategory: employee.category,
        effectiveFrom: { lte: req.startDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: req.startDate } }]
      }
    });

    if (!policy) {
      return this.buildResult(false, req.leaveTypeCode, 0, 0, 0, 0, [`No active policy found for category ${employee.category}`], [], [], false, 0, '');
    }

    const rules = policy.rules as any || {};
    const violations: string[] = [];
    const warnings: string[] = [];
    const requiredDocuments: string[] = [];

    // 1. Duration calculation
    const duration = await this.calendarService.calculateDuration(
      req.startDate,
      req.endDate,
      policy.holidayCountingRule,
      req.isHalfDay
    );
    const units = duration * 2;

    // 2. Overlap detection
    const overlaps = await this.prisma.leaveApplication.findMany({
      where: {
        employeeId: req.employeeId,
        status: { notIn: ['REJECTED', 'RETURNED'] }, // existing apps
        ...(req.applicationId ? { id: { not: req.applicationId } } : {}),
        OR: [
          { startDate: { lte: req.endDate }, endDate: { gte: req.startDate } }
        ]
      }
    });
    if (overlaps.length > 0) {
      // OOD overlap? If applying for OOD, overlapping with normal leave is bad. If applying for normal, overlapping with OOD is bad.
      violations.push('Leave period overlaps with an existing application');
    }

    // 3. Balance validation & calculation
    let balanceBefore = 0;
    if (req.leaveTypeCode === 'COML') {
      const txs = await this.prisma.leaveTransaction.findMany({
        where: { employeeId: req.employeeId, leaveTypeCode: 'HPL' }
      });
      balanceBefore = txs.reduce((acc, tx) => {
        if (tx.transactionType === 'CREDIT' || tx.transactionType === 'ADJUSTMENT' || tx.transactionType === 'CARRY_FORWARD') return acc + tx.amount;
        if (tx.transactionType === 'DEBIT' || tx.transactionType === 'EXPIRY') return acc - tx.amount;
        return acc;
      }, 0);
    } else if (leaveType.tracksBalance) {
      const txs = await this.prisma.leaveTransaction.findMany({
        where: { employeeId: req.employeeId, leaveTypeCode: leaveType.code }
      });
      balanceBefore = txs.reduce((acc, tx) => {
        if (tx.transactionType === 'CREDIT' || tx.transactionType === 'ADJUSTMENT' || tx.transactionType === 'CARRY_FORWARD') return acc + tx.amount;
        if (tx.transactionType === 'DEBIT' || tx.transactionType === 'EXPIRY') return acc - tx.amount;
        return acc;
      }, 0);
    }
    
    let balanceAfter = balanceBefore;

    // ----------------------------------------------------
    // PHASE 4A.1: LEAVE-SPECIFIC RULES
    // ----------------------------------------------------

    if (req.leaveTypeCode === 'CL') {
      const maxCL = rules.maxContinuousDays || policy.maxContinuousDays || 5;
      if (duration > maxCL) {
        violations.push(`Ordinarily maximum ${maxCL} consecutive CL days allowed`);
      }
      // Mid-year joiner check
      const currentYear = new Date().getFullYear();
      if (employee.joinDate.getFullYear() === currentYear) {
        const joinMonth = employee.joinDate.getMonth();
        const currentMonth = new Date().getMonth();
        const completedMonths = Math.max(0, currentMonth - joinMonth);
        const proratedPML = rules.monthlyProration || 1.25;
        const maxEntitlement = Math.floor(completedMonths * proratedPML);
        if (balanceBefore > maxEntitlement && duration > maxEntitlement) {
           warnings.push(`Mid-year joiner entitlement warning: calculated at ${maxEntitlement} approx.`);
        }
      }
    }

    if (req.leaveTypeCode === 'EL') {
      const singleAppMax = rules.singleApplicationMax || 180;
      if (duration > singleAppMax) {
        violations.push(`Maximum ${singleAppMax} days allowed for a single EL application`);
      }
    }

    if (req.leaveTypeCode === 'VEL') {
      if (employee.category !== 'TEACHING') {
        violations.push('VEL is only applicable to TEACHING category');
      }
      if (!req.velContext) {
        violations.push('VEL context (vacation days, duty days) must be provided');
      } else {
        const { sanctionedVacationDays, activeDutyDays, totalVacationPeriod } = req.velContext;
        const calcVel = sanctionedVacationDays * (activeDutyDays / totalVacationPeriod);
        if (Math.abs(duration - calcVel) > 0.5) { // Allow slight rounding
           violations.push(`VEL calculation mismatch. Expected approx ${calcVel}, requested ${duration}`);
        }
      }
      requiredDocuments.push('ADMINISTRATIVE_ASSIGNMENT_ORDER');
      if (!req.uploadedDocumentTypes.includes('ADMINISTRATIVE_ASSIGNMENT_ORDER')) {
         violations.push('Missing required document: ADMINISTRATIVE_ASSIGNMENT_ORDER');
      }
    }

    if (req.leaveTypeCode === 'COMPL') {
      if (!req.complContext?.hasPrincipalOrder) {
        violations.push('Written Principal order is required for COMPL');
      }
      requiredDocuments.push('PRINCIPAL_ORDER');
      if (!req.uploadedDocumentTypes.includes('PRINCIPAL_ORDER')) {
        violations.push('Missing required document: PRINCIPAL_ORDER');
      }
    }

    if (req.leaveTypeCode === 'COML') {
      balanceAfter = balanceBefore - (duration * 2); 
      if (balanceAfter < 0) {
        violations.push(`Insufficient HPL balance: available ${balanceBefore}, requested ${duration * 2} (2:1).`);
      }
      requiredDocuments.push('MEDICAL_CERT');
      if (!req.uploadedDocumentTypes.includes('MEDICAL_CERT')) {
        violations.push('Missing required document: MEDICAL_CERT');
      }
    }

    if (req.leaveTypeCode === 'SP.CL') {
      if (employee.category !== 'TEACHING') {
        violations.push('SP.CL is only applicable to TEACHING category');
      }
      requiredDocuments.push('OFFICIAL_ATTENDANCE_CERT');
      if (!req.uploadedDocumentTypes.includes('OFFICIAL_ATTENDANCE_CERT')) {
        violations.push('Missing required document: OFFICIAL_ATTENDANCE_CERT');
      }
      const annualMax = rules.annualMax || 15;
      if (duration > annualMax) {
        violations.push(`Maximum ${annualMax} SP.CL days allowed per year`);
      }
    }

    if (req.leaveTypeCode === 'OOD') {
      requiredDocuments.push('OFFICIAL_AUTHORIZATION');
      if (!req.uploadedDocumentTypes.includes('OFFICIAL_AUTHORIZATION')) {
        violations.push('Missing required document: OFFICIAL_AUTHORIZATION');
      }
      // OOD doesn't track balance, so balanceBefore/After remain 0
    }

    if (req.leaveTypeCode === 'R.H.') {
      const rhHol = await this.prisma.holiday.findFirst({
        where: { date: req.startDate, type: 'RESTRICTED' }
      });
      if (!rhHol) {
        violations.push('Selected date is not an official Restricted Holiday');
      }
    }

    if (req.leaveTypeCode === 'Maternity') {
      if (employee.gender !== 'F') violations.push('Maternity leave is only for female employees');
      if (employee.tenureStatus !== 'PERMANENT') violations.push('Maternity leave requires confirmed employee status');
      if (employee.livingChildren >= 2) violations.push('Maternity leave requires fewer than two living children');
      if (duration > 180) {
        violations.push('Maternity leave cannot exceed 180 days');
      }
    }

    if (req.leaveTypeCode === 'Paternity') {
      if (employee.gender !== 'M') violations.push('Paternity leave is only for male employees');
      if (employee.tenureStatus !== 'PERMANENT') violations.push('Paternity leave requires confirmed employee status');
      if (employee.livingChildren >= 2) violations.push('Paternity leave requires fewer than two living children');
      if (duration > 15) {
        violations.push('Paternity leave cannot exceed 15 days');
      }
      if (req.maternityPaternityContext?.childbirthDate) {
        const limitDate = new Date(req.maternityPaternityContext.childbirthDate);
        limitDate.setMonth(limitDate.getMonth() + 6);
        if (req.startDate > limitDate) {
          violations.push('Paternity leave must be taken within 6 months of childbirth');
        }
      }
    }

    // Default balance debit (if not COML, LOP, OOD, VEL, COMPL earning)
    if (!['COML', 'LOP', 'OOD', 'VEL', 'COMPL'].includes(req.leaveTypeCode) && leaveType.tracksBalance) {
      balanceAfter = balanceBefore - duration;
      if (balanceAfter < 0) {
        violations.push(`Insufficient ${req.leaveTypeCode} balance: available ${balanceBefore}, requested ${duration}.`);
      }
    }

    // 5. Combination rules (JSON logic)
    const combinations = policy.combinationRules as string[] || [];
    if (combinations.length > 0) {
      // Find adjacent leave apps
      const adjacent = await this.prisma.leaveApplication.findMany({
        where: {
          employeeId: req.employeeId,
          status: 'SANCTIONED',
          OR: [
            { endDate: { equals: new Date(req.startDate.getTime() - 86400000) } },
            { startDate: { equals: new Date(req.endDate.getTime() + 86400000) } }
          ]
        },
        include: { leaveType: true }
      });
      for (const adj of adjacent) {
        if (combinations.includes(adj.leaveType.code)) {
           violations.push(`Cannot combine ${req.leaveTypeCode} with ${adj.leaveType.code}`);
        }
      }
    }
    
    // 6. Generic Document Rules
    const docRules = policy.documentRules as any[] || [];
    for (const rule of docRules) {
      if (duration >= (rule.whenDaysExceed || 0)) {
        if (!requiredDocuments.includes(rule.documentType)) requiredDocuments.push(rule.documentType);
        if (!req.uploadedDocumentTypes.includes(rule.documentType)) {
          if (!violations.includes(`Missing required document: ${rule.documentType}`)) {
             violations.push(`Missing required document: ${rule.documentType}`);
          }
        }
      }
    }

    // 7. Duty Adjustment
    const requiresDutyAdjustment = rules.requiresDutyAdjustment === true || employee.category === 'TEACHING';

    const eligible = violations.length === 0;

    return this.buildResult(
      eligible,
      req.leaveTypeCode,
      duration,
      units,
      balanceBefore,
      balanceAfter,
      violations,
      warnings,
      requiredDocuments,
      requiresDutyAdjustment,
      policy.version,
      policy.id
    );
  }

  private buildResult(
    eligible: boolean,
    leaveCode: string,
    duration: number,
    units: number,
    balanceBefore: number,
    balanceAfter: number,
    violations: string[],
    warnings: string[],
    requiredDocuments: string[],
    requiresDutyAdjustment: boolean,
    policyVersion: number,
    leavePolicyId: string
  ): PolicyEvaluationResult {
    return {
      eligible, leaveCode, duration, units, balanceBefore, balanceAfter,
      violations, warnings, requiredDocuments, requiresDutyAdjustment,
      policyVersion, leavePolicyId
    };
  }
}
