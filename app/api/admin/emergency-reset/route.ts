import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const timestamp = new Date().toISOString();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  console.log(`[ADMIN_RESET_ATTEMPT] IP: ${ip}, UA: ${userAgent}, Time: ${timestamp}`);

  // 1. Protection by Environment
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[ADMIN_RESET_BLOCKED] Attempted in production environment. IP: ${ip}`);
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 });
  }

  try {
    // 2. Protection by Admin Authentication
    const session = await getSession();

    if (!session || !session.user || session.user.email !== process.env.ADMIN_EMAIL) {
      console.warn(`[ADMIN_RESET_UNAUTHORIZED] User: ${session?.user?.email || 'Guest'}, IP: ${ip}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log(`[ADMIN_RESET_AUTHORIZED] Admin: ${session.user.email} initiated reset.`);

    const email = process.env.ADMIN_EMAIL || 'clemergorges@hotmail.com';
    const password = 'admin123';
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
        kycLevel: 2,
        wallet: {
          create: {
            primaryCurrency: 'EUR',
            balanceEUR: 1000000,
          }
        }
      }
    });

    console.log(`[ADMIN_RESET_SUCCESS] Admin password reset successfully.`);

    return NextResponse.json({ 
      success: true, 
      message: 'Senha resetada para: admin123',
      user: email 
    });

  } catch (error) {
    console.error(`[ADMIN_RESET_ERROR] ${error}`);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
