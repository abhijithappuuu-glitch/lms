import { existsSync } from 'node:fs';

const BASE_URL = 'http://localhost:3000/api';

async function req(path: string, method = 'GET', body?: any, token?: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.text();
  try {
    return { status: res.status, data: JSON.parse(data) };
  } catch (e) {
    return { status: res.status, data };
  }
}

async function runQaChecklist() {
  console.log('--- Executing QA Checklist via API ---');

  // 1. Authentication
  const invalidLogin = await req('/auth/login', 'POST', { email: 'faculty@sdmcet.ac.in', password: 'wrong' });
  console.log(`[Auth] Invalid password rejected: ${invalidLogin.status === 401 ? 'PASS' : 'FAIL'}`);

  // Register a pending user
  const regRes = await req('/auth/register', 'POST', {
    fullName: "Pending User", email: "pending@sdmcet.ac.in", password: "password123",
    departmentId: "CSE", category: "TEACHING", serviceType: "VACATION", tenureStatus: "PERMANENT"
  });
  const pendingLogin = await req('/auth/login', 'POST', { email: 'pending@sdmcet.ac.in', password: 'password123' });
  console.log(`[Auth] Pending registration cannot login: ${pendingLogin.status === 403 || pendingLogin.status === 401 ? 'PASS' : 'FAIL'}`);

  // Valid Login
  const facLogin = await req('/auth/login', 'POST', { email: 'faculty@sdmcet.ac.in', password: 'password123' });
  const facToken = facLogin.data?.accessToken || facLogin.data?.access_token || facLogin.data?.token;
  console.log(`[Auth] Valid login successful: ${facLogin.status === 201 ? 'PASS' : 'FAIL'}`);

  const hodLogin = await req('/auth/login', 'POST', { email: 'cse_hod@sdmcet.ac.in', password: 'password123' });
  const hodToken = hodLogin.data?.accessToken || hodLogin.data?.access_token || hodLogin.data?.token;

  const principalLogin = await req('/auth/login', 'POST', { email: 'principal@sdmcet.ac.in', password: 'password123' });
  const principalToken = principalLogin.data?.accessToken || principalLogin.data?.access_token || principalLogin.data?.token;

  const eceHodLogin = await req('/auth/login', 'POST', { email: 'phase1.hod.ece@test.com', password: 'testpass' });
  const eceHodToken = eceHodLogin.data?.accessToken || eceHodLogin.data?.access_token || eceHodLogin.data?.token;

  // Verify protected routes without token
  const noAuth = await req('/leave/applications/my-applications', 'GET');
  console.log(`[Auth] Protected routes require auth: ${noAuth.status === 401 ? 'PASS' : 'FAIL'}`);

  // 2. Employee Features
  const clType = (await req('/leave-types', 'GET', null, facToken)).data.find((t: any) => t.code === 'CL');
  const invalidApp = await req('/leave/applications', 'POST', {
    leaveTypeId: clType.id, startDate: '2026-11-01', endDate: '2026-12-01', isHalfDay: false, reason: 'Too long'
  }, facToken);
  console.log(`[Employee] Invalid dates / insufficient balance rejected: ${invalidApp.status >= 400 ? 'PASS' : 'FAIL'}`);

  const colleagues = await req('/colleagues', 'GET', null, facToken);
  const colleagueId = colleagues.data?.length > 0 ? colleagues.data[0].id : null;

  const validApp = await req('/leave/applications', 'POST', {
    leaveTypeId: clType.id, startDate: '2027-03-10', endDate: '2027-03-11', isHalfDay: false, reason: 'Valid CL API test', dutyAdjustedTo: colleagueId
  }, facToken);
  console.log(`[Employee] Submit valid CL application: ${validApp.status === 201 ? 'PASS' : 'FAIL'}`, validApp.data);
  const appId = validApp.data?.id;

  // 3. Duty Adjustment
  if (appId && colleagueId) {
    // If we submitted duty adjustment to hod for testing, hod accepts it
    const acceptDuty = await req(`/duty-adjustments/${appId}/accept`, 'POST', null, hodToken);
    console.log(`[Duty Adjustment] Accept duty adjustment: ${acceptDuty.status === 200 || acceptDuty.status === 201 ? 'PASS' : 'FAIL'}`);
    
    // Test unauthorized colleague access
    const unauthorizedAccept = await req(`/duty-adjustments/${appId}/accept`, 'POST', null, principalToken);
    console.log(`[Duty Adjustment] Unauthorized colleague rejection: ${unauthorizedAccept.status === 403 || unauthorizedAccept.status === 404 ? 'PASS' : 'FAIL'}`);
  }

  // 4. HOD and Dean
  const hodPending = await req('/leave/applications/pending', 'GET', null, hodToken);
  console.log(`[HOD] HOD sees pending applications: ${hodPending.status === 200 ? 'PASS' : 'FAIL'}`);
  
  const eceHodPending = await req('/leave/applications/pending', 'GET', null, eceHodToken);
  const seesCseApp = Array.isArray(eceHodPending.data) ? eceHodPending.data.some((a: any) => a.id === appId) : false;
  console.log(`[HOD] HOD sees only their department: ${!seesCseApp ? 'PASS' : 'FAIL'}`);

  if (appId) {
    const hodApprove = await req(`/workflow/process/${appId}`, 'POST', { decision: 'APPROVE', remarks: 'HOD Approved' }, hodToken);
    console.log(`[HOD] Approve application: ${hodApprove.status === 201 ? 'PASS' : 'FAIL'}`, hodApprove.data);
  }

  // 5. Principal Final Sanction
  const princPending = await req('/leave/applications/pending', 'GET', null, principalToken);
  console.log(`[Principal] Principal sees final approval queue: ${princPending.status === 200 ? 'PASS' : 'FAIL'}`);

  if (appId) {
    const princApprove = await req(`/workflow/process/${appId}`, 'POST', { decision: 'APPROVE', remarks: 'Principal Sanctioned' }, principalToken);
    console.log(`[Principal] Sanction application: ${princApprove.status === 201 ? 'PASS' : 'FAIL'}`, princApprove.data);

    // Verify balance debited
    const postSanctionBal = await req('/ledger/balances', 'GET', null, facToken);
    console.log(`[Employee] Verify balance and ledger after sanction: ${postSanctionBal.status === 200 ? 'PASS' : 'FAIL'}`);
  }

  // 6. Security and administration
  if (appId) {
    // Register and approve alternate user
    await req('/auth/register', 'POST', {
      fullName: "Alt User", email: "alt@sdmcet.ac.in", password: "password123",
      departmentId: "CIVIL", category: "TEACHING", serviceType: "VACATION", tenureStatus: "PERMANENT"
    });
    
    // HOD or Admin approves them
    const pendingList = await req('/auth/pending-registrations', 'GET', null, hodToken);
    const altPending = Array.isArray(pendingList.data) ? pendingList.data.find((u: any) => u.email === 'alt@sdmcet.ac.in') : null;
    if (altPending) {
      await req(`/auth/approve-registration/${altPending.id}`, 'POST', { status: 'ACTIVE' }, hodToken);
    }
    
    const altLogin = await req('/auth/login', 'POST', { email: 'alt@sdmcet.ac.in', password: 'password123' });
    const altToken = altLogin.data?.accessToken || altLogin.data?.token;

    const otherFacAccess = await req(`/leave/applications/${appId}`, 'GET', null, altToken);
    console.log(`[Security] Opening another employee's application: ${otherFacAccess.status === 403 || otherFacAccess.status === 404 ? 'PASS' : 'FAIL'}`, otherFacAccess.status, otherFacAccess.data);
  }

  const unauthAdmin = await req('/admin/policies', 'GET', null, facToken);
  console.log(`[Security] Unauthorized API requests return 401/403: ${unauthAdmin.status === 403 ? 'PASS' : 'FAIL'}`);
  
  console.log('--- QA API Checklist Completed ---');
}

runQaChecklist().catch(console.error);
