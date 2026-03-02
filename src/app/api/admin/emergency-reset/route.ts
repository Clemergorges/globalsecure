import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, getSession } from '@/lib/auth';

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint disabled' }, { status: 410 });
  }

  if (process.env.ENABLE_EMERGENCY_RESET !== 'true') {
    return NextResponse.json({ error: 'Endpoint disabled' }, { status: 410 });
  }

  try {
    const session = await getSession();
    const userEmail = (session as any)?.email;

    const email = process.env.ADMIN_EMAIL;
    if (!email) {
      return NextResponse.json({ error: 'ADMIN_EMAIL not configured' }, { status: 500 });
    }

    if (!userEmail || userEmail !== email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const password = process.env.EMERGENCY_RESET_PASSWORD;
    if (!password) {
      return NextResponse.json({ error: 'EMERGENCY_RESET_PASSWORD not configured' }, { status: 500 });
    }
    const passwordHash = await hashPassword(password);

    await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: {
        email,
        passwordHash,
        firstName: 'Admin',
        lastName: 'GlobalSecure',
        emailVerified: true,
        kycLevel: 2, account: {
          create: {
            primaryCurrency: 'EUR',
            balances: {
              create: { currency: 'EUR', amount: 1000000 }
            }
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      user: email,
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
