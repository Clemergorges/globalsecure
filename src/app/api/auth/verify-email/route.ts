import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const { email, code } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { account: true }
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
        code: code,
      },
      orderBy: { createdAt: 'desc' }
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
        data: { used: true, usedAt: new Date() }
      });

      await tx.user.update({
        where: { id: user.id },
        data: { emailVerified: true }
      });

      if (user.account && user.account.status === 'UNVERIFIED') {
        await tx.account.update({
          where: { userId: user.id },
          data: { status: 'PENDING' }
        });
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
