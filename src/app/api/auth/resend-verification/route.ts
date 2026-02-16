import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';
import { sendEmail, templates } from '@/lib/services/email';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/logger';

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  try {
    const body = await req.json();
    const parsed = resendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const normalizedEmail = parsed.data.email.toLowerCase();

    const limit = await checkRateLimit(`resend_verification:${ip}:${normalizedEmail}`, 3, 15 * 60);
    if (!limit.success) {
      await logAudit({
        action: 'RESEND_VERIFICATION_BLOCKED',
        status: '429',
        ipAddress: ip,
        userAgent,
        path: '/api/auth/resend-verification',
        metadata: { limit: limit.limit, remaining: limit.remaining }
      });
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente mais tarde.' },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { account: true }
    });

    if (!user) {
      return NextResponse.json({ success: true, message: 'Se este email existir, enviaremos um novo código.' });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: 'Email já verificado.' });
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const otp = await prisma.$transaction(async (tx) => {
      await tx.oTP.updateMany({
        where: { userId: user.id, type: 'EMAIL', used: false },
        data: { used: true, usedAt: new Date() }
      });

      return tx.oTP.create({
        data: {
          userId: user.id,
          type: 'EMAIL',
          channel: 'email',
          target: normalizedEmail,
          code: otpCode,
          expiresAt
        }
      });
    });

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: 'Seu novo código de verificação - GlobalSecureSend',
      html: templates.verificationCode(otpCode)
    });

    if (!emailResult?.ok) {
      await prisma.oTP.delete({ where: { id: otp.id } });
      return NextResponse.json(
        { error: 'Falha ao enviar o email de verificação. Tente novamente.' },
        { status: 503 }
      );
    }

    await logAudit({
      userId: user.id,
      action: 'RESEND_VERIFICATION_SUCCESS',
      status: '200',
      ipAddress: ip,
      userAgent,
      path: '/api/auth/resend-verification'
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

