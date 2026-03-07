
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

function sanitizeMetadata(value: any): any {
  const blockedKeys = new Set([
    'password',
    'currentPassword',
    'newPassword',
    'passwordHash',
    'otp',
    'otpCode',
    'code',
    'token',
    'auth_token',
    'jwt',
    'authorization',
    'cookie',
    'set-cookie',
    'stack',
  ]);

  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(sanitizeMetadata);

  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (blockedKeys.has(k)) continue;
      out[k] = sanitizeMetadata(v);
    }
    return out;
  }

  return String(value);
}

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
                metadata: sanitizeMetadata(data.metadata),
                duration: data.duration
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'Failed to write audit log');
    }
}
