import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { pusherService } from '@/lib/services/pusher';
import { processInternalTransfer } from '@/lib/services/ledger';
import { z } from 'zod';

const transferSchema = z.object({
  recipientEmail: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().length(3), // Now supports any 3-letter currency code (e.g. BRL, JPY)
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    // @ts-ignore
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = transferSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error }, { status: 400 });
    }

    const { recipientEmail, amount, currency } = result.data;
    // @ts-ignore
    const senderId = session.userId;

    // 0. KYC Check
    // @ts-ignore
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    const kycLevel = (user as any)?.kycLevel || 0;

    // Internal transfers have stricter limits for unverified users
    if (kycLevel < 2 && amount > 50) {
      return NextResponse.json({ error: 'KYC Verification required for internal transfers over €50.' }, { status: 403 });
    }

    // 1. Validations
    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    // Process Transfer via Ledger Service
    const transferResult = await processInternalTransfer(
      senderId,
      // @ts-ignore
      session.email || 'GlobalSecureSend User',
      recipientEmail,
      amount,
      currency
    );

    return NextResponse.json(transferResult);

  } catch (error: any) {
    console.error('Internal transfer error:', error);

    if (error.message === 'Insufficient funds or concurrent transaction conflict') {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    
    // Handle other known errors with 400
    if (['Recipient not found', 'Cannot transfer to yourself', 'Recipient wallet not active', 'Sender wallet not found'].includes(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    if (error.message.startsWith('Saldo em')) {
         return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal transfer failed', details: error.message }, { status: 500 });
  }
}