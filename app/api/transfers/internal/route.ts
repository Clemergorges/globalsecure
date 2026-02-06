import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { pusherService } from '@/lib/services/pusher';
import { z } from 'zod';

const transferSchema = z.object({
  recipientEmail: z.string().email(),
  amount: z.number().positive(),
  currency: z.enum(['EUR', 'USD', 'GBP']),
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

    const recipient = await prisma.user.findUnique({
      where: { email: recipientEmail },
      include: { wallet: true }
    });

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    if (recipient.id === senderId) {
      return NextResponse.json({ error: 'Cannot transfer to yourself' }, { status: 400 });
    }

    if (!recipient.wallet) {
      return NextResponse.json({ error: 'Recipient wallet not active' }, { status: 400 });
    }

    const senderWallet = await prisma.wallet.findUnique({
      where: { userId: senderId }
    });

    if (!senderWallet) {
      return NextResponse.json({ error: 'Sender wallet not found' }, { status: 404 });
    }

    // Calculate Fees
    const feePercentage = 1.8;
    const feeAmount = Number((amount * feePercentage / 100).toFixed(2));
    const totalDeduction = amount + feeAmount;
    const balanceField = `balance${currency}` as keyof typeof senderWallet;

    // 2. ATOMIC TRANSACTION (RACE CONDITION FIX)
    // We use updateMany with a WHERE clause that checks balance >= amount
    // This ensures that even if 2 requests come in at the same time,
    // only one will succeed in updating the row.
    const transfer = await prisma.$transaction(async (tx) => {
      
      // 2.1 Atomic Debit (Check Balance + Deduct in one go)
      // updateMany returns { count: number }
      const debitResult = await tx.wallet.updateMany({
        where: { 
          userId: senderId,
          [balanceField]: { gte: totalDeduction } // Crucial: WHERE balance >= total
        },
        data: {
          [balanceField]: { decrement: totalDeduction }
        }
      });

      if (debitResult.count === 0) {
        throw new Error('Insufficient funds or concurrent transaction conflict');
      }

      // 2.2 Credit Recipient
      await tx.wallet.update({
        where: { userId: recipient.id },
        data: {
          [balanceField]: { increment: amount }
        }
      });

      // 2.3 Create Transfer Record
      const newTransfer = await tx.transfer.create({
        data: {
          senderId,
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          recipientName: `${recipient.firstName} ${recipient.lastName}`.trim(),
          amountSent: amount,
          currencySent: currency,
          amountReceived: amount,
          currencyReceived: currency,
          fee: feeAmount,
          feePercentage: feePercentage,
          exchangeRate: 1.0,
          type: 'ACCOUNT',
          status: 'COMPLETED',
          completedAt: new Date(),
          logs: {
            create: {
              type: 'INTERNAL_TRANSFER',
              metadata: {
                fee: feeAmount,
                totalDeduction
              }
            }
          }
        }
      });

      // 2.4 Create Wallet Transactions (Sender Debit)
      await tx.walletTransaction.create({
        data: {
          walletId: senderWallet.id,
          type: 'DEBIT',
          amount: amount,
          currency: currency,
          description: `Transfer to ${recipientEmail}`,
          transferId: newTransfer.id
        }
      });
      
      // Fee Transaction
      await tx.walletTransaction.create({
        data: {
          walletId: senderWallet.id,
          type: 'FEE',
          amount: feeAmount,
          currency: currency,
          description: `Fee for transfer to ${recipientEmail}`,
          transferId: newTransfer.id
        }
      });

      // 2.5 Create Wallet Transaction (Recipient Credit)
      await tx.walletTransaction.create({
        data: {
          walletId: recipient.wallet!.id,
          type: 'CREDIT',
          amount: amount,
          currency: currency,
          // @ts-ignore
          description: `Received from ${session.email || 'GlobalSecureSend User'}`,
          transferId: newTransfer.id
        }
      });

      return newTransfer;
    });

    // 3. Real-time Notifications (Non-blocking)
    try {
      await Promise.all([
        pusherService.trigger(`user-${senderId}`, 'transfer:sent', {
          id: transfer.id,
          amount: amount,
          currency: currency,
          recipient: recipientEmail
        }),
        pusherService.trigger(`user-${recipient.id}`, 'transfer:received', {
          id: transfer.id,
          amount: amount,
          currency: currency,
          // @ts-ignore
          sender: session.email
        })
      ]);
    } catch (pushError) {
      console.error('Pusher notification failed:', pushError);
    }

    return NextResponse.json({ success: true, transfer });

  } catch (error: any) {
    console.error('Internal transfer error:', error);
    
    if (error.message === 'Insufficient funds or concurrent transaction conflict') {
      return NextResponse.json({ error: 'Saldo insuficiente.' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal transfer failed', details: error.message }, { status: 500 });
  }
}