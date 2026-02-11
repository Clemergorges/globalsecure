import pino from 'pino';
import { prisma } from './db';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = pino({
  level: logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:standard',
    },
  },
  base: {
    env: process.env.NODE_ENV,
  },
  serializers: {
    error: pino.stdSerializers.err,
    err: pino.stdSerializers.err,
  },
});

export const logAudit = async (userId: string, action: string, metadata?: any, ip?: string, userAgent?: string) => {
  // 1. Log to stdout (fast)
  logger.info({
    type: 'AUDIT',
    userId,
    action,
    metadata,
    ip,
    timestamp: new Date().toISOString(),
  }, `[AUDIT] User ${userId} performed ${action}`);

  // 2. Persist to DB (Async, non-blocking)
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        ipAddress: ip,
        userAgent: userAgent
      }
    });
  } catch (err) {
    logger.error({ err }, 'Failed to persist audit log');
  }
};
