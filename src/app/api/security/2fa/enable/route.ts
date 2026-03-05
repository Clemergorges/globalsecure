import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { smsService } from '@/lib/services/sms';
import { withRouteContext } from '@/lib/http/route';
import { OtpChallengeService } from '@/lib/security/otp/OtpChallengeService';
import { logAudit, logger } from '@/lib/logger';

const schema = z.object({});

export const POST = withRouteContext(async (req: NextRequest, ctx) => {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId! },
      select: { id: true, phone: true, phoneVerified: true, kycStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (!user.phone) {
      return NextResponse.json(
        { error: 'Phone number required. Please update profile first.', code: 'PHONE_REQUIRED' },
        { status: 409 },
      );
    }

    logger.info({ requestId: ctx.requestId, userId: user.id, kycStatus: user.kycStatus }, 'security.2fa.enable.request');

    const otpService = new OtpChallengeService();
    const { code, expiresAt, ttlSeconds } = await otpService.create({
      userId: user.id,
      purpose: 'MFA_ENROLL',
      ttlSeconds: 10 * 60,
      maxAttempts: 5,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    await smsService.sendOTP(user.phone, code);

    logAudit({
      userId: user.id,
      action: 'SECURITY_2FA_OTP_SENT',
      status: 'SUCCESS',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      method: ctx.method,
      path: ctx.path,
      metadata: { requestId: ctx.requestId, ttlSeconds, expiresAt: expiresAt.toISOString() },
    }).catch(() => {});

    return NextResponse.json({ success: true, ttlSeconds, phoneVerified: user.phoneVerified });
  } catch (error) {
    logger.error({ err: error, requestId: ctx.requestId, userId: ctx.userId, path: ctx.path }, 'security.2fa.enable.error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
