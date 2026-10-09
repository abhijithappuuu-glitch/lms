import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { JwtPayload } from '../auth/jwt.strategy';
const pdfMake = require('pdfmake');

@Injectable()
export class PdfService {
  constructor(private prisma: PrismaService) {}

  async generateLeaveApplicationPdf(applicationId: string, user: JwtPayload): Promise<NodeJS.ReadableStream> {
    const app = await this.prisma.leaveApplication.findUnique({
      where: { id: applicationId },
      include: {
        employee: { include: { department: true } },
        leaveType: true,
        dutyAdjustee: true,
        approvals: {
          include: { actor: { include: { employee: true } } },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!app) {
      throw new NotFoundException('Leave application not found');
    }

    // Authorization
    const isOwner = app.employee.employeeId === user.employeeId;
    const isHodOfDept = user.role === 'HOD' && app.employee.departmentId === user.departmentId;
    const isPrincipal = user.role === 'PRINCIPAL';
    // For DEAN/SECRETARY/SYSTEM_ADMIN, we deny unless it is explicitly needed. We allow SYSTEM_ADMIN to view all for debugging.
    const isAdmin = user.role === 'SYSTEM_ADMIN';

    if (!isOwner && !isHodOfDept && !isPrincipal && !isAdmin) {
      throw new ForbiddenException('You do not have permission to view this PDF');
    }

    // Configure fonts globally or pass them in createPdf. We'll set them in pdfMake.fonts
    pdfMake.fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      },
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
    
    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        { text: 'SDMCET', style: 'header', alignment: 'center' },
        { text: 'Digital Staff Leave Application', style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] },
        
        // Section 1: Applicant
        { text: '1. Applicant Details', style: 'sectionHeader' },
        {
          table: {
            widths: ['30%', '70%'],
            body: [
              ['Name', app.employee.fullName],
              ['Designation', app.employee.designation || 'N/A'],
              ['Department', app.employee.department.name],
              ['Employee ID', app.employee.employeeId],
            ]
          },
          margin: [0, 0, 0, 20]
        },

        // Section 2: Leave Details
        { text: '2. Leave Details', style: 'sectionHeader' },
        {
          table: {
            widths: ['30%', '70%'],
            body: [
              ['Leave Type', app.leaveType.name],
              ['Start Date', app.startDate.toDateString()],
              ['End Date', app.endDate.toDateString()],
              ['Total Days', app.totalDays.toString()],
              ['Reason', app.reason],
            ]
          },
          margin: [0, 0, 0, 20]
        },

        // Section 3: Ledger Snapshot (Placeholder for PDF structure)
        { text: '3. Ledger Snapshot', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', '*', '*'],
            body: [
              [{ text: 'Balance Before', style: 'tableHeader' }, { text: 'Days Applied', style: 'tableHeader' }, { text: 'Estimated After', style: 'tableHeader' }],
              ['--', app.totalDays.toString(), '--'] // Actual ledger calc would require fetching ledger entries
            ]
          },
          margin: [0, 0, 0, 20]
        },

        // Section 4: Duty Adjustment
        { text: '4. Duty Adjustment', style: 'sectionHeader' },
        {
          table: {
            widths: ['30%', '70%'],
            body: [
              ['Covering Peer', app.dutyAdjustee ? app.dutyAdjustee.fullName : 'N/A'],
              ['Peer Employee ID', app.dutyAdjustee ? app.dutyAdjustee.employeeId : 'N/A'],
            ]
          },
          margin: [0, 0, 0, 20]
        },

        // Section 5: Approval Trail
        { text: '5. Approval Trail', style: 'sectionHeader' },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', 'auto', '*'],
            body: [
              [{ text: 'Date', style: 'tableHeader' }, { text: 'Actor', style: 'tableHeader' }, { text: 'Decision', style: 'tableHeader' }, { text: 'Remarks', style: 'tableHeader' }],
              ...app.approvals.map(a => [
                a.timestamp.toDateString(),
                a.actor.employee?.fullName || 'Admin',
                a.decision,
                a.remarks || '-'
              ])
            ]
          },
          margin: [0, 0, 0, 30]
        },

        // Footer
        { text: `Application ID: ${app.id}`, style: 'footer', alignment: 'center' },
        { text: `Generated electronically on ${new Date().toUTCString()}`, style: 'footer', alignment: 'center' },
      ],
      styles: {
        header: { fontSize: 22, bold: true },
        subheader: { fontSize: 14, bold: true },
        sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] },
        tableHeader: { bold: true, fillColor: '#f3f4f6' },
        footer: { fontSize: 8, color: 'gray', italics: true }
      }
    };

    const pdfDoc = pdfMake.createPdf(docDefinition);
    return new Promise((resolve, reject) => {
      // In pdfmake 0.3 for node, we get the stream via getStream()
      try {
        const stream = pdfDoc.getStream();
        resolve(stream);
      } catch(e) {
        reject(e);
      }
    });
  }
}
