import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'sdmcet-strong-production-secret-change-me';

const BASE_URL = 'http://localhost:3000/api';

async function fetchAuth(path: string, token: string | null, method = 'GET', body?: any) {
  const headers: any = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  return res;
}

function report(name: string, passed: boolean) {
  if (passed) {
    console.log(`✅ ${name}`);
  } else {
    console.error(`❌ ${name}`);
    process.exit(1);
  }
}

async function main() {
  console.log("Running Phase 3A Workflow Integration Tests...");

  const adminUser = await prisma.user.findFirst({ where: { roles: { some: { name: 'SYSTEM_ADMIN' } } } });
  const hodUser = await prisma.user.findFirst({ where: { email: 'cse_hod@sdmcet.ac.in' }, include: { employee: true } });
  const principalUser = await prisma.user.findFirst({ where: { roles: { some: { name: 'PRINCIPAL' } } }, include: { employee: true } });
  const empUser = await prisma.user.findFirst({ where: { email: 'faculty@sdmcet.ac.in' }, include: { employee: true } });
  
  if (!adminUser || !hodUser || !empUser || !principalUser) {
    throw new Error("Seed data missing");
  }

  // Create Dean user
  let deanRole = await prisma.role.findUnique({ where: { name: 'DEAN' }});
  if (!deanRole) deanRole = await prisma.role.create({ data: { name: 'DEAN', permissions: [] } });
  let deanUser = await prisma.user.findFirst({ where: { roles: { some: { name: 'DEAN' } } }, include: { employee: true } });
  if (!deanUser) {
    deanUser = await prisma.user.create({
      data: {
        email: 'dean@sdmcet.ac.in',
        passwordHash: 'xx',
        status: 'ACTIVE',
        roles: { connect: { id: deanRole.id } },
        employee: {
          create: {
            employeeId: 'EMP-DEAN', fullName: 'Dr. Dean', designation: 'Dean',
            departmentId: hodUser.employee!.departmentId, category: 'TEACHING', serviceType: 'VACATION', tenureStatus: 'PERMANENT'
          }
        }
      },
      include: { employee: true }
    });
  }

  const signToken = (user: any, roleOverride: string) => jwt.sign(
    { userId: user.id, role: roleOverride, employeeId: user.employee?.employeeId, departmentId: user.employee?.departmentId },
    SECRET as any, { expiresIn: '1h' } as any
  );

  const empToken = signToken(empUser, 'EMPLOYEE');
  const hodToken = signToken(hodUser, 'HOD');
  const principalToken = signToken(principalUser, 'PRINCIPAL');
  const deanToken = signToken(deanUser, 'DEAN');

  // Test 1: Employee submits application
  const createRes = await fetchAuth('/leave/applications', empToken, 'POST', {
    leaveTypeCode: 'EL', startDate: new Date().toISOString(), endDate: new Date().toISOString(), totalDays: 1, reason: 'Test EL', dutyAdjustedTo: principalUser.employee!.id
  });
  if (createRes.status !== 201) console.log(await createRes.text());
  report("1. Employee submits application", createRes.status === 201);
  const app = await createRes.json();
  report("2. Teaching employee -> Duty Adjustment", app.status === 'DUTY_ADJUSTMENT');

  // Test 3: Duty adjustment completed
  const dutyRes = await fetchAuth(`/duty-adjustments/${app.id}/accept`, principalToken, 'POST');
  if (dutyRes.status !== 201) console.log(await dutyRes.text());
  report("3. Duty adjustment completed", dutyRes.status === 201);
  
  // Test 4: Application reaches HOD
  const afterDuty = await prisma.leaveApplication.findUnique({ where: { id: app.id }, include: { currentStep: true } });
  report("4. Application reaches HOD", afterDuty?.currentStep?.stepKey === 'HOD');

  // Test 5: Correct HOD can approve
  const hodRes = await fetchAuth(`/workflow/process/${app.id}`, hodToken, 'POST', { decision: 'APPROVE', remarks: 'HOD Ok' });
  if (hodRes.status !== 201) console.log(await hodRes.text());
  report("5. Correct HOD can approve", hodRes.status === 201);

  // Test 7: EL/VEL/COML reaches conditional Dean step
  const afterHod = await prisma.leaveApplication.findUnique({ where: { id: app.id }, include: { currentStep: true } });
  report("7. EL reaches conditional Dean step", afterHod?.currentStep?.stepKey === 'DEAN');

  // Dean approves
  const deanRes = await fetchAuth(`/workflow/process/${app.id}`, deanToken, 'POST', { decision: 'APPROVE', remarks: 'Dean Ok' });
  report("Dean approved", deanRes.status === 201);

  // Principal approves (Final sanction)
  const afterDean = await prisma.leaveApplication.findUnique({ where: { id: app.id }, include: { currentStep: true } });
  report("9. Principal receives applicable application", afterDean?.currentStep?.stepKey === 'PRINCIPAL');

  const principalRes = await fetchAuth(`/workflow/process/${app.id}`, principalToken, 'POST', { decision: 'APPROVE', remarks: 'Principal Ok' });
  if (principalRes.status !== 201) console.log(await principalRes.text());
  report("10. Correct Principal can approve (Sanction)", principalRes.status === 201);

  const finalApp = await prisma.leaveApplication.findUnique({ where: { id: app.id }, include: { currentStep: true } });
  report("18. Final approval preserves existing ledger behavior (status SANCTIONED)", finalApp?.status === 'SANCTIONED');

  // Second test: Non-EL skip dean
  const clRes = await fetchAuth('/leave/applications', empToken, 'POST', {
    leaveTypeCode: 'CL', startDate: new Date().toISOString(), endDate: new Date().toISOString(), totalDays: 1, reason: 'Test CL', dutyAdjustedTo: principalUser.employee!.id
  });
  const clApp = await clRes.json();
  
  // Teaching employee so it goes to DUTY_ADJUSTMENT first
  await fetchAuth(`/duty-adjustments/${clApp.id}/accept`, principalToken, 'POST');
  
  const afterDutyCl = await prisma.leaveApplication.findUnique({ where: { id: clApp.id } });
  report("CL app status HOD", afterDutyCl?.status === 'HOD');
  
  await fetchAuth(`/workflow/process/${clApp.id}`, hodToken, 'POST', { decision: 'APPROVE', remarks: 'HOD Ok' });
  const afterHodCl = await prisma.leaveApplication.findUnique({ where: { id: clApp.id }, include: { currentStep: true } });
  report("8. Non-EL/VEL/COML skips Dean -> PRINCIPAL", afterHodCl?.currentStep?.stepKey === 'PRINCIPAL');

  console.log("\nAll workflow integration tests passed!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
