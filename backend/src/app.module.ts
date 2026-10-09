import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { LedgerModule } from './ledger/ledger.module';
import { HealthController } from './health/health.controller';
import { DutyAdjustmentController } from './workflow/duty-adjustment.controller';
import { DutyAdjustmentService } from './workflow/duty-adjustment.service';
import { DocumentModule } from './document/document.module';
import { NotificationModule } from './notification/notification.module';
import { PdfModule } from './pdf/pdf.module';
import { LeaveApplicationController } from './workflow/leave-application.controller';
import { LeavePolicyService } from './leave-policy/leave-policy.service';
import { CalendarService } from './leave-policy/calendar.service';
import { DataController } from './common/data.controller';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DelegationModule } from './delegation/delegation.module';
import { WorkflowEngineService } from './workflow/workflow-engine.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    LedgerModule,
    DocumentModule,
    NotificationModule,
    PdfModule,
    DashboardModule,
    AuthModule,
    DelegationModule,
  ],
  controllers: [HealthController, DutyAdjustmentController, LeaveApplicationController, DataController],
  providers: [DutyAdjustmentService, LeavePolicyService, CalendarService, WorkflowEngineService],
})
export class AppModule {}
