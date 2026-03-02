import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { smsService } from '@/lib/services/sms';
import { withRouteContext } from '@/lib/http/route';
import { OtpChallengeService } from '@/lib/security/otp/OtpChallengeService';
import { logAudit } from '@/lib/logger';

const schema = z.object({});

export const POST = withRouteContext(async (req: NextRequest, ctx) => {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId! },
    select: { id: true, phone: true },
  });

  if (!user || !user.phone) {
    return NextResponse.json({ error: 'Phone number required. Please update profile first.' }, { status: 400 });
  }

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

  return NextResponse.json({ success: true, ttlSeconds });
});
