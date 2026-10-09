import { Controller, Get, Put, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { GetUser } from '../auth/get-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(@GetUser() user: JwtPayload) {
    if (!user.userId) throw new ForbiddenException();
    return this.notificationService.getNotifications(user.userId);
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @GetUser() user: JwtPayload) {
    if (!user.userId) throw new ForbiddenException();
    return this.notificationService.markAsRead(id, user.userId);
  }
}
