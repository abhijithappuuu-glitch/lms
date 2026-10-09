/**
 * Approval Workflow Engine Contract.
 * Routing based on department, leave type and institutional rules, resolved
 * from WorkflowDefinition rows (see WorkflowStageDefinition in
 * common/domain.constants.ts). Implementation: Phase 2.
 */

export interface RouteTransitionRequest {
  applicationId: string;
  actorId: string; // User ID of the person making the decision
  actorRole: string; // HOD, DEAN, PRINCIPAL
  decision: 'RECOMMEND' | 'SANCTION' | 'RETURN' | 'REJECT';
  remarks?: string;
}

export interface WorkflowStateResult {
  nextState: string; // e.g., 'PENDING_PRINCIPAL'
  nextApproverId?: string;
  isTerminal: boolean; // true if SANCTIONED or REJECTED
}
