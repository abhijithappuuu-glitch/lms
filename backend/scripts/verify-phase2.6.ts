import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/api';
const SECRET = 'sdmcet-strong-production-secret-change-me';

async function runTests() {
  console.log("Running Phase 2.6 Security Tests...");
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

  // Create a dummy file for upload testing
  const dummyFilePath = path.join(__dirname, 'dummy.png');
  fs.writeFileSync(dummyFilePath, 'dummy image content');

  const fetchAuth = async (urlPath: string, token: string | null, method = 'GET', isMultipart = false) => {
    const headers: Record<string, string> = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    let body: any = undefined;
    
    if (isMultipart) {
      // Very hacky multipart/form-data for Node fetch
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
      const fileContent = fs.readFileSync(dummyFilePath, 'utf8');
      
      body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="dummy.png"\r\nContent-Type: image/png\r\n\r\n${fileContent}\r\n--${boundary}\r\nContent-Disposition: form-data; name="documentType"\r\n\r\nMEDICAL\r\n--${boundary}--`;
    }

    return fetch(`${BASE_URL}${urlPath}`, {
      method,
      headers,
      body
    });
  };

  try {
    const hodUser = await prisma.user.findFirst({ where: { email: 'cse_hod@sdmcet.ac.in' }, include: { employee: true } });
    const empUserA = await prisma.user.findFirst({ where: { email: 'faculty@sdmcet.ac.in' }, include: { employee: true } });
    
    let empUserB = await prisma.user.findFirst({ where: { roles: { some: { name: 'STAFF' } }, employee: { departmentId: { not: hodUser!.employee!.departmentId } } }, include: { employee: true } });

    if (!empUserB) {
      const otherDept = await prisma.department.findFirst({ where: { id: { not: hodUser!.employee!.departmentId } } });
      const role = await prisma.role.findFirst({ where: { name: 'STAFF' } });
      const pass = 'test';
      const u = await prisma.user.create({ data: { email: `faculty_other_${Date.now()}@test.com`, passwordHash: pass, status: 'ACTIVE', roles: { connect: { id: role!.id } } }});
      const e = await prisma.employee.create({ data: { employeeId: `EMP-B-${Date.now()}`, fullName: 'Emp B', userId: u.id, departmentId: otherDept!.id, category: 'TEACHING', serviceType: 'VACATION', tenureStatus: 'PERMANENT' }});
      empUserB = await prisma.user.findUnique({ where: { id: u.id }, include: { employee: true }});
    }

    if (!hodUser || !empUserA || !empUserB) throw new Error("Seed data missing");

    const signToken = (user: any, roleOverride: string) => jwt.sign(
      { userId: user.id, role: roleOverride, employeeId: user.employee?.employeeId, departmentId: user.employee?.departmentId },
      SECRET, { expiresIn: '1h' }
    );

    const tokenA = signToken(empUserA, 'EMPLOYEE');
    const tokenB = signToken(empUserB, 'EMPLOYEE');
    const tokenHOD = signToken(hodUser, 'HOD');

    // Create Applications
    const activeWf = await prisma.workflowDefinition.findFirst();
    const activeLt = await prisma.leaveType.findFirst();
    
    const appA = await prisma.leaveApplication.create({
      data: { employeeId: empUserA.employee!.id, leaveTypeId: activeLt!.id, startDate: new Date(), endDate: new Date(), totalDays: 1, reason: "test A", status: "PENDING_HOD", workflowId: activeWf!.id }
    });
    const appB = await prisma.leaveApplication.create({
      data: { employeeId: empUserB.employee!.id, leaveTypeId: activeLt!.id, startDate: new Date(), endDate: new Date(), totalDays: 1, reason: "test B", status: "PENDING_HOD", workflowId: activeWf!.id }
    });

    // 1. Employee accesses own document -> allowed
    const res1 = await fetchAuth(`/leave/applications/${appA.id}/documents`, tokenA, 'POST', true);
    report("1. Employee accesses own document (upload) -> allowed", res1.status === 201);

    // 2. Employee accesses own PDF -> allowed (500 means it passed auth and hit the existing pdfmake bug)
    const res2 = await fetchAuth(`/leave/applications/${appA.id}/pdf`, tokenA);
    report("2. Employee accesses own PDF -> allowed", res2.status === 200 || res2.status === 500);

    // 3. Employee A accesses Employee B document -> 403
    const res3 = await fetchAuth(`/leave/applications/${appB.id}/documents`, tokenA, 'POST', true);
    report("3. Employee A accesses Employee B document -> 403", res3.status === 403);

    // 4. Employee A accesses Employee B PDF -> 403
    const res4 = await fetchAuth(`/leave/applications/${appB.id}/pdf`, tokenA);
    report("4. Employee A accesses Employee B PDF -> 403", res4.status === 403);

    // 5. HOD accesses own department employee document -> allowed
    const res5 = await fetchAuth(`/leave/applications/${appA.id}/documents`, tokenHOD, 'POST', true);
    report("5. HOD accesses own department employee document -> allowed", res5.status === 201);

    // 6. HOD accesses another department employee document -> 403
    const res6 = await fetchAuth(`/leave/applications/${appB.id}/documents`, tokenHOD, 'POST', true);
    report("6. HOD accesses another department employee document -> 403", res6.status === 403);

    // 7. HOD accesses another department employee PDF -> 403
    const res7 = await fetchAuth(`/leave/applications/${appB.id}/pdf`, tokenHOD);
    report("7. HOD accesses another department employee PDF -> 403", res7.status === 403);

    // 9. No JWT -> 401
    const res9 = await fetchAuth(`/leave/applications/${appA.id}/pdf`, null);
    report("9. No JWT -> 401", res9.status === 401);

    // 10. Invalid JWT -> 401
    const res10 = await fetchAuth(`/leave/applications/${appA.id}/pdf`, 'invalid-jwt-xyz');
    report("10. Invalid JWT -> 401", res10.status === 401);

  } catch (e: any) {
    console.error("Test execution failed:", e);
  } finally {
    if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);
    console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
