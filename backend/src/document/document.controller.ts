import { Controller, Post, Param, UseInterceptors, UploadedFile, Body, BadRequestException, UseGuards, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { GetUser } from '../auth/get-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave/applications/:id/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only PDF, JPG, and PNG are allowed'), false);
      }
    }
  }))
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') documentType: string,
    @GetUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.documentService.uploadDocument(id, file, documentType, user);
  }
}
