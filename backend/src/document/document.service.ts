import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/jwt.strategy';

@Injectable()
export class DocumentService {
  constructor(private prisma: PrismaService) {}

  async uploadDocument(applicationId: string, file: Express.Multer.File, documentType: string, user: JwtPayload) {
    // Check if application exists
    const app = await this.prisma.leaveApplication.findUnique({
      where: { id: applicationId },
      include: { employee: true },
    });

    if (!app) {
      throw new BadRequestException('Leave application not found');
    }

    // Authorization
    const isOwner = app.employee.employeeId === user.employeeId;
    const isHodOfDept = user.role === 'HOD' && app.employee.departmentId === user.departmentId;
    const isPrincipal = user.role === 'PRINCIPAL';
    const isAdmin = user.role === 'SYSTEM_ADMIN';

    if (!isOwner && !isHodOfDept && !isPrincipal && !isAdmin) {
      throw new ForbiddenException('You do not have permission to modify documents for this application');
    }

    // Save metadata
    return this.prisma.document.create({
      data: {
        applicationId,
        fileUrl: file.path,
        documentType: documentType || 'GENERAL',
      },
    });
  }
}
