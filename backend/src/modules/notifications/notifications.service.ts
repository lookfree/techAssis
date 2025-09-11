import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType, NotificationPriority, Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(notificationData: Prisma.NotificationCreateInput) {
    return this.prisma.notification.create({
      data: notificationData
    });
  }

  async findByUser(userId: string, params?: {
    isRead?: boolean;
    type?: NotificationType;
    limit?: number;
  }) {
    const { isRead, type, limit } = params || {};
    
    let where: Prisma.NotificationWhereInput = { userId };
    
    if (isRead !== undefined) {
      where.isRead = isRead;
    }
    
    if (type) {
      where.type = type;
    }

    return this.prisma.notification.findMany({
      where,
      take: limit || 50,
      orderBy: { createdAt: 'desc' }
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false }
    });
  }

  // 系统通知创建方法
  async createSystemNotification(
    userIds: string[],
    title: string,
    content: string,
    priority: NotificationPriority = 'medium'
  ) {
    const notifications = userIds.map(userId => ({
      userId,
      type: NotificationType.system,
      title,
      content,
      priority
    }));

    return this.prisma.notification.createMany({
      data: notifications
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id, userId }
    });
  }
}