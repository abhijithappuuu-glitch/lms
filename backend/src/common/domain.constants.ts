/**
 * Canonical string values for columns the schema stores as `String`.
 *
 * The schema intentionally keeps these as strings so workflow stages and
 * categories can evolve through data; these constants are the validated
 * vocabulary used by DTOs, services and the seed.
 */

export const EMPLOYEE_CATEGORIES = ['TEACHING', 'NON_TEACHING', 'VACATION'] as const;
export type EmployeeCategory = (typeof EMPLOYEE_CATEGORIES)[number];

export const APPLICATION_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_HOD: 'PENDING_HOD',
  PENDING_DEAN: 'PENDING_DEAN',
  PENDING_PRINCIPAL: 'PENDING_PRINCIPAL',
  RETURNED: 'RETURNED',
  SANCTIONED: 'SANCTIONED',
  REJECTED: 'REJECTED',
} as const;
export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

export const TERMINAL_STATUSES: readonly string[] = [
  APPLICATION_STATUS.SANCTIONED,
  APPLICATION_STATUS.REJECTED,
  'COMPLETED'
];

export const isPendingStatus = (status: string): boolean => !TERMINAL_STATUSES.includes(status);

export const APPROVAL_DECISIONS = ['RECOMMENDED', 'RETURNED', 'REJECTED', 'SANCTIONED'] as const;
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];

export const TRANSACTION_TYPES = ['CREDIT', 'DEBIT', 'REVERSAL', 'ADJUSTMENT'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const HOLIDAY_COUNTING_RULES = ['IGNORE', 'COUNT_AS_LEAVE', 'CONDITIONAL'] as const;
export type HolidayCountingRule = (typeof HOLIDAY_COUNTING_RULES)[number];

export const HOLIDAY_TYPES = ['GENERAL', 'RESTRICTED'] as const;
export type HolidayType = (typeof HOLIDAY_TYPES)[number];

/** Shape of each element in WorkflowDefinition.stages (JSON column). */
export interface WorkflowStageDefinition {
  order: number;
  stage: string; // e.g. HOD_REVIEW
  status: string; // status while waiting at this stage, e.g. PENDING_HOD
  approverRole: string; // Role.name that may act on this stage
  scope: 'DEPARTMENT' | 'INSTITUTION'; // DEPARTMENT => approver must manage applicant's dept
  canSanction: boolean; // final authority for this workflow
}

/** Shape of each element in LeavePolicy.combinationRules (JSON column). */
export interface CombinationRule {
  type: 'CANNOT_COMBINE';
  with: string[]; // leave type codes that may not be adjacent/overlapping
}

/** Shape of each element in LeavePolicy.documentRules (JSON column). */
export interface DocumentRule {
  documentType: string; // e.g. MEDICAL_CERT
  whenDaysExceed?: number; // omitted => always required
  message: string;
}
