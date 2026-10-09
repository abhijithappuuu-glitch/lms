export interface PolicyEvaluationRequest {
  employeeId: string;
  leaveTypeCode: string;
  startDate: Date;
  endDate: Date;
  isHalfDay: boolean;
  uploadedDocumentTypes: string[];
  applicationId?: string;
  // Phase 4A.1 Contexts
  velContext?: {
    sanctionedVacationDays: number;
    activeDutyDays: number;
    totalVacationPeriod: number;
  };
  maternityPaternityContext?: {
    isConfinement?: boolean;
    childbirthDate?: Date;
  };
  complContext?: {
    hasPrincipalOrder?: boolean;
    workedDate?: Date;
  };
}

export interface PolicyEvaluationResult {
  eligible: boolean;
  leaveCode: string;
  duration: number;
  units: number;
  balanceBefore: number;
  balanceAfter: number;
  violations: string[];
  warnings: string[];
  requiredDocuments: string[];
  requiresDutyAdjustment: boolean;
  policyVersion: number;
  leavePolicyId: string;
}
