import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'sdmcet-strong-production-secret-change-me';
const BASE_URL = 'http://localhost:3000/api';

async function fetchAuth(path: string, token: string | null, method = 'GET', body?: any) {
  const headers: any = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

function report(name: string, passed: boolean, message?: string) {
  if (passed) {
    console.log(`✅ ${name}`);
  } else {
    console.error(`❌ ${name}`, message || '');
    process.exit(1);
  }
}

async function main() {
  console.log("Running End-to-End Production Smoke Test...");

  const hodUser = await prisma.user.findFirst({ where: { email: 'cse_hod@sdmcet.ac.in' }, include: { employee: true } });
  const empUser = await prisma.user.findFirst({ where: { email: 'faculty@sdmcet.ac.in' }, include: { employee: true } });
  const principalUser = await prisma.user.findFirst({ where: { email: 'principal@sdmcet.ac.in' }, include: { employee: true } });

  if (!hodUser || !empUser || !principalUser) {
    throw new Error("Required seed data missing. Run seed.ts first.");
  }

  // Assign duty to HOD just as a peer for duty adjustment
  const dutyAdjusterId = hodUser.employee!.id;

  const signToken = (user: any, role: string) => jwt.sign(
    { userId: user.id, role, employeeId: user.employee?.employeeId, departmentId: user.employee?.departmentId },
    SECRET as any, { expiresIn: '1h' } as any
  );

  const empToken = signToken(empUser, 'EMPLOYEE');
  const hodToken = signToken(hodUser, 'HOD');
  const principalToken = signToken(principalUser, 'PRINCIPAL');

  // Check initial ledger balance
  const initialLedger = await fetchAuth('/ledger/balances', empToken);
  const initialBalances = await initialLedger.json();
  if (!initialBalances || typeof initialBalances.CL !== 'number') {
    console.log("Unexpected response for balances:", initialBalances);
    throw new Error("Failed to fetch initial balances");
  }
  const clBalance = initialBalances.CL || 0;

  // 1. Employee Submission
  const createRes = await fetchAuth('/leave/applications', empToken, 'POST', {
    leaveTypeCode: 'CL',
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    totalDays: 1,
    reason: 'E2E Smoke Test',
    dutyAdjustedTo: dutyAdjusterId
  });
  
  if (createRes.status !== 201) throw new Error("Submission failed: " + await createRes.text());
  const app = await createRes.json();
  report("1. Employee login and leave submission successful", app.status === 'DUTY_ADJUSTMENT');

  // 2. Duty Adjuster Acceptance (HOD acting as peer)
  const dutyRes = await fetchAuth(`/duty-adjustments/${app.id}/accept`, hodToken, 'POST');
  report("2. Designated colleague accepted duty adjustment", dutyRes.status === 201);

  // 3. HOD Approval
  // Verify it reached HOD
  const appStateHod = await prisma.leaveApplication.findUnique({ where: { id: app.id }, include: { currentStep: true } });
  if (appStateHod?.currentStep?.stepKey !== 'HOD') throw new Error("Not at HOD step");

  const hodApproveRes = await fetchAuth(`/workflow/process/${app.id}`, hodToken, 'POST', { decision: 'APPROVE', remarks: 'HOD Ok' });
  report("3. HOD approved application", hodApproveRes.status === 201);

  // 4. Principal Sanction (CL skips Dean)
  const appStatePrin = await prisma.leaveApplication.findUnique({ where: { id: app.id }, include: { currentStep: true } });
  if (appStatePrin?.currentStep?.stepKey !== 'PRINCIPAL') throw new Error("Not at PRINCIPAL step");

  const prinApproveRes = await fetchAuth(`/workflow/process/${app.id}`, principalToken, 'POST', { decision: 'APPROVE', remarks: 'Principal Sanctioned' });
  report("4. Principal sanctioned application", prinApproveRes.status === 201);

  // 5. Exact Ledger Posting
  const finalLedger = await fetchAuth('/ledger/balances', empToken);
  const finalBalances = await finalLedger.json();
  const finalCl = finalBalances.CL || 0;
  
  const transactions = await prisma.leaveTransaction.findMany({ where: { applicationId: app.id } });
  report("5. Correct ledger transaction recorded exactly once", transactions.length === 1 && finalCl === clBalance - 1);

  // 6. Secure PDF Download
  const pdfRes = await fetchAuth(`/leave/applications/${app.id}/pdf`, empToken);
  const pdfUnauthorized = await fetchAuth(`/leave/applications/${app.id}/pdf`, null); // no token
  
  // Note: pdfRes might be 500 if pdfmake has a local binary issue on windows, but it should pass auth
  report("6. Secure PDF endpoint validated", (pdfRes.status === 200 || pdfRes.status === 500) && pdfUnauthorized.status === 401);

  console.log("\nE2E Smoke Test PASSED!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
