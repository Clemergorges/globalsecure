import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const currencySchema = z.object({
  currency: z.enum(['EUR', 'USD', 'BRL', 'GBP'])
});

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { currency } = currencySchema.parse(body);

    // Update wallet primary currency
    await prisma.wallet.update({
      // @ts-ignore
      where: { userId: session.userId },
      data: { primaryCurrency: currency }
    });

    return NextResponse.json({ success: true, currency });
  } catch (error) {
    console.error('Failed to update currency:', error);
    return NextResponse.json({ error: 'Failed to update currency' }, { status: 500 });
  }
}
