
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { code } = await req.json();

    const user = await prisma.user.findUnique({
      // @ts-ignore
      where: { id: session.userId }
    });

    if (!user || !user.phone) return NextResponse.json({ error: 'User invalid' }, { status: 400 });

    // Verify OTP
    const otp = await prisma.oTP.findFirst({
      where: {
        userId: user.id,
        code: code,
        used: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otp) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { used: true, usedAt: new Date() }
    });

    // Enable 2FA (mark phone as verified)
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true }
    });

    return NextResponse.json({ success: true, message: '2FA Enabled' });

  } catch (error) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
