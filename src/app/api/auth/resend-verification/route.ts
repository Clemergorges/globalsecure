import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';
import { sendEmail, templates } from '@/lib/services/email';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit, logger } from '@/lib/logger';
import { withRouteContext } from '@/lib/http/route';
import { env } from '@/lib/config/env';

const resendSchema = z.object({
  email: z.string().email(),
});

function hashEmailOtp(code: string) {
  return crypto.createHash('sha256').update(`${code}.${env.otpPepper()}`).digest('hex');
}

export const POST = withRouteContext(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = resendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const normalizedEmail = parsed.data.email.toLowerCase();

    const limit = await checkRateLimit(`resend_verification:${ctx.ipAddress}:${normalizedEmail}`, 3, 15 * 60);
    if (!limit.success) {
      await logAudit({
        action: 'RESEND_VERIFICATION_BLOCKED',
        status: '429',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        path: ctx.path,
        metadata: { limit: limit.limit, remaining: limit.remaining, requestId: ctx.requestId },
      }).catch(() => {});
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente mais tarde.' },
        { status: 429 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ success: true, message: 'Se este email existir, enviaremos um novo código.' });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: 'Email já verificado.' });
    }

    const otpCode = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const otpCodeHash = hashEmailOtp(otpCode);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const otp = await prisma.$transaction(async (tx) => {
      await tx.oTP.updateMany({
        where: { userId: user.id, type: 'EMAIL', used: false },
        data: { used: true, usedAt: new Date() },
      });

      return tx.oTP.create({
        data: {
          userId: user.id,
          type: 'EMAIL',
          channel: 'email',
          target: normalizedEmail,
          code: otpCodeHash,
          expiresAt,
        },
      });
    });

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: 'Seu novo código de verificação - GlobalSecureSend',
      html: templates.verificationCode(otpCode),
    });

    if (!emailResult?.ok) {
      await prisma.oTP.delete({ where: { id: otp.id } }).catch(() => {});
      return NextResponse.json(
        { error: 'Falha ao enviar o email de verificação. Tente novamente.' },
        { status: 503 },
      );
    }

    await logAudit({
      userId: user.id,
      action: 'RESEND_VERIFICATION_SUCCESS',
      status: '200',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      path: ctx.path,
      metadata: { requestId: ctx.requestId },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error?.message || String(error) }, 'resend-verification error');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}, { requireAuth: false });

