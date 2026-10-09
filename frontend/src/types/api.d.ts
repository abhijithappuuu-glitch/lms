export interface Employee {
  id: string;
  fullName: string;
  employeeId: string;
  departmentId: string;
}

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  annualEntitlement: number;
  tracksBalance: boolean;
}

export interface DashboardMetrics {
  balances?: Record<string, number>;
  upcomingLeaves?: number;
  totalFaculty?: number;
  onLeaveToday?: number;
  pendingRequests?: number;
  approvedThisMonth?: number;
}

export interface ChartData {
  distribution: { name: string; value: number }[];
  trend: { name: string; value: number }[];
  departmentStats?: { name: string; activeLeaves: number }[];
}

export interface LeaveApplication {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  leaveType: {
    code: string;
    name: string;
  };
}
