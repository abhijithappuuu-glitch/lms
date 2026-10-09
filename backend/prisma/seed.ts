import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Running Safe Seeder...');
  
  // 1. Roles
  console.log('Seeding Roles...');
  const { ROLE_PERMISSIONS } = require('../src/auth/permissions');
  const roles = ['SYSTEM_ADMIN', 'HOD', 'PRINCIPAL', 'STAFF', 'DEAN', 'SECRETARY'];
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: { permissions: (ROLE_PERMISSIONS as any)[roleName] || [] },
      create: { name: roleName, permissions: (ROLE_PERMISSIONS as any)[roleName] || [] }
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SYSTEM_ADMIN' } });
  const hodRole = await prisma.role.findUniqueOrThrow({ where: { name: 'HOD' } });
  const principalRole = await prisma.role.findUniqueOrThrow({ where: { name: 'PRINCIPAL' } });
  const staffRole = await prisma.role.findUniqueOrThrow({ where: { name: 'STAFF' } });

  // 2. Default Admin
  console.log('Seeding Default Admin (if missing)...');
  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@sdmcet.ac.in' } });
  if (!existingAdmin) {
    const adminPassword = process.env.SEED_DEFAULT_PASSWORD || 'ChangeMe@123';
    const hashed = await hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: 'admin@sdmcet.ac.in',
        passwordHash: hashed,
        status: 'ACTIVE',
        roles: { connect: { id: adminRole.id } }
      }
    });
  }

  // 3. Departments
  console.log('Seeding Departments...');
  const depts = [
    { code: 'CSE', name: 'Computer Science & Engineering' },
    { code: 'ISE', name: 'Information Science & Engineering' },
    { code: 'ECE', name: 'Electronics & Communication Engineering' },
    { code: 'EEE', name: 'Electrical & Electronics Engineering' },
    { code: 'MECH', name: 'Mechanical Engineering' },
    { code: 'CIVIL', name: 'Civil Engineering' },
    { code: 'CHEM_ENG', name: 'Chemical Engineering' },
    { code: 'AIML', name: 'Artificial Intelligence & Machine Learning' },
    { code: 'MBA', name: 'Master of Business Administration' },
    { code: 'PHY', name: 'Department of Physics' },
    { code: 'CHEM', name: 'Department of Chemistry' },
    { code: 'MATH', name: 'Department of Mathematics' },
    { code: 'ADMIN', name: 'Central Administration' }
  ];

  const createdDepts: Record<string, any> = {};
  for (const d of depts) {
    createdDepts[d.code] = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: d
    });
  }

  // 4. Leave Types
  console.log('Seeding Leave Types...');
  const cl = await prisma.leaveType.upsert({
    where: { code: 'CL' }, update: {}, create: { code: 'CL', name: 'Casual Leave', tracksBalance: true }
  });
  const el = await prisma.leaveType.upsert({
    where: { code: 'EL' }, update: {}, create: { code: 'EL', name: 'Earned Leave', tracksBalance: true }
  });
  const ood = await prisma.leaveType.upsert({
    where: { code: 'OOD' }, update: {}, create: { code: 'OOD', name: 'Official On Duty', tracksBalance: false }
  });

  // 5. Leave Policies
  console.log('Seeding Leave Policies (if missing)...');
  const existingClPolicy = await prisma.leavePolicy.findFirst({ where: { leaveTypeId: cl.id, employeeCategory: 'TEACHING' } });
  if (!existingClPolicy) {
    await prisma.leavePolicy.create({
      data: { leaveTypeId: cl.id, employeeCategory: 'TEACHING', annualEntitlement: 15, holidayCountingRule: 'IGNORE', combinationRules: [], effectiveFrom: new Date('2026-01-01') }
    });
  }
  
  const existingElPolicyTeach = await prisma.leavePolicy.findFirst({ where: { leaveTypeId: el.id, employeeCategory: 'TEACHING' } });
  if (!existingElPolicyTeach) {
    await prisma.leavePolicy.create({
      data: { leaveTypeId: el.id, employeeCategory: 'TEACHING', annualEntitlement: 60, holidayCountingRule: 'COUNT_SANDWICHED', combinationRules: [], effectiveFrom: new Date('2026-01-01') }
    });
  }

  const existingElPolicyNonTeach = await prisma.leavePolicy.findFirst({ where: { leaveTypeId: el.id, employeeCategory: 'NON_TEACHING' } });
  if (!existingElPolicyNonTeach) {
    await prisma.leavePolicy.create({
      data: { leaveTypeId: el.id, employeeCategory: 'NON_TEACHING', annualEntitlement: 30, holidayCountingRule: 'COUNT_SANDWICHED', combinationRules: [], effectiveFrom: new Date('2026-01-01') }
    });
  }

  // 6. Workflow
  console.log('Seeding Workflow (if missing)...');
  const existingWf = await prisma.workflowDefinition.findUnique({ where: { code: 'WF_STANDARD' } });
  if (!existingWf) {
    await prisma.workflowDefinition.create({
      data: {
        code: 'WF_STANDARD', name: 'Standard Flow', priority: 0, isActive: true, effectiveFrom: new Date('2026-01-01'),
        steps: {
          create: [
            { stepKey: 'START', displayName: 'Draft', sequence: 0, actorType: 'EMPLOYEE' },
            { stepKey: 'DUTY_ADJUSTMENT', displayName: 'Pending Duty Adjustment', sequence: 1, actorType: 'DUTY_ADJUSTER' },
            { stepKey: 'HOD', displayName: 'Pending HOD Approval', sequence: 2, actorType: 'HOD' },
            { stepKey: 'DEAN', displayName: 'Pending Dean Validation', sequence: 3, actorType: 'DEAN' },
            { stepKey: 'PRINCIPAL', displayName: 'Pending Principal Sanction', sequence: 4, actorType: 'PRINCIPAL' },
            { stepKey: 'COMPLETED', displayName: 'Sanctioned', sequence: 5, actorType: 'SYSTEM', isTerminal: true },
            { stepKey: 'REJECTED', displayName: 'Rejected', sequence: 6, actorType: 'SYSTEM', isTerminal: true },
            { stepKey: 'RETURNED', displayName: 'Returned', sequence: 7, actorType: 'SYSTEM', isTerminal: true }
          ]
        },
        transitions: {
          create: [
            { fromStepKey: 'START', action: 'SUBMIT', toStepKey: 'DUTY_ADJUSTMENT', conditions: { all: [{ field: 'employee.category', op: 'EQ', value: 'TEACHING' }] } },
            { fromStepKey: 'START', action: 'SUBMIT', toStepKey: 'HOD', conditions: { all: [{ field: 'employee.category', op: 'NEQ', value: 'TEACHING' }] } },
            { fromStepKey: 'DUTY_ADJUSTMENT', action: 'APPROVE', toStepKey: 'HOD' },
            { fromStepKey: 'DUTY_ADJUSTMENT', action: 'REJECT', toStepKey: 'REJECTED' },
            { fromStepKey: 'HOD', action: 'APPROVE', toStepKey: 'DEAN', conditions: { all: [{ field: 'leaveType.code', op: 'IN', value: ['EL', 'VEL', 'COML'] }] } },
            { fromStepKey: 'HOD', action: 'APPROVE', toStepKey: 'PRINCIPAL', conditions: { all: [{ field: 'leaveType.code', op: 'NOT_IN', value: ['EL', 'VEL', 'COML'] }] } },
            { fromStepKey: 'HOD', action: 'REJECT', toStepKey: 'REJECTED' },
            { fromStepKey: 'HOD', action: 'RETURN', toStepKey: 'RETURNED' },
            { fromStepKey: 'DEAN', action: 'APPROVE', toStepKey: 'PRINCIPAL' },
            { fromStepKey: 'DEAN', action: 'REJECT', toStepKey: 'REJECTED' },
            { fromStepKey: 'DEAN', action: 'RETURN', toStepKey: 'RETURNED' },
            { fromStepKey: 'PRINCIPAL', action: 'APPROVE', toStepKey: 'COMPLETED' },
            { fromStepKey: 'PRINCIPAL', action: 'REJECT', toStepKey: 'REJECTED' },
            { fromStepKey: 'PRINCIPAL', action: 'RETURN', toStepKey: 'RETURNED' }
          ]
        }
      }
    });
  }

  // 7. Demo accounts (only if missing, just for manual testing locally, in prod we wouldn't want this but I will leave it safe)
  console.log('Seeding Demo Employees (if missing)...');
  const pass = await hash('password123', 10);
  
  if (!(await prisma.user.findUnique({ where: { email: 'principal@sdmcet.ac.in' } }))) {
    const principalUser = await prisma.user.create({ data: { email: 'principal@sdmcet.ac.in', passwordHash: pass, status: 'ACTIVE', roles: { connect: { id: principalRole.id } } } });
    await prisma.employee.create({ data: { employeeId: 'EMP-PRINCIPAL', fullName: 'Dr. Ramesh Principal', designation: 'Principal / Director', userId: principalUser.id, departmentId: createdDepts['ADMIN'].id, category: 'NON_TEACHING', serviceType: 'NON_VACATION', tenureStatus: 'PERMANENT' }});
  }

  if (!(await prisma.user.findUnique({ where: { email: 'cse_hod@sdmcet.ac.in' } }))) {
    const hodUser = await prisma.user.create({ data: { email: 'cse_hod@sdmcet.ac.in', passwordHash: pass, status: 'ACTIVE', roles: { connect: { id: hodRole.id } } } });
    const cseHod = await prisma.employee.create({ data: { employeeId: 'EMP-CSE-HOD', fullName: 'Dr. Sarah HOD', designation: 'Head of Department', userId: hodUser.id, departmentId: createdDepts['CSE'].id, category: 'TEACHING', serviceType: 'VACATION', tenureStatus: 'PERMANENT' }});
    await prisma.department.update({ where: { id: createdDepts['CSE'].id }, data: { hodId: cseHod.id } });
  }

  if (!(await prisma.user.findUnique({ where: { email: 'faculty@sdmcet.ac.in' } }))) {
    const facultyUser = await prisma.user.create({ data: { email: 'faculty@sdmcet.ac.in', passwordHash: pass, status: 'ACTIVE', roles: { connect: { id: staffRole.id } } } });
    const faculty = await prisma.employee.create({ data: { employeeId: 'EMP-001', fullName: 'Prof. John Doe', designation: 'Assistant Professor', userId: facultyUser.id, departmentId: createdDepts['CSE'].id, category: 'TEACHING', serviceType: 'VACATION', tenureStatus: 'PERMANENT' }});
    
    const hod = await prisma.employee.findFirst({ where: { userId: (await prisma.user.findUnique({ where: { email: 'cse_hod@sdmcet.ac.in' } }))!.id } });
    
    await prisma.leaveTransaction.createMany({
      data: [
        { employeeId: faculty.id, leaveTypeCode: 'CL', transactionType: 'CREDIT', amount: 15, notes: 'Initial' },
        { employeeId: faculty.id, leaveTypeCode: 'EL', transactionType: 'CREDIT', amount: 45, notes: 'Initial' },
        { employeeId: hod!.id, leaveTypeCode: 'CL', transactionType: 'CREDIT', amount: 15, notes: 'Initial' },
      ]
    });
  }

  console.log('Safe Seed Complete!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => await prisma.$disconnect());
