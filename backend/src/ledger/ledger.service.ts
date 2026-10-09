import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  APPLICATION_STATUS,
  TERMINAL_STATUSES,
  isPendingStatus,
} from '../common/domain.constants';
import { LedgerTransactionRequest } from './ledger.contracts';

type Db = Prisma.TransactionClient;

/** Pure balance computation over per-type sums. Exported for unit testing. */
export function computeBalance(
  sums: ReadonlyArray<{ transactionType: string; _sum: { amount: number | null } }>,
): number {
  let balance = 0;
  for (const row of sums) {
    const amount = row._sum.amount ?? 0;
    switch (row.transactionType) {
      case 'CREDIT':
      case 'REVERSAL':
      case 'ADJUSTMENT': // signed
        balance += amount;
        break;
      case 'DEBIT':
        balance -= amount;
        break;
      default:
        throw new Error(`Unknown ledger transactionType: ${row.transactionType}`);
    }
  }
  // Leave is counted in half-day units; strip float noise.
  return Math.round(balance * 100) / 100;
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append a single ledger entry. The DB rejects UPDATE/DELETE, invalid
   * types and wrong-signed amounts; this pre-validates for clearer errors.
   */
  async postTransaction(req: LedgerTransactionRequest, tx?: Db) {
    if (!Number.isFinite(req.amount) || req.amount <= 0) {
      throw new BadRequestException('Ledger amount must be a positive number.');
    }
    if (Math.round(req.amount * 2) !== req.amount * 2) {
      throw new BadRequestException('Ledger amount must be in half-day units.');
    }
    const db = tx ?? this.prisma;
    return db.leaveTransaction.create({
      data: {
        employeeId: req.employeeId,
        leaveTypeCode: req.leaveTypeCode,
        transactionType: req.transactionType,
        amount: req.amount,
        applicationId: req.applicationId,
        referenceId: req.referenceId,
        notes: req.notes,
      },
    });
  }

  /** Real-time balance via aggregation; never stored as a static field. */
  async getCurrentBalance(employeeId: string, leaveTypeCode: string, tx?: Db): Promise<number> {
    const db = tx ?? this.prisma;
    const sums = await db.leaveTransaction.groupBy({
      by: ['transactionType'],
      where: { employeeId, leaveTypeCode },
      _sum: { amount: true },
    });
    return computeBalance(sums);
  }

  /**
   * Atomically marks an application SANCTIONED and posts its DEBIT.
   *
   * Pass `tx` when called from the workflow engine so the ApprovalAction,
   * status transition and ledger debit commit (or roll back) together.
   */
  async postSanctionedLeave(applicationId: string, tx?: Db): Promise<void> {
    if (tx) {
      await this.sanctionWithin(tx, applicationId);
      return;
    }
    await this.prisma.$transaction((t) => this.sanctionWithin(t, applicationId));
  }

  private async sanctionWithin(tx: Db, applicationId: string): Promise<void> {
    const app = await tx.leaveApplication.findUnique({
      where: { id: applicationId },
      include: { leaveType: true },
    });
    if (!app) throw new NotFoundException(`Leave application ${applicationId} not found.`);

    if (TERMINAL_STATUSES.includes(app.status)) {
      throw new ConflictException(`Application is already ${app.status}.`);
    }
    if (!isPendingStatus(app.status)) {
      throw new ConflictException(`Application in status ${app.status} cannot be sanctioned.`);
    }

    // Serialise all balance-affecting writes for this employee + leave type,
    // so two concurrent sanctions cannot both pass the balance check.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ledger:${app.employeeId}:${app.leaveType.code}`}))`;

    // Optimistic guard: only transition from the state we just read.
    const transitioned = await tx.leaveApplication.updateMany({
      where: { id: app.id, status: app.status },
      data: { status: APPLICATION_STATUS.SANCTIONED },
    });
    if (transitioned.count !== 1) {
      throw new ConflictException('Application status changed concurrently; retry.');
    }

    if (app.leaveType.code === 'VEL') {
      await this.postTransaction(
        {
          employeeId: app.employeeId,
          leaveTypeCode: 'EL',
          transactionType: 'CREDIT',
          amount: app.totalDays,
          applicationId: app.id,
          notes: `VEL Conversion to EL from app ${app.id}`,
        },
        tx,
      );
      return;
    }

    if (app.leaveType.code === 'COMPL') {
      await this.postTransaction(
        {
          employeeId: app.employeeId,
          leaveTypeCode: 'COMPL',
          transactionType: 'CREDIT',
          amount: app.totalDays,
          applicationId: app.id,
          notes: `COMPL Earned from app ${app.id}`,
        },
        tx,
      );
      return;
    }

    if (!app.leaveType.tracksBalance) {
      return; // e.g. OOD / LOP: sanctioned without touching the ledger
    }

    const balance = await this.getCurrentBalance(app.employeeId, app.leaveType.code, tx);
    if (balance < app.totalDays) {
      throw new UnprocessableEntityException(
        `Insufficient ${app.leaveType.code} balance: available ${balance}, requested ${app.totalDays}.`,
      );
    }

    await this.postTransaction(
      {
        employeeId: app.employeeId,
        leaveTypeCode: app.leaveType.code,
        transactionType: 'DEBIT',
        amount: app.totalDays,
        applicationId: app.id,
        notes: `Sanctioned leave ${app.startDate.toISOString().slice(0, 10)} to ${app.endDate
          .toISOString()
          .slice(0, 10)}`,
      },
      tx,
    );
  }
}
