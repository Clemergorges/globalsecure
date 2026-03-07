
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, hashPassword } from '@/lib/auth';
import { z } from 'zod';
import { logAudit } from '@/lib/logger';
import { withRouteContext } from '@/lib/http/route';
import { OtpChallengeService } from '@/lib/security/otp/OtpChallengeService';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  otpCode: z.string().regex(/^\d{6}$/),
});

type PasswordChangeErrorCode =
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'OTP_LOCKED'
  | 'INVALID_CURRENT_PASSWORD'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

function mapOtpReason(reason: string): PasswordChangeErrorCode {
  if (reason === 'EXPIRED') return 'OTP_EXPIRED';
  if (reason === 'LOCKED') return 'OTP_LOCKED';
  return 'OTP_INVALID';
}

export const POST = withRouteContext(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const { currentPassword, newPassword, otpCode } = changePasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId! }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect current password', code: 'INVALID_CURRENT_PASSWORD' satisfies PasswordChangeErrorCode }, { status: 400 });
    }

    const otpService = new OtpChallengeService();
    const consumed = await otpService.consume({
      userId: ctx.userId!,
      purpose: 'PASSWORD_CHANGE',
      code: otpCode,
    });
    if (!consumed.ok) {
      const code = mapOtpReason(consumed.reason);
      logAudit({
        userId: ctx.userId!,
        action: 'SENSITIVE_OTP_FAILURE',
        status: 'FAILURE',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        method: ctx.method,
        path: ctx.path,
        metadata: { requestId: ctx.requestId, actionType: 'SENSITIVE_CHANGE_PASSWORD', reason: consumed.reason },
      });
      return NextResponse.json({ error: 'Invalid or expired OTP', code }, { status: 400 });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash }
    });

    logAudit({
      userId: ctx.userId!,
      action: 'SENSITIVE_CHANGE_PASSWORD_SUCCESS',
      status: 'SUCCESS',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      method: ctx.method,
      path: ctx.path,
      metadata: { requestId: ctx.requestId },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation Error', code: 'VALIDATION_ERROR' satisfies PasswordChangeErrorCode }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update password', code: 'UNKNOWN_ERROR' satisfies PasswordChangeErrorCode }, { status: 500 });
  }
});
