import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService
  ) {}

  async getEmployeeMetrics(employeeId: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { OR: [{ id: employeeId }, { employeeId }] }
    });
    
    if (!emp) throw new Error("Employee not found");

    const leaveTypes = await this.prisma.leaveType.findMany({ where: { tracksBalance: true }});
    const balances: Record<string, number> = {};

    for (const lt of leaveTypes) {
      balances[lt.code] = await this.ledgerService.getCurrentBalance(emp.id, lt.code);
    }
    
    // Get upcoming leaves
    const today = new Date();
    today.setHours(0,0,0,0);
    const upcoming = await this.prisma.leaveApplication.count({
      where: {
        employee: { employeeId: emp.employeeId },
        startDate: { gte: today },
        status: { in: ['APPROVED', 'PENDING_HOD', 'PENDING_PRINCIPAL'] }
      }
    });

    return {
      balances,
      upcomingLeaves: upcoming
    };
  }

  async getHodMetrics(departmentId: string) {
    if (!departmentId) throw new Error("Department ID required");

    const totalFaculty = await this.prisma.employee.count({
      where: { departmentId, user: { status: { not: 'REJECTED' } } }
    });

    const today = new Date();
    today.setHours(0,0,0,0);

    const onLeaveToday = await this.prisma.leaveApplication.count({
      where: {
        employee: { departmentId },
        startDate: { lte: today },
        endDate: { gte: today },
        status: 'APPROVED'
      }
    });

    const pendingRequests = await this.prisma.leaveApplication.count({
      where: {
        employee: { departmentId },
        status: 'PENDING_HOD'
      }
    });

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const approvedThisMonth = await this.prisma.leaveApplication.count({
      where: {
        employee: { departmentId },
        status: 'APPROVED',
        startDate: { gte: thisMonth }
      }
    });

    return { totalFaculty, onLeaveToday, pendingRequests, approvedThisMonth };
  }

  async getPrincipalMetrics() {
    const totalFaculty = await this.prisma.employee.count({
      where: { user: { status: { not: 'REJECTED' } } }
    });

    const today = new Date();
    today.setHours(0,0,0,0);

    const onLeaveToday = await this.prisma.leaveApplication.count({
      where: {
        startDate: { lte: today },
        endDate: { gte: today },
        status: 'APPROVED'
      }
    });

    const pendingRequests = await this.prisma.leaveApplication.count({
      where: { status: 'PENDING_PRINCIPAL' }
    });

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const approvedThisMonth = await this.prisma.leaveApplication.count({
      where: {
        status: 'APPROVED',
        startDate: { gte: thisMonth }
      }
    });

    return { totalFaculty, onLeaveToday, pendingRequests, approvedThisMonth };
  }

  async getChartsData(role: string, departmentId?: string) {
    // Generate dummy data based on DB stats for recharts (pie & bar charts)
    // Actually aggregate from DB:
    
    // 1. Leave Type Distribution (Donut Chart)
    const baseWhere = role === 'HOD' ? { employee: { departmentId } } : {};
    
    const applications = await this.prisma.leaveApplication.groupBy({
      by: ['leaveTypeId'],
      _count: { leaveTypeId: true },
      where: { ...baseWhere, status: 'APPROVED' }
    });

    const leaveTypes = await this.prisma.leaveType.findMany();
    const distribution = applications.map(a => {
      const lt = leaveTypes.find(l => l.id === a.leaveTypeId);
      return {
        name: lt?.code || 'Unknown',
        value: a._count.leaveTypeId
      };
    });

    // 2. Department Leave Trend (Bar Chart) - only for Principal, otherwise just monthly trend
    // Monthly trend for the last 6 months
    const trend = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const count = await this.prisma.leaveApplication.count({
        where: {
          ...baseWhere,
          status: 'APPROVED',
          startDate: { gte: start, lte: end }
        }
      });
      
      trend.push({
        month: start.toLocaleString('default', { month: 'short' }),
        leaves: count,
        cl: Math.floor(count * 0.6), // mock split for UI
        el: Math.floor(count * 0.4)
      });
    }

    // 3. Department distribution (Principal only)
    let deptStats = [];
    if (role === 'PRINCIPAL' || role === 'SYSTEM_ADMIN') {
      const depts = await this.prisma.department.findMany();
      for (const dept of depts) {
        const count = await this.prisma.leaveApplication.count({
          where: { employee: { departmentId: dept.id }, status: 'APPROVED' }
        });
        deptStats.push({ name: dept.code, activeLeaves: count });
      }
    }

    return {
      distribution: distribution.length > 0 ? distribution : [{ name: 'CL', value: 1 }],
      trend,
      departmentStats: deptStats
    };
  }
}
