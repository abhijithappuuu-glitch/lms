import { Controller, Get, UseGuards, ForbiddenException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GetUser } from '../auth/get-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('employee/metrics')
  getEmployeeMetrics(@GetUser() user: JwtPayload) {
    if (!user.employeeId) throw new ForbiddenException('User is not an employee');
    return this.dashboardService.getEmployeeMetrics(user.employeeId);
  }

  @Roles('HOD')
  @Get('hod/metrics')
  getHodMetrics(@GetUser() user: JwtPayload) {
    if (!user.departmentId) throw new ForbiddenException('User has no department assigned');
    return this.dashboardService.getHodMetrics(user.departmentId);
  }

  @Roles('PRINCIPAL')
  @Get('principal/metrics')
  getPrincipalMetrics() {
    return this.dashboardService.getPrincipalMetrics();
  }

  @Get('charts')
  getChartsData(@GetUser() user: JwtPayload) {
    // Derive role from payload directly for chart context
    // If the user has HOD role, we show HOD charts for their department, etc.
    // In a real system, we'd check actual assigned roles more strictly, 
    // but the payload role string indicates their current view context.
    const role = user.role === 'PRINCIPAL' || user.role === 'HOD' ? user.role : 'EMPLOYEE';
    const departmentId = user.departmentId;
    return this.dashboardService.getChartsData(role, departmentId);
  }
}
