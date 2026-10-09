import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DutyAdjustmentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Colleague accepts the duty adjustment request.
   * This progresses the application status from PENDING_DUTY_ADJUSTMENT to PENDING_HOD (or whatever the next stage is).
   */
  async acceptDutyAdjustment(applicationId: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const app = await tx.leaveApplication.findUnique({
        where: { id: applicationId },
        include: { employee: true },
      });

      if (!app) {
        throw new BadRequestException('Leave application not found');
      }

      if (app.status !== 'PENDING_DUTY_ADJUSTMENT') {
        throw new BadRequestException('Application is not pending duty adjustment');
      }

      const adjustee = await tx.employee.findUnique({
        where: { userId: actorId },
      });

      if (!adjustee || app.dutyAdjustedTo !== adjustee.id) {
        throw new BadRequestException('You are not authorized to accept this duty adjustment');
      }

      // Progress the application to the next workflow stage
      // (For this phase, we simply set it to PENDING_HOD as the next standard stage)
      const updatedApp = await tx.leaveApplication.update({
        where: { id: applicationId },
        data: { status: 'PENDING_HOD' },
      });

      // Log the approval action
      await tx.approvalAction.create({
        data: {
          applicationId: app.id,
          actorId: actorId,
          stage: 'DUTY_ADJUSTMENT',
          decision: 'RECOMMENDED',
          remarks: 'Duty adjustment accepted by colleague',
        },
      });

      return updatedApp;
    });
  }

  /**
   * Colleague rejects the duty adjustment request.
   * This returns the application to the original applicant as RETURNED.
   */
  async rejectDutyAdjustment(applicationId: string, actorId: string, remarks: string) {
    return this.prisma.$transaction(async (tx) => {
      const app = await tx.leaveApplication.findUnique({
        where: { id: applicationId },
      });

      if (!app) {
        throw new BadRequestException('Leave application not found');
      }

      if (app.status !== 'PENDING_DUTY_ADJUSTMENT') {
        throw new BadRequestException('Application is not pending duty adjustment');
      }

      const adjustee = await tx.employee.findUnique({
        where: { userId: actorId },
      });

      if (!adjustee || app.dutyAdjustedTo !== adjustee.id) {
        throw new BadRequestException('You are not authorized to reject this duty adjustment');
      }

      // Return the application
      const updatedApp = await tx.leaveApplication.update({
        where: { id: applicationId },
        data: { status: 'RETURNED' },
      });

      // Log the rejection
      await tx.approvalAction.create({
        data: {
          applicationId: app.id,
          actorId: actorId,
          stage: 'DUTY_ADJUSTMENT',
          decision: 'RETURNED',
          remarks: remarks || 'Duty adjustment rejected by colleague',
        },
      });

      return updatedApp;
    });
  }
}
