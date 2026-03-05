import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withRouteContext } from '@/lib/http/route';
import { OtpChallengeService } from '@/lib/security/otp/OtpChallengeService';
import { logAudit, logger } from '@/lib/logger';
import { env } from '@/lib/config/env';

const schema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export const POST = withRouteContext(async (req: NextRequest, ctx) => {
  try {
    if (!ctx.userId) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', requestId: ctx.requestId }, { status: 401 });
    }

    try {
      env.otpPepper();
    } catch {
      return NextResponse.json({ error: 'Service unavailable', code: 'ENV_MISCONFIGURED', requestId: ctx.requestId }, { status: 503 });
    }

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', code: 'VALIDATION_ERROR', requestId: ctx.requestId }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { id: true, kycStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED', requestId: ctx.requestId }, { status: 401 });
    }

    logger.info({ requestId: ctx.requestId, userId: user.id, kycStatus: user.kycStatus }, 'security.2fa.verify.request');

    const otpService = new OtpChallengeService();
    const result = await otpService.consume({
      userId: user.id,
      purpose: 'MFA_ENROLL',
      code: parsed.data.code,
    });

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
      data: { phoneVerified: true },
    });

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

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error, requestId: ctx.requestId, userId: ctx.userId, path: ctx.path }, 'security.2fa.verify.error');
    return NextResponse.json({ error: 'Internal server error', requestId: ctx.requestId }, { status: 500 });
  }
});
