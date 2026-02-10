import { prisma } from '@/lib/db';
import { pusherService } from '@/lib/services/pusher';

export async function createNotification(params: {
  userId: string;
  title: string;
  body: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        body: params.body,
        type: params.type || 'INFO',
      },
    });

    // Real-time update via Pusher
    await pusherService.trigger(`user-${params.userId}`, 'notification-new', notification);

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function getNotifications(userId: string) {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export async function markAllAsRead(userId: string) {
  return await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}