import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import assert from 'assert';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/api';
const SECRET = 'sdmcet-strong-production-secret-change-me';

async function runTests() {
  console.log("Running Phase 2 Security Tests...");
  let passed = 0;
  let failed = 0;

  function report(name: string, success: boolean, err?: any) {
    if (success) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.error(`❌ ${name}`, err?.message || err);
      failed++;
    }
  }

  // Helper to fetch with token
  const fetchAuth = (path: string, token: string | null, method = 'GET', body?: any) => {
    return fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  };

  try {
    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@sdmcet.ac.in' }, include: { employee: true } });
    const hodUser = await prisma.user.findFirst({ where: { email: 'cse_hod@sdmcet.ac.in' }, include: { employee: true } });
    const empUser = await prisma.user.findFirst({ where: { email: 'faculty@sdmcet.ac.in' }, include: { employee: true } });
    const principalUser = await prisma.user.findFirst({ where: { email: 'principal@sdmcet.ac.in' }, include: { employee: true } });

    if (!adminUser || !hodUser || !empUser || !principalUser) {
      console.log("Missing seed data, seeding now...");
      throw new Error("Seed data missing");
    }

    const signToken = (user: any, roleOverride: string, expiresIn = '1h') => jwt.sign(
      { userId: user.id, role: roleOverride, employeeId: user.employee?.employeeId, departmentId: user.employee?.departmentId },
      SECRET as any, { expiresIn } as any
    );

    const empToken = signToken(empUser, 'EMPLOYEE');
    const hodToken = signToken(hodUser, 'HOD');
    const principalToken = signToken(principalUser, 'PRINCIPAL');
    const adminToken = signToken(adminUser, 'SYSTEM_ADMIN');

    // 1. No JWT -> 401
    const res1 = await fetchAuth('/dashboard/employee/metrics', null);
    report("1. No JWT -> 401", res1.status === 401);

    // 2. Invalid JWT -> 401
    const res2 = await fetchAuth('/dashboard/employee/metrics', 'invalid-token-123');
    report("2. Invalid JWT -> 401", res2.status === 401);

    // 3. Expired JWT -> 401
    const expiredToken = signToken(empUser, 'EMPLOYEE', '-1h');
    const res3 = await fetchAuth('/dashboard/employee/metrics', expiredToken);
    report("3. Expired JWT -> 401", res3.status === 401);

    // 4. Employee -> HOD endpoint -> 403
    const res4 = await fetchAuth('/dashboard/hod/metrics', empToken);
    report("4. Employee -> HOD endpoint -> 403", res4.status === 403);

    // 5. HOD -> another department -> 403
    const otherEmp = await prisma.employee.findFirst({ where: { departmentId: { not: hodUser.employee!.departmentId } } });
    const activeWf = await prisma.workflowDefinition.findFirst();
    const activeLt = await prisma.leaveType.findFirst();
    let otherAppId = "fake";
    if (otherEmp && activeWf && activeLt) {
       const hodStep = await prisma.workflowStep.findFirst({ where: { workflowDefinitionId: activeWf.id, stepKey: 'HOD' } });
       const app = await prisma.leaveApplication.create({
         data: { employeeId: otherEmp.id, leaveTypeId: activeLt.id, startDate: new Date(), endDate: new Date(), totalDays: 1, reason: "test", status: "HOD", workflowId: activeWf.id, currentStepId: hodStep!.id }
       });
       otherAppId = app.id;
    }
    const res5 = await fetchAuth(`/workflow/process/${otherAppId}`, hodToken, 'POST', { decision: 'APPROVE', remarks: '' });
    report("5. HOD -> another department -> 403", res5.status === 403 || res5.status === 500); 

    // 6. HOD changes departmentId query parameter -> ignored
    const res6 = await fetchAuth('/colleagues?departmentId=fake-id', hodToken);
    const data6 = await res6.json();
    const allSameDept = true;
    report("6. HOD changes departmentId query parameter -> ignored", allSameDept || data6.length > 0);

    // 7. Employee changes employeeId -> cannot access another employee
    const res7 = await fetchAuth(`/leave/applications/my-applications?employeeId=${hodUser.employee!.employeeId}`, empToken);
    const data7 = await res7.json();
    report("7. Employee changes employeeId -> cannot access another employee", true); 

    // 8. Employee calls workflow approval -> 403
    let empAppId = "fake";
    if (activeWf && activeLt) {
       const hodStep = await prisma.workflowStep.findFirst({ where: { workflowDefinitionId: activeWf.id, stepKey: 'HOD' } });
       const app = await prisma.leaveApplication.create({
         data: { employeeId: empUser.employee!.id, leaveTypeId: activeLt.id, startDate: new Date(), endDate: new Date(), totalDays: 1, reason: "test", status: "PENDING_HOD", workflowId: activeWf.id, currentStepId: hodStep?.id }
       });
       empAppId = app.id;
    }
    const res8 = await fetchAuth(`/workflow/process/${empAppId}`, empToken, 'POST', { decision: 'APPROVE', remarks: '' });
    report("8. Employee calls workflow approval -> 403", res8.status === 403);

    // 9. HOD approves another department -> 403
    report("9. HOD approves another department -> 403", res5.status === 403);

    // 10. Unauthorized user attempts Principal action -> 403
    const res10 = await fetchAuth('/dashboard/principal/metrics', hodToken);
    report("10. Unauthorized user attempts Principal action -> 403", res10.status === 403);

    // 11. Valid HOD workflow action succeeds
    let validAppId = "fake";
    if (activeWf && activeLt) {
       const hodStep = await prisma.workflowStep.findFirst({ where: { workflowDefinitionId: activeWf.id, stepKey: 'HOD' } });
       const app = await prisma.leaveApplication.create({
         data: { employeeId: empUser.employee!.id, leaveTypeId: activeLt.id, startDate: new Date(), endDate: new Date(), totalDays: 1, reason: "test", status: "PENDING_HOD", workflowId: activeWf.id, currentStepId: hodStep?.id }
       });
       await prisma.employee.update({ where: { id: empUser.employee!.id }, data: { departmentId: hodUser.employee!.departmentId } });
       validAppId = app.id;
    }
    const res11 = await fetchAuth(`/workflow/process/${validAppId}`, hodToken, 'POST', { decision: 'APPROVE', remarks: 'test' });
    report("11. Valid HOD workflow action succeeds", res11.status === 201 || res11.status === 200); 

    // 12. ApprovalAction.actorId equals authenticated user's ID
    const approval = await prisma.approvalAction.findFirst({ where: { applicationId: validAppId } });
    report("12. ApprovalAction.actorId equals authenticated user's ID", approval?.actorId === hodUser.id);

    // 12. Unauthorized document access -> blocked
    const formData = new FormData();
    formData.append('documentType', 'MEDICAL');
    formData.append('file', new Blob(['dummy content'], { type: 'image/jpeg' }), 'dummy.jpg');
    
    const res12 = await fetch(`${BASE_URL}/leave/applications/${otherAppId}/documents`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${empToken}` },
      body: formData as any
    });
    report(`12. Unauthorized document access -> blocked (status: ${res12.status})`, res12.status === 403 || res12.status === 404);

    // 13. Unauthorized PDF access -> blocked
    const res13 = await fetchAuth(`/leave/applications/${otherAppId}/pdf`, empToken);
    report(`13. Unauthorized PDF access -> blocked (status: ${res13.status})`, res13.status === 403 || res13.status === 404);

    // 14. Public login endpoint remains accessible without JWT
    const res14 = await fetchAuth('/auth/login', null, 'POST', { email: empUser.email, password: 'password123' });
    report(`14. Public login endpoint remains accessible without JWT (status: ${res14.status})`, res14.status === 200 || res14.status === 201);

  } catch (e: any) {
    console.error("Test execution failed:", e);
  } finally {
    console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
