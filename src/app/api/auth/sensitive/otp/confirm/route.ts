import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

type SensitiveActionType =
  | 'SENSITIVE_CHANGE_PASSWORD'
  | 'SENSITIVE_UPDATE_CONTACT'
  | 'SENSITIVE_HIGH_VALUE_TRANSFER';
import { validateSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { comparePassword, hashPassword } from '@/lib/auth';
import { consumeSensitiveActionOtp } from '@/lib/sensitive-otp';
import { logAudit } from '@/lib/logger';

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

export async function POST(req: NextRequest) {
  const session = await validateSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const method = req.method;
  const path = req.nextUrl.pathname;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const consume = await consumeSensitiveActionOtp({
    userId: session.userId,
    actionType: parsed.data.actionType,
    code: parsed.data.otpCode,
  });

  if (!consume.ok) {
    logAudit({
      userId: session.userId,
      action: 'SENSITIVE_OTP_FAILURE',
      status: 'FAILURE',
      ipAddress,
      userAgent,
      method,
      path,
      metadata: { actionType: parsed.data.actionType, reason: consume.reason },
    });
    return NextResponse.json({ error: 'Invalid or expired OTP', code: consume.reason }, { status: 400 });
  }

  if (parsed.data.actionType === 'SENSITIVE_HIGH_VALUE_TRANSFER') {
    if (!session.sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await prisma.session.update({
      where: { id: session.sessionId },
      data: { lastScaAt: new Date() },
    });
    logAudit({
      userId: session.userId,
      action: 'SENSITIVE_SCA_HIGH_VALUE_TRANSFER_SUCCESS',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      method,
      path,
      metadata: { sessionId: session.sessionId },
    });
    return NextResponse.json({ success: true });
  }

  if (parsed.data.actionType === 'SENSITIVE_CHANGE_PASSWORD') {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, passwordHash: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const ok = await comparePassword(parsed.data.currentPassword, user.passwordHash);
    if (!ok) return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    logAudit({
      userId: session.userId,
      action: 'SENSITIVE_CHANGE_PASSWORD_SUCCESS',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      method,
      path,
      metadata: {},
    });
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
    await prisma.user.update({ where: { id: session.userId }, data: update });
    logAudit({
      userId: session.userId,
      action: 'SENSITIVE_UPDATE_CONTACT_SUCCESS',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      method,
      path,
      metadata: { updated: { email: !!newEmail, phone: !!newPhone } },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 409 });
  }
}
