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

    // Find the user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: 'Email já verificado' });
    }

    // Find valid OTP
    const otp = await prisma.oTP.findFirst({
      where: {
        userId: user.id,
        type: 'EMAIL',
        code: code,
        used: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!otp) {
      return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 400 });
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { used: true, usedAt: new Date() }
    });

    // Verify User
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}