import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
type SensitiveActionType =
  | 'SENSITIVE_CHANGE_PASSWORD'
  | 'SENSITIVE_UPDATE_CONTACT'
  | 'SENSITIVE_HIGH_VALUE_TRANSFER';
import { withRouteContext } from '@/lib/http/route';
import { OtpChallengeService } from '@/lib/security/otp/OtpChallengeService';
import { sendEmail, templates } from '@/lib/services/email';
import { logAudit } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  actionType: z.enum([
    'SENSITIVE_CHANGE_PASSWORD',
    'SENSITIVE_UPDATE_CONTACT',
    'SENSITIVE_HIGH_VALUE_TRANSFER',
  ]),
});

function label(actionType: SensitiveActionType) {
  if (actionType === 'SENSITIVE_CHANGE_PASSWORD') return 'Mudança de senha';
  if (actionType === 'SENSITIVE_UPDATE_CONTACT') return 'Atualização de contato';
  if (actionType === 'SENSITIVE_HIGH_VALUE_TRANSFER') return 'Transferência de alto valor';
  return 'Ação sensível';
}

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

  if (!ctx.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const purpose = mapPurpose(parsed.data.actionType);
  const rl = await checkRateLimit(`sensitive_otp_request:${ctx.userId}:${purpose}:${ctx.ipAddress}`, 5, 10 * 60);
  if (!rl.success) {
    const res = NextResponse.json({ error: 'Too many requests', code: 'RATE_LIMIT' }, { status: 429 });
    res.headers.set('x-ratelimit-limit', String(rl.limit));
    res.headers.set('x-ratelimit-remaining', String(rl.remaining));
    res.headers.set('x-ratelimit-reset', String(rl.reset));
    return res;
  }

  const otpService = new OtpChallengeService();
  const ttlSeconds = 10 * 60;
  const { code } = await otpService.create({
    userId: ctx.userId!,
    purpose,
    ttlSeconds,
    maxAttempts: 5,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  const emailResult = await sendEmail({
    to: ctx.email,
    subject: `Confirmação de Segurança - ${label(parsed.data.actionType)}`,
    html: templates.sensitiveActionCode(code, label(parsed.data.actionType), Math.ceil(ttlSeconds / 60)),
  });

  logAudit({
    userId: ctx.userId!,
    action: 'SENSITIVE_OTP_REQUEST',
    status: emailResult?.ok ? 'SUCCESS' : 'FAILURE',
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    method: ctx.method,
    path: ctx.path,
    metadata: { requestId: ctx.requestId, actionType: parsed.data.actionType, emailSent: !!emailResult?.ok },
  }).catch(() => {});

  return NextResponse.json({ success: true, emailSent: !!emailResult?.ok });
});
