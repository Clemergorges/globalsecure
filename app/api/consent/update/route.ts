import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { cookieConsent, marketingConsent } = body;

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        cookieConsent: cookieConsent,
        marketingConsent: marketingConsent,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Consent update error:', error);
    return NextResponse.json({ error: 'Failed to update consent' }, { status: 500 });
  }
}
