import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withRouteContext } from '@/lib/http/route';
import { logAudit, logger } from '@/lib/logger';

export const POST = withRouteContext(async (_req: NextRequest, ctx) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId! },
      select: { id: true, phone: true, kycStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false },
    });

    logger.info(
      { requestId: ctx.requestId, userId: user.id, phoneLast4: user.phone ? user.phone.slice(-4) : null, kycStatus: user.kycStatus },
      'security.2fa.disable.success',
    );

    logAudit({
      userId: user.id,
      action: 'SECURITY_2FA_DISABLED',
      status: 'SUCCESS',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      method: ctx.method,
      path: ctx.path,
      metadata: { requestId: ctx.requestId },
    }).catch(() => {});

    return NextResponse.json({ success: true, twoFactorEnabled: false });
  } catch (error) {
    logger.error({ err: error, requestId: ctx.requestId, userId: ctx.userId, path: ctx.path }, 'security.2fa.disable.error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
