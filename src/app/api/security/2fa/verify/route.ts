import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withRouteContext } from '@/lib/http/route';
import { OtpChallengeService } from '@/lib/security/otp/OtpChallengeService';
import { logAudit, logger } from '@/lib/logger';

const schema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export const POST = withRouteContext(async (req: NextRequest, ctx) => {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId! },
      select: { id: true, phone: true, kycStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    logger.info({ requestId: ctx.requestId, userId: user.id, kycStatus: user.kycStatus }, 'security.2fa.verify.request');

    const otpService = new OtpChallengeService();
    const result = await otpService.consumeLatest({ userId: user.id, code: parsed.data.code });

    if (!result.ok) {
      logAudit({
        userId: user.id,
        action: 'SECURITY_2FA_VERIFY_FAILED',
        status: 'FAILURE',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        method: ctx.method,
        path: ctx.path,
        metadata: { requestId: ctx.requestId, reason: result.reason },
      }).catch(() => {});
      return NextResponse.json({ error: 'Invalid or expired code', code: result.reason }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true, twoFactorEnabled: true },
    });

    logger.info(
      { requestId: ctx.requestId, userId: user.id, phoneLast4: user.phone ? user.phone.slice(-4) : null },
      'security.2fa.verify.success',
    );

    logAudit({
      userId: user.id,
      action: 'SECURITY_2FA_ENABLED',
      status: 'SUCCESS',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      method: ctx.method,
      path: ctx.path,
      metadata: { requestId: ctx.requestId },
    }).catch(() => {});

    return NextResponse.json({ success: true, phoneVerified: true, twoFactorEnabled: true });
  } catch (error) {
    logger.error({ err: error, requestId: ctx.requestId, userId: ctx.userId, path: ctx.path }, 'security.2fa.verify.error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
