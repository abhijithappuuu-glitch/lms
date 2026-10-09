import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from './pdf.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { GetUser } from '../auth/get-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave/applications/:id/pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get()
  async getPdf(@Param('id') id: string, @Res() res: Response, @GetUser() user: JwtPayload) {
    const pdfDoc = await this.pdfService.generateLeaveApplicationPdf(id, user);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=leave_application_${id}.pdf`);
    
    pdfDoc.pipe(res);
    (pdfDoc as any).end();
  }
}
