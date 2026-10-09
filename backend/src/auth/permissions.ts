/**
 * RBAC permission catalog — single source of truth for the API guards and
 * the database seed. Roles store these strings in Role.permissions.
 *
 * Scope note: permissions say WHAT an actor may do; data scope (e.g. an HOD
 * only acting on their own department) is enforced by the workflow engine
 * using WorkflowStageDefinition.scope + Department.hodId.
 */
export const PERMISSIONS = {
  // Self-service
  LEAVE_APPLY: 'leave:apply',
  LEAVE_VIEW_OWN: 'leave:view:own',
  LEAVE_CANCEL_OWN: 'leave:cancel:own',
  LEDGER_VIEW_OWN: 'ledger:view:own',

  // Oversight
  LEAVE_VIEW_DEPARTMENT: 'leave:view:department',
  LEAVE_VIEW_ALL: 'leave:view:all',
  LEDGER_VIEW_DEPARTMENT: 'ledger:view:department',
  LEDGER_VIEW_ALL: 'ledger:view:all',
  REPORT_VIEW_DEPARTMENT: 'report:view:department',
  REPORT_VIEW_INSTITUTION: 'report:view:institution',

  // Approval workflow
  APPROVAL_RECOMMEND: 'approval:recommend',
  APPROVAL_RETURN: 'approval:return',
  APPROVAL_REJECT: 'approval:reject',
  APPROVAL_SANCTION: 'approval:sanction',

  // Administration (configuration only — no approval authority)
  LEDGER_ADJUST: 'ledger:adjust',
  POLICY_VIEW: 'policy:view',
  POLICY_MANAGE: 'policy:manage',
  WORKFLOW_MANAGE: 'workflow:manage',
  HOLIDAY_MANAGE: 'holiday:manage',
  USER_MANAGE: 'user:manage',
  DEPARTMENT_MANAGE: 'department:manage',
  AUDIT_VIEW: 'audit:view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_NAMES = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  PRINCIPAL: 'PRINCIPAL',
  DEAN: 'DEAN',
  HOD: 'HOD',
  SECRETARY: 'SECRETARY',
  STAFF: 'STAFF',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

const P = PERMISSIONS;

const SELF_SERVICE: Permission[] = [
  P.LEAVE_APPLY,
  P.LEAVE_VIEW_OWN,
  P.LEAVE_CANCEL_OWN,
  P.LEDGER_VIEW_OWN,
  P.POLICY_VIEW,
];

/**
 * Role -> permissions. Roles are additive: an HOD holds both STAFF and HOD.
 *
 * Separation of duties:
 *  - SYSTEM_ADMIN configures the system but cannot recommend/sanction leave.
 *  - Only PRINCIPAL holds approval:sanction by default; sanction authority for
 *    a given application is further narrowed by WorkflowStageDefinition.canSanction.
 */
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  STAFF: SELF_SERVICE,

  HOD: [
    P.LEAVE_VIEW_DEPARTMENT,
    P.LEDGER_VIEW_DEPARTMENT,
    P.REPORT_VIEW_DEPARTMENT,
    P.APPROVAL_RECOMMEND,
    P.APPROVAL_RETURN,
    P.APPROVAL_REJECT,
  ],

  DEAN: [
    P.LEAVE_VIEW_ALL,
    P.LEDGER_VIEW_ALL,
    P.REPORT_VIEW_INSTITUTION,
    P.APPROVAL_RECOMMEND,
    P.APPROVAL_RETURN,
    P.APPROVAL_REJECT,
  ],

  PRINCIPAL: [
    P.LEAVE_VIEW_ALL,
    P.LEDGER_VIEW_ALL,
    P.REPORT_VIEW_INSTITUTION,
    P.APPROVAL_RECOMMEND,
    P.APPROVAL_RETURN,
    P.APPROVAL_REJECT,
    P.APPROVAL_SANCTION,
    P.AUDIT_VIEW,
  ],

  SECRETARY: [
    P.LEAVE_VIEW_ALL,
    P.LEDGER_VIEW_ALL,
    P.REPORT_VIEW_INSTITUTION,
    P.AUDIT_VIEW,
    P.POLICY_VIEW,
  ],

  SYSTEM_ADMIN: [
    P.POLICY_VIEW,
    P.POLICY_MANAGE,
    P.WORKFLOW_MANAGE,
    P.HOLIDAY_MANAGE,
    P.USER_MANAGE,
    P.DEPARTMENT_MANAGE,
    P.LEDGER_ADJUST,
    P.AUDIT_VIEW,
  ],
};
