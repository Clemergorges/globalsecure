
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateSession } from '@/lib/session';
import { comparePassword, hashPassword } from '@/lib/auth';
import { z } from 'zod';
import { consumeSensitiveActionOtp } from '@/lib/sensitive-otp';
import { logAudit } from '@/lib/logger';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  otpCode: z.string().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  const session = await validateSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const method = req.method;
  const path = req.nextUrl.pathname;

  try {
    const body = await req.json();
    const { currentPassword, newPassword, otpCode } = changePasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
    }

    const consumed = await consumeSensitiveActionOtp({
      userId: session.userId,
      actionType: 'SENSITIVE_CHANGE_PASSWORD',
      code: otpCode,
    });
    if (!consumed.ok) {
      logAudit({
        userId: session.userId,
        action: 'SENSITIVE_OTP_FAILURE',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        method,
        path,
        metadata: { actionType: 'SENSITIVE_CHANGE_PASSWORD', reason: consumed.reason },
      });
      return NextResponse.json({ error: 'Invalid or expired OTP', code: consumed.reason }, { status: 400 });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash }
    });

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

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation Error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
