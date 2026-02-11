import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail, templates } from '@/lib/services/email';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Generate 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // Invalidate previous SCA OTPs
    await prisma.oTP.deleteMany({
      where: {
        userId: user.id,
        type: 'SCA_CHALLENGE'
      }
    });

    // Create new OTP
    await prisma.oTP.create({
      data: {
        userId: user.id,
        type: 'SCA_CHALLENGE',
        channel: 'email', // Could be SMS if phoneVerified
        target: user.email,
        code: otpCode,
        expiresAt
      }
    });

    // Send Email
    await sendEmail({
      to: user.email,
      subject: 'Código de Segurança (SCA) - GlobalSecure',
      html: `
        <h1>Autorização de Transação</h1>
        <p>Use o código abaixo para autorizar sua operação. Ele expira em 5 minutos.</p>
        <h2 style="font-size: 24px; letter-spacing: 5px;">${otpCode}</h2>
        <p>Se não foi você, contate o suporte imediatamente.</p>
      `
    });

    return NextResponse.json({ success: true, message: 'OTP sent' });

  } catch (error) {
    console.error('SCA Request error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
