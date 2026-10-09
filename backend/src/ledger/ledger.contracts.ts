/**
 * Leave Ledger Service Contract.
 *
 * The ledger is the sole authority for balances. Balances are never stored;
 * they are derived as:
 *   SUM(CREDIT) + SUM(REVERSAL) + SUM(ADJUSTMENT) - SUM(DEBIT)
 */

export interface LedgerTransactionRequest {
  employeeId: string;
  leaveTypeCode: string;
  transactionType: 'CREDIT' | 'DEBIT' | 'REVERSAL';
  /** Always positive; direction is implied by transactionType. */
  amount: number;
  /** FK link to the Leave Application this entry belongs to. */
  applicationId?: string;
  /** Free-form external reference (Official Duty ID, accrual batch ID, ...). */
  referenceId?: string;
  notes?: string;
}

export interface LedgerBalance {
  employeeId: string;
  leaveTypeCode: string;
  balance: number;
}
