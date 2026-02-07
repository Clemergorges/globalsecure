
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const email = 'clemergorges@hotmail.com';
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

    return NextResponse.json({ 
      success: true, 
      message: 'Senha resetada para: admin123',
      user: email 
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
