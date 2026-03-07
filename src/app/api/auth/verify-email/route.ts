import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';
import { withRouteContext } from '@/lib/http/route';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

function hashEmailOtp(code: string) {
  return crypto.createHash('sha256').update(`${code}.${env.otpPepper()}`).digest('hex');
}

export const POST = withRouteContext(async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const { email, code } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const codeHash = hashEmailOtp(code);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { account: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: 'Email já verificado' });
    }

    const otp = await prisma.oTP.findFirst({
      where: {
        userId: user.id,
        type: 'EMAIL',
        code: codeHash,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return NextResponse.json({ error: 'Código inválido', code: 'OTP_INVALID' }, { status: 400 });
    }

    if (otp.used) {
      return NextResponse.json({ error: 'Código já usado', code: 'OTP_USED' }, { status: 400 });
    }

    if (otp.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Código expirado', code: 'OTP_EXPIRED' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.oTP.update({
        where: { id: otp.id },
        data: { used: true, usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });

      if (user.account && user.account.status === 'UNVERIFIED') {
        await tx.account.update({
          where: { userId: user.id },
          data: { status: 'PENDING' },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error?.message || String(error) }, 'verify-email error');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}, { requireAuth: false });

