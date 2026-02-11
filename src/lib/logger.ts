
import pino from 'pino';
import { prisma } from './db';

// Base logger (console/pino)
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
  base: {
    env: process.env.NODE_ENV,
  },
});

// DB Logger Function
export async function logAudit(data: {
    userId?: string;
    action: string;
    status: string;
    ipAddress?: string;
    userAgent?: string;
    method?: string;
    path?: string;
    metadata?: any;
    duration?: number;
}) {
    // Fire and forget (don't block the request)
    try {
        await prisma.auditLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                status: data.status,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                method: data.method,
                path: data.path,
                metadata: data.metadata,
                duration: data.duration
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'Failed to write audit log');
    }
}
