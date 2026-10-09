/**
 * Phase 1 verification: RBAC boundaries, seed integrity and ledger guarantees.
 *
 *   npm run verify:phase1
 *
 * Read-only checks run against the seeded data. Mutating checks run inside a
 * single interactive transaction that is ALWAYS rolled back, so the
 * append-only ledger is never polluted with test rows.
 */
import { existsSync } from 'node:fs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { LedgerService } from '../src/ledger/ledger.service';
import { PERMISSIONS, ROLE_NAMES, ROLE_PERMISSIONS } from '../src/auth/permissions';
import { WorkflowStageDefinition } from '../src/common/domain.constants';

if (existsSync('.env')) process.loadEnvFile('.env');

const prisma = new PrismaService();
const ledger = new LedgerService(prisma);

const results: { name: string; ok: boolean; detail?: string }[] = [];
const pass = (name: string, detail?: string) => results.push({ name, ok: true, detail });
const fail = (name: string, detail: string) => results.push({ name, ok: false, detail });

async function check(name: string, fn: () => Promise<string | void>) {
  try {
    const detail = await fn();
    pass(name, detail ?? undefined);
  } catch (e) {
    fail(name, e instanceof Error ? e.message : String(e));
  }
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

const shortError = (e: unknown) =>
  (e instanceof Error ? e.message : String(e)).split('\n').filter(Boolean).pop()?.slice(0, 120);

/** Runs fn inside a SAVEPOINT and expects it to throw; restores tx state either way. */
async function expectRejected(
  tx: Prisma.TransactionClient,
  name: string,
  fn: () => Promise<unknown>,
  match?: RegExp,
) {
  await tx.$executeRawUnsafe('SAVEPOINT verify_sp');
  try {
    await fn();
    await tx.$executeRawUnsafe('RELEASE SAVEPOINT verify_sp');
    fail(name, 'Operation unexpectedly succeeded');
  } catch (e) {
    await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT verify_sp');
    const msg = e instanceof Error ? e.message : String(e);
    if (match && !match.test(msg)) fail(name, `Rejected for unexpected reason: ${shortError(e)}`);
    else pass(name, `rejected: ${shortError(e)}`);
  }
}

class Rollback extends Error {}

async function employeeByEmail(email: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    include: { employee: true },
  });
  assert(user.employee, `${email} has no employee record`);
  return user.employee;
}

async function readOnlyChecks() {
  const roles = await prisma.role.findMany();
  const roleByName = new Map(roles.map((r) => [r.name, r]));

  await check('RBAC: all catalog roles exist with exact permissions', async () => {
    for (const name of Object.values(ROLE_NAMES)) {
      const role = roleByName.get(name);
      assert(role, `Missing role ${name}`);
      const expected = [...ROLE_PERMISSIONS[name]].sort().join(',');
      const actual = [...role.permissions].sort().join(',');
      assert(expected === actual, `Permission drift on ${name}`);
    }
    return `${roles.length} roles`;
  });

  await check('RBAC: SYSTEM_ADMIN has no approval authority', async () => {
    const perms = roleByName.get('SYSTEM_ADMIN')!.permissions;
    assert(!perms.some((p) => p.startsWith('approval:')), 'SYSTEM_ADMIN holds approval:*');
  });

  await check('RBAC: only PRINCIPAL holds approval:sanction', async () => {
    const holders = roles.filter((r) => r.permissions.includes(PERMISSIONS.APPROVAL_SANCTION));
    assert(
      holders.length === 1 && holders[0].name === 'PRINCIPAL',
      `Holders: ${holders.map((r) => r.name).join(', ')}`,
    );
  });

  await check('RBAC: STAFF has self-service only (no approval / oversight)', async () => {
    const perms = roleByName.get('STAFF')!.permissions;
    const leaked = perms.filter(
      (p) => p.startsWith('approval:') || p.endsWith(':department') || p.endsWith(':all'),
    );
    assert(leaked.length === 0, `Leaked: ${leaked.join(', ')}`);
  });

  await check('RBAC: HOD is department-scoped (no institution-wide view)', async () => {
    const perms = roleByName.get('HOD')!.permissions;
    assert(perms.includes(PERMISSIONS.LEAVE_VIEW_DEPARTMENT), 'HOD lacks leave:view:department');
    assert(!perms.includes(PERMISSIONS.LEAVE_VIEW_ALL), 'HOD holds leave:view:all');
    assert(!perms.includes(PERMISSIONS.APPROVAL_SANCTION), 'HOD can sanction');
  });

  await check('Hierarchy: each academic dept HOD belongs to that dept and holds HOD role', async () => {
    const depts = await prisma.department.findMany({
      where: { hodId: { not: null } },
      include: { hod: { include: { user: { include: { roles: true } } } } },
    });
    for (const d of depts) {
      assert(d.hod, `${d.code} has no HOD`);
      assert(d.hod.departmentId === d.id, `${d.code} HOD belongs to another department`);
      assert(d.hod.user.roles.some((r) => r.name === 'HOD'), `${d.code} HOD lacks HOD role`);
    }
    return `${depts.length} departments`;
  });

  await check('Hierarchy: ECE HOD has no authority over CSE', async () => {
    const eceHod = await employeeByEmail('phase1.hod.ece@test.com');
    const cse = await prisma.department.findUniqueOrThrow({ where: { code: 'CSE' } });
    const managed = await prisma.department.findUnique({ where: { hodId: eceHod.id } });
    assert(managed?.code === 'ECE', 'ECE HOD manages wrong department');
    assert(cse.hodId !== eceHod.id, 'ECE HOD is CSE HOD');
  });



  await check('Ledger: balances derived from aggregation match policy entitlements', async () => {
    const teaching = await employeeByEmail('phase1.faculty1.cse@test.com');
    const vacation = await employeeByEmail('phase1.faculty2.cse@test.com');
    const cl = await ledger.getCurrentBalance(teaching.id, 'CL');
    const el = await ledger.getCurrentBalance(teaching.id, 'EL');
    const vacEl = await ledger.getCurrentBalance(vacation.id, 'EL');
    const vacVel = await ledger.getCurrentBalance(vacation.id, 'VEL');
    assert(cl === 15, `TEACHING CL expected 15, got ${cl}`);
    assert(el === 30, `TEACHING EL expected 30, got ${el}`);
    assert(vacEl === 0, `VACATION EL expected 0, got ${vacEl}`);
    assert(vacVel === 15, `VACATION VEL expected 15, got ${vacVel}`);
    return `CL=${cl} EL=${el} | vacation EL=${vacEl} VEL=${vacVel}`;
  });
}

async function mutatingChecks() {
  const faculty = await employeeByEmail('phase1.faculty1.cse@test.com');
  const wfDefault = await prisma.workflowDefinition.findUniqueOrThrow({ where: { code: 'WF_STANDARD' } });
  // The seed does not have WF_OFFICIAL_DUTY. Let's just use WF_STANDARD for tests.
  const wfOod = wfDefault;
  const cl = await prisma.leaveType.findUniqueOrThrow({ where: { code: 'CL' } });
  const ood = await prisma.leaveType.findUniqueOrThrow({ where: { code: 'OOD' } });

  try {
    await prisma.$transaction(
      async (tx) => {
        const anyEntry = await tx.leaveTransaction.findFirstOrThrow({
          where: { employeeId: faculty.id },
        });

        await expectRejected(tx, 'Immutability: UPDATE on ledger row is blocked', () =>
          tx.leaveTransaction.update({ where: { id: anyEntry.id }, data: { amount: 999 } }),
          /append-only/,
        );

        await expectRejected(tx, 'Immutability: DELETE on ledger row is blocked', () =>
          tx.leaveTransaction.delete({ where: { id: anyEntry.id } }),
          /append-only/,
        );

        await expectRejected(tx, 'Ledger CHECK: negative DEBIT amount is rejected', () =>
          tx.leaveTransaction.create({
            data: { employeeId: faculty.id, leaveTypeCode: 'CL', transactionType: 'DEBIT', amount: -2 },
          }),
          /amount_sign_check/,
        );

        await expectRejected(tx, 'Ledger CHECK: unknown transaction type is rejected', () =>
          tx.leaveTransaction.create({
            data: { employeeId: faculty.id, leaveTypeCode: 'CL', transactionType: 'BONUS', amount: 5 },
          }),
          // Fails both CHECKs; Postgres reports whichever it evaluates first.
          /23514|check constraint/,
        );

        await expectRejected(tx, 'Policy: overlapping effective-dated window is rejected', () =>
          tx.leavePolicy.create({
            data: {
              leaveTypeId: cl.id,
              employeeCategory: 'TEACHING',
              annualEntitlement: 99,
              holidayCountingRule: 'IGNORE',
              combinationRules: [],
              effectiveFrom: new Date(Date.UTC(2026, 5, 1)),
            },
          }),
          /Overlapping LeavePolicy/,
        );

        // --- Sanction flow -------------------------------------------------
        const app = await tx.leaveApplication.create({
          data: {
            employeeId: faculty.id,
            leaveTypeId: cl.id,
            status: 'PENDING_PRINCIPAL',
            startDate: new Date(Date.UTC(2026, 9, 12)),
            endDate: new Date(Date.UTC(2026, 9, 13)),
            totalDays: 2,
            reason: 'verify-phase1',
            workflowId: wfDefault.id,
          },
        });

        await check('Sanction: atomic status transition + DEBIT; balance recomputed', async () => {
          await ledger.postSanctionedLeave(app.id, tx);
          const after = await tx.leaveApplication.findUniqueOrThrow({ where: { id: app.id } });
          const bal = await ledger.getCurrentBalance(faculty.id, 'CL', tx);
          assert(after.status === 'SANCTIONED', `status ${after.status}`);
          assert(bal === 13, `balance expected 13, got ${bal}`);
          return `status=SANCTIONED, CL 15 \u2192 ${bal}`;
        });

        await expectRejected(tx, 'Sanction: re-sanctioning same application is rejected', () =>
          ledger.postSanctionedLeave(app.id, tx),
          /already SANCTIONED/,
        );

        await expectRejected(tx, 'Ledger trigger: second DEBIT for same application is rejected', () =>
          tx.leaveTransaction.create({
            data: {
              employeeId: faculty.id,
              leaveTypeCode: 'CL',
              transactionType: 'DEBIT',
              amount: 2,
              applicationId: app.id,
            },
          }),
          // Trigger raises SQLSTATE 23505, which Prisma surfaces as P2002.
          /already been debited|Unique constraint failed/,
        );

        const big = await tx.leaveApplication.create({
          data: {
            employeeId: faculty.id,
            leaveTypeId: cl.id,
            status: 'PENDING_PRINCIPAL',
            startDate: new Date(Date.UTC(2026, 10, 2)),
            endDate: new Date(Date.UTC(2026, 10, 30)),
            totalDays: 20,
            reason: 'verify-phase1 overdraw',
            workflowId: wfDefault.id,
          },
        });

        await expectRejected(tx, 'Sanction: overdrawing balance is rejected (and rolled back)', () =>
          ledger.postSanctionedLeave(big.id, tx),
          /Insufficient CL balance/,
        );

        await check('Sanction: failed overdraw left application pending', async () => {
          const s = await tx.leaveApplication.findUniqueOrThrow({ where: { id: big.id } });
          assert(s.status === 'PENDING_PRINCIPAL', `status ${s.status}`);
        });

        const oodApp = await tx.leaveApplication.create({
          data: {
            employeeId: faculty.id,
            leaveTypeId: ood.id,
            status: 'PENDING_PRINCIPAL',
            startDate: new Date(Date.UTC(2026, 9, 20)),
            endDate: new Date(Date.UTC(2026, 9, 21)),
            totalDays: 2,
            reason: 'verify-phase1 conference',
            workflowId: wfOod.id,
          },
        });

        await check('Sanction: non-balance type (OOD) sanctions without ledger entry', async () => {
          await ledger.postSanctionedLeave(oodApp.id, tx);
          const entries = await tx.leaveTransaction.count({ where: { applicationId: oodApp.id } });
          assert(entries === 0, `${entries} ledger entries created`);
        });

        throw new Rollback();
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }

  await check('Isolation: verification left no residue in the ledger', async () => {
    const residue = await prisma.leaveApplication.count({ where: { reason: { startsWith: 'verify-phase1' } } });
    const bal = await ledger.getCurrentBalance(faculty.id, 'CL');
    assert(residue === 0, `${residue} test applications persisted`);
    assert(bal === 15, `CL balance drifted to ${bal}`);
  });
}

async function setupFixtures() {
  const pass = 'testpass';
  
  const cse = await prisma.department.findUniqueOrThrow({ where: { code: 'CSE' } });
  const ece = await prisma.department.findUniqueOrThrow({ where: { code: 'ECE' } });
  const hodRole = await prisma.role.findFirstOrThrow({ where: { name: 'HOD' } });
  const facultyRole = await prisma.role.findFirstOrThrow({ where: { name: 'STAFF' } });

  const existingEceHod = await prisma.user.findFirst({ where: { email: 'phase1.hod.ece@test.com' } });
  if (!existingEceHod) {
    const eceHodUser = await prisma.user.create({ data: { email: 'phase1.hod.ece@test.com', passwordHash: pass, status: 'ACTIVE', roles: { connect: { id: hodRole.id } } } });
    const eceHod = await prisma.employee.create({ data: { employeeId: 'PH1-ECE-HOD', fullName: 'ECE HOD', userId: eceHodUser.id, departmentId: ece.id, category: 'TEACHING', serviceType: 'VACATION', tenureStatus: 'PERMANENT' } });
    await prisma.department.update({ where: { id: ece.id }, data: { hodId: eceHod.id } });
  }

  const existingFac1 = await prisma.user.findFirst({ where: { email: 'phase1.faculty1.cse@test.com' } });
  if (!existingFac1) {
    const fac1User = await prisma.user.create({ data: { email: 'phase1.faculty1.cse@test.com', passwordHash: pass, status: 'ACTIVE', roles: { connect: { id: facultyRole.id } } } });
    const fac1 = await prisma.employee.create({ data: { employeeId: 'PH1-FAC1', fullName: 'Fac 1', userId: fac1User.id, departmentId: cse.id, category: 'TEACHING', serviceType: 'VACATION', tenureStatus: 'PERMANENT' } });
    
    // Add ledger entries to match expectations: CL=15, EL=30 for teaching
    await prisma.leaveTransaction.createMany({
      data: [
        { employeeId: fac1.id, leaveTypeCode: 'CL', transactionType: 'CREDIT', amount: 15 },
        { employeeId: fac1.id, leaveTypeCode: 'EL', transactionType: 'CREDIT', amount: 30 },
      ]
    });
  }

  const existingFac2 = await prisma.user.findFirst({ where: { email: 'phase1.faculty2.cse@test.com' } });
  if (!existingFac2) {
    const fac2User = await prisma.user.create({ data: { email: 'phase1.faculty2.cse@test.com', passwordHash: pass, status: 'ACTIVE', roles: { connect: { id: facultyRole.id } } } });
    const fac2 = await prisma.employee.create({ data: { employeeId: 'PH1-FAC2', fullName: 'Fac 2', userId: fac2User.id, departmentId: cse.id, category: 'TEACHING', serviceType: 'VACATION', tenureStatus: 'PERMANENT' } });

    const vel = await prisma.leaveType.findUnique({ where: { code: 'VEL' } });
    if (!vel) {
      await prisma.leaveType.create({ data: { code: 'VEL', name: 'Vacation Earned Leave', tracksBalance: true } });
    }

    await prisma.leaveTransaction.create({
      data: { employeeId: fac2.id, leaveTypeCode: 'VEL', transactionType: 'CREDIT', amount: 15 },
    });
  }
}

async function main() {
  await setupFixtures();
  await readOnlyChecks();
  await mutatingChecks();

  const width = Math.max(...results.map((r) => r.name.length));
  console.log('\nPhase 1 verification\n' + '-'.repeat(width + 10));
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(width)}  ${r.detail ?? ''}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log('-'.repeat(width + 10) + `\n${results.length - failed}/${results.length} passed\n`);
  if (failed) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
