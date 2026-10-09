import { Controller, Post, Body, Get, Param, UnauthorizedException, BadRequestException, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  @Post('login')
  async login(@Body() body: any) {
    const { email, password } = body;
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: true,
        employee: { include: { department: true } }
      }
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    if (user.status === 'PENDING') throw new UnauthorizedException('Account pending approval');
    if (user.status === 'REJECTED') throw new UnauthorizedException('Account rejected');

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is missing');

    const token = jwt.sign(
      { userId: user.id, role: user.roles[0]?.name, employeeId: user.employee?.employeeId, departmentId: user.employee?.departmentId },
      secret,
      { expiresIn: '1h' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.roles[0]?.name,
        employeeId: user.employee?.employeeId,
        fullName: user.employee?.fullName,
        department: user.employee?.department?.name,
        departmentId: user.employee?.departmentId
      }
    };
  }

  @Post('register')
  async register(@Body() body: any) {
    const { email, password, fullName, departmentId, serviceType, tenureStatus, category } = body;
    
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(password, 10);
    
    const facultyRole = await this.prisma.role.findFirst({ where: { name: 'STAFF' } });
    if (!facultyRole) {
      throw new BadRequestException('Configuration error: Default role not found');
    }

    // In a real app we'd wrap in transaction
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        status: 'PENDING',
        roles: { connect: { id: facultyRole.id } }
      }
    });

    // Generate random EMP ID for demo
    const empId = `EMP-${Math.floor(Math.random() * 10000)}`;

    const employee = await this.prisma.employee.create({
      data: {
        employeeId: empId,
        fullName,
        userId: user.id,
        departmentId,
        category: category || 'TEACHING',
        serviceType: serviceType || 'VACATION',
        tenureStatus: tenureStatus || 'PERMANENT',
      }
    });

    return { success: true, message: 'Registration submitted for approval.' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'SECRETARY')
  @Get('pending-registrations')
  async getPendingRegistrations() {
    return this.prisma.user.findMany({
      where: { status: 'PENDING' },
      include: { employee: { include: { department: true } } }
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'SECRETARY')
  @Post('approve-registration/:id')
  async approveRegistration(@Param('id') id: string, @Body() body: { status: string }) {
    await this.prisma.user.update({
      where: { id },
      data: { status: body.status } // ACTIVE or REJECTED
    });
    return { success: true };
  }
}
