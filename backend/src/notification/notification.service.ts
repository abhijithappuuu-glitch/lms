import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async notify(userId: string, title: string, message: string, relatedApplicationId?: string) {
    return this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        relatedApplicationId,
      },
    });
  }

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }
}
