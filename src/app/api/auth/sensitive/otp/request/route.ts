import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
type SensitiveActionType =
  | 'SENSITIVE_CHANGE_PASSWORD'
  | 'SENSITIVE_UPDATE_CONTACT'
  | 'SENSITIVE_HIGH_VALUE_TRANSFER';
import { validateSession } from '@/lib/session';
import { createSensitiveActionOtp } from '@/lib/sensitive-otp';
import { sendEmail, templates } from '@/lib/services/email';
import { logAudit } from '@/lib/logger';

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

export async function POST(req: NextRequest) {
  const session = await validateSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
  const userAgent = req.headers.get('user-agent');
  const method = req.method;
  const path = req.nextUrl.pathname;

  const { code, ttlMinutes } = await createSensitiveActionOtp({
    userId: session.userId,
    actionType: parsed.data.actionType,
    ipAddress,
    userAgent,
  });

  const emailResult = await sendEmail({
    to: session.email,
    subject: `Confirmação de Segurança - ${label(parsed.data.actionType)}`,
    html: templates.sensitiveActionCode(code, label(parsed.data.actionType), ttlMinutes),
  });

  logAudit({
    userId: session.userId,
    action: 'SENSITIVE_OTP_REQUEST',
    status: emailResult?.ok ? 'SUCCESS' : 'FAILURE',
    ipAddress: ipAddress || undefined,
    userAgent: userAgent || undefined,
    method,
    path,
    metadata: { actionType: parsed.data.actionType, emailSent: !!emailResult?.ok },
  });

  return NextResponse.json({
    success: true,
    emailSent: !!emailResult?.ok,
  });
}
