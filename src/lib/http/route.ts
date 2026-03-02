import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/session';
import { logAudit, logger } from '@/lib/logger';
import { monitor } from '@/lib/monitor';

export type RouteContext = {
  requestId: string;
  ipAddress: string;
  userAgent: string;
  method: string;
  path: string;
  userId: string | null;
  role: string | null;
  sessionId: string | null;
  email: string | null;
};

export type RouteOptions = {
  requireAuth?: boolean;
  auditAction?: string;
};

export function withRouteContext(
  handler: (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>,
  options: RouteOptions = {},
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
    const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
    const userAgent = req.headers.get('user-agent') ?? 'unknown';
    const method = req.method;
    const path = req.nextUrl.pathname;

    const session = await validateSession(req).catch(() => null);
    const ctx: RouteContext = {
      requestId,
      ipAddress,
      userAgent,
      method,
      path,
      userId: session?.userId ?? null,
      role: session?.role ?? null,
      sessionId: session?.sessionId ?? null,
      email: session?.email ?? null,
    };

    if (options.requireAuth !== false && !ctx.userId) {
      await logAudit({
        action: 'AUTH_FAILURE',
        status: '401',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        method: ctx.method,
        path: ctx.path,
        metadata: { requestId: ctx.requestId },
      }).catch(() => {});

      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      res.headers.set('x-request-id', requestId);
      return res;
    }

    const start = Date.now();
    try {
      logger.info({ requestId, path, method, userId: ctx.userId, role: ctx.role }, 'route.start');

      const res = await handler(req, ctx);
      res.headers.set('x-request-id', requestId);

      if (options.auditAction) {
        logAudit({
          userId: ctx.userId ?? undefined,
          action: options.auditAction,
          status: String(res.status),
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
          method: ctx.method,
          path: ctx.path,
          metadata: { requestId },
          duration: Date.now() - start,
        }).catch(() => {});
      }

      logger.info({ requestId, path, method, status: res.status, durationMs: Date.now() - start }, 'route.end');
      return res;
    } catch (error) {
      monitor.error(error, { requestId, path, method, userId: ctx.userId, role: ctx.role });

      await logAudit({
        userId: ctx.userId ?? undefined,
        action: 'SERVER_ERROR',
        status: '500',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        method: ctx.method,
        path: ctx.path,
        metadata: { requestId },
        duration: Date.now() - start,
      }).catch(() => {});

      const res = NextResponse.json({ error: 'Internal server error', requestId }, { status: 500 });
      res.headers.set('x-request-id', requestId);
      return res;
    }
  };
}
