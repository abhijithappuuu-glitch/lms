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

async function runTests() {
  console.log('--- API Endpoints Coverage Test ---');

  // 1. Health
  const health = await req('/health');
  console.log(`[Health] GET /health: ${health.status}`);

  // 2. Auth - Login
  const loginRes = await req('/auth/login', 'POST', { email: 'faculty@sdmcet.ac.in', password: 'password123' });
  console.log(`[Auth] POST /auth/login: ${loginRes.status}`, loginRes.data);
  const facultyToken = loginRes.data?.accessToken || loginRes.data?.access_token || loginRes.data?.token;
  
  const hodLogin = await req('/auth/login', 'POST', { email: 'cse_hod@sdmcet.ac.in', password: 'password123' });
  const hodToken = hodLogin.data?.accessToken || hodLogin.data?.access_token || hodLogin.data?.token;

  // 3. Colleagues
  const colleagues = await req('/colleagues', 'GET', null, facultyToken);
  console.log(`[Colleagues] GET /colleagues: ${colleagues.status}`);

  // 4. Leave Types
  const leaveTypes = await req('/leave-types', 'GET', null, facultyToken);
  console.log(`[Leave Types] GET /leave-types: ${leaveTypes.status}`);
  const clType = leaveTypes.data?.find((lt: any) => lt.code === 'CL');

  // 5. Ledger Balances
  const balances = await req('/ledger/balances', 'GET', null, facultyToken);
  console.log(`[Ledger] GET /ledger/balances: ${balances.status}`);

  // 6. Simulate Leave Application
  const simulate = await req('/leave/applications/simulate', 'POST', {
    leaveTypeId: clType?.id,
    startDate: '2026-11-01',
    endDate: '2026-11-02',
    isHalfDay: false
  }, facultyToken);
  console.log(`[Leave] POST /leave/applications/simulate: ${simulate.status}`);

  // 7. Submit Leave Application
  const submitApp = await req('/leave/applications', 'POST', {
    leaveTypeId: clType?.id,
    startDate: '2026-11-01',
    endDate: '2026-11-02',
    isHalfDay: false,
    reason: 'Family function',
    dutyAdjustedTo: colleagues.data?.length > 0 ? colleagues.data[0].id : undefined
  }, facultyToken);
  console.log(`[Leave] POST /leave/applications: ${submitApp.status}`);
  const appId = submitApp.data?.id;

  // 8. My Applications
  const myApps = await req('/leave/applications/my-applications', 'GET', null, facultyToken);
  console.log(`[Leave] GET /leave/applications/my-applications: ${myApps.status}`);

  // 9. Leave Application Details
  if (appId) {
    const appDetails = await req(`/leave/applications/${appId}`, 'GET', null, facultyToken);
    console.log(`[Leave] GET /leave/applications/:id: ${appDetails.status}`);
  }

  // 10. Dashboard Metrics (Employee)
  const empMetrics = await req('/dashboard/employee/metrics', 'GET', null, facultyToken);
  console.log(`[Dashboard] GET /dashboard/employee/metrics: ${empMetrics.status}`);

  // 11. Dashboard Metrics (HOD)
  const hodMetrics = await req('/dashboard/hod/metrics', 'GET', null, hodToken);
  console.log(`[Dashboard] GET /dashboard/hod/metrics: ${hodMetrics.status}`);

  // 12. Notifications
  const notifications = await req('/api/notifications', 'GET', null, facultyToken);
  console.log(`[Notifications] GET /api/notifications: ${notifications.status}`);
  
  // 13. PDF generation
  if (appId) {
     const pdf = await req(`/leave/applications/${appId}/pdf`, 'GET', null, facultyToken);
     console.log(`[PDF] GET /leave/applications/:id/pdf: ${pdf.status}`);
  }

  console.log('--- Test Completed ---');
}

runTests().catch(console.error);
