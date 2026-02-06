
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { smsService } from '@/lib/services/sms';
import { randomBytes } from 'crypto';

export async function POST(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      // @ts-ignore
      where: { id: session.userId }
    });

    if (!user || !user.phone) {
      return NextResponse.json({ error: 'Phone number required. Please update profile first.' }, { status: 400 });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in DB
    await prisma.oTP.create({
      data: {
          userId: user.id,
          target: user.phone!,
          type: 'PHONE',
          channel: 'sms',
          code: code,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000) // Expira em 10 minutos
        }
    });

    // Send SMS
    await smsService.sendOTP(user.phone, code);

    return NextResponse.json({ success: true, message: 'OTP sent' });

  } catch (error) {
    console.error('2FA Enable error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
