import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

type SensitiveActionType =
  | 'SENSITIVE_CHANGE_PASSWORD'
  | 'SENSITIVE_UPDATE_CONTACT'
  | 'SENSITIVE_HIGH_VALUE_TRANSFER';
import { prisma } from '@/lib/db';
import { comparePassword, hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/logger';
import { withRouteContext } from '@/lib/http/route';
import { OtpChallengeService } from '@/lib/security/otp/OtpChallengeService';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.discriminatedUnion('actionType', [
  z.object({
    actionType: z.literal('SENSITIVE_CHANGE_PASSWORD'),
    otpCode: z.string().regex(/^\d{6}$/),
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }),
  z.object({
    actionType: z.literal('SENSITIVE_UPDATE_CONTACT'),
    otpCode: z.string().regex(/^\d{6}$/),
    newEmail: z.string().email().optional(),
    newPhone: z.string().min(6).max(30).optional(),
  }),
  z.object({
    actionType: z.literal('SENSITIVE_HIGH_VALUE_TRANSFER'),
    otpCode: z.string().regex(/^\d{6}$/),
  }),
]);

function mapPurpose(actionType: SensitiveActionType) {
  if (actionType === 'SENSITIVE_CHANGE_PASSWORD') return 'PASSWORD_CHANGE' as const;
  if (actionType === 'SENSITIVE_UPDATE_CONTACT') return 'CONTACT_CHANGE' as const;
  return 'HIGH_VALUE_TRANSFER' as const;
}

export const POST = withRouteContext(async (req: NextRequest, ctx) => {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const purpose = mapPurpose(parsed.data.actionType);
  const rl = await checkRateLimit(`sensitive_otp_confirm:${ctx.userId}:${purpose}:${ctx.ipAddress}`, 10, 10 * 60);
  if (!rl.success) {
    const res = NextResponse.json({ error: 'Too many requests', code: 'RATE_LIMIT' }, { status: 429 });
    res.headers.set('x-ratelimit-limit', String(rl.limit));
    res.headers.set('x-ratelimit-remaining', String(rl.remaining));
    res.headers.set('x-ratelimit-reset', String(rl.reset));
    return res;
  }

  const otpService = new OtpChallengeService();
  const consume = await otpService.consume({
    userId: ctx.userId!,
    purpose,
    code: parsed.data.otpCode,
  });

  if (!consume.ok) {
    logAudit({
      userId: ctx.userId!,
      action: 'SENSITIVE_OTP_FAILURE',
      status: 'FAILURE',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      method: ctx.method,
      path: ctx.path,
      metadata: { requestId: ctx.requestId, actionType: parsed.data.actionType, reason: consume.reason },
    }).catch(() => {});
    return NextResponse.json({ error: 'Invalid or expired OTP', code: consume.reason }, { status: 400 });
  }

  if (parsed.data.actionType === 'SENSITIVE_HIGH_VALUE_TRANSFER') {
    if (!ctx.sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await prisma.session.update({
      where: { id: ctx.sessionId },
      data: { lastScaAt: new Date() },
    });
    logAudit({
      userId: ctx.userId!,
      action: 'SENSITIVE_SCA_HIGH_VALUE_TRANSFER_SUCCESS',
      status: 'SUCCESS',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      method: ctx.method,
      path: ctx.path,
      metadata: { requestId: ctx.requestId, sessionId: ctx.sessionId },
    }).catch(() => {});
    return NextResponse.json({ success: true });
  }

  if (parsed.data.actionType === 'SENSITIVE_CHANGE_PASSWORD') {
    const user = await prisma.user.findUnique({ where: { id: ctx.userId! }, select: { id: true, passwordHash: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const ok = await comparePassword(parsed.data.currentPassword, user.passwordHash);
    if (!ok) return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    logAudit({
      userId: ctx.userId!,
      action: 'SENSITIVE_CHANGE_PASSWORD_SUCCESS',
      status: 'SUCCESS',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      method: ctx.method,
      path: ctx.path,
      metadata: { requestId: ctx.requestId },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  }

  const { newEmail, newPhone } = parsed.data;
  if (!newEmail && !newPhone) {
    return NextResponse.json({ error: 'Validation Error', details: { newEmail: ['Required'], newPhone: ['Required'] } }, { status: 400 });
  }

  const update: any = {};
  if (newEmail) update.email = newEmail.toLowerCase().trim();
  if (newPhone) update.phone = newPhone;

  try {
    await prisma.user.update({ where: { id: ctx.userId! }, data: update });
    logAudit({
      userId: ctx.userId!,
      action: 'SENSITIVE_UPDATE_CONTACT_SUCCESS',
      status: 'SUCCESS',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      method: ctx.method,
      path: ctx.path,
      metadata: { requestId: ctx.requestId, updated: { email: !!newEmail, phone: !!newPhone } },
    }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 409 });
  }
});
