import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createVirtualCard } from '@/lib/services/stripe';
import { pusherService } from '@/lib/services/pusher';
import { z } from 'zod';

const createCardSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  name: z.string().optional()
});

export async function POST(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // @ts-ignore
  const userId = session.userId;

  try {
    const body = await req.json();
    const { amount, currency, name } = createCardSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true }
    });

    if (!user || !user.wallet) {
      return NextResponse.json({ error: 'User or wallet not found' }, { status: 404 });
    }

    // 1. Check & Debit Balance (Unified)
    // We treat this as a "Transfer to Card" (Funding)
    const transfer = await prisma.$transaction(async (tx) => {
      // Debit user wallet
      const debitResult = await tx.balance.updateMany({
        where: { 
            walletId: user.wallet!.id, 
            currency: currency, 
            amount: { gte: amount } 
        },
        data: { amount: { decrement: amount } }
      });

      if (debitResult.count === 0) {
        throw new Error('Insufficient balance');
      }

      // Create Transfer Record (Self-Funding)
      const transfer = await tx.transfer.create({
        data: {
          senderId: userId,
          recipientEmail: user.email, // Self
          recipientName: name || `${user.firstName} ${user.lastName}`,
          recipientId: userId, // Self
          amountSent: amount,
          currencySent: currency,
          amountReceived: amount,
          currencyReceived: currency,
          fee: 0,
          type: 'CARD',
          status: 'PENDING',
          logs: {
             create: {
                 type: 'CARD_CREATION',
                 metadata: { amount, currency }
             }
          }
        }
      });
      
      // Create Ledger Entry (Debit)
      await tx.walletTransaction.create({
          data: {
              walletId: user.wallet!.id,
              type: 'DEBIT',
              amount: amount,
              currency: currency,
              description: `Funding for Virtual Card`,
              transferId: transfer.id
          }
      });

      return transfer;
    });

    // 2. Find existing Cardholder (if any)
    // Since we don't have stripeCardholderId on User yet, we look for any existing card
    const existingCard = await prisma.virtualCard.findFirst({
        where: { userId: userId },
        select: { stripeCardholderId: true }
    });

    // 3. Create Card on Stripe
    let cardData;
    try {
        cardData = await createVirtualCard({
            amount: amount,
            currency: currency,
            recipientEmail: user.email,
            recipientName: name || `${user.firstName} ${user.lastName}`,
            transferId: transfer.id,
            existingCardholderId: existingCard?.stripeCardholderId
        });
    } catch (stripeError: any) {
        console.error('Stripe Card Creation Failed:', stripeError);
        // Refund logic could go here, but for MVP we fail fast.
        // In prod, we'd use a job to retry or refund.
        await prisma.transfer.update({ where: { id: transfer.id }, data: { status: 'FAILED' } });
        // Manually refund balance?
        await prisma.balance.update({
             where: { walletId_currency: { walletId: user.wallet!.id, currency } },
             data: { amount: { increment: amount } }
        });
        return NextResponse.json({ error: 'Failed to create card on Stripe' }, { status: 500 });
    }

    // 4. Save Card to DB
    const virtualCard = await prisma.virtualCard.create({
        data: {
            transferId: transfer.id,
            userId: userId,
            stripeCardId: cardData.cardId,
            stripeCardholderId: cardData.cardholderId,
            last4: cardData.last4,
            brand: cardData.brand,
            expMonth: cardData.exp_month,
            expYear: cardData.exp_year,
            expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 3)),
            amount: amount, // Initial limit
            currency: currency,
            status: 'INACTIVE' // Starts inactive as per requirements? Or ACTIVE?
            // The requirement said "ativar cartão após depósito". 
            // Here we just deposited. So maybe it should be ACTIVE?
            // But `createVirtualCard` sets status: 'inactive'.
            // So we save as INACTIVE and require explicit activation.
        }
    });
    
    // Update Transfer to COMPLETED
    await prisma.transfer.update({
        where: { id: transfer.id },
        data: { status: 'COMPLETED' }
    });

    // Notify
    await pusherService.trigger(`user-${userId}`, 'card-created', { cardId: virtualCard.id });

    return NextResponse.json({ success: true, card: virtualCard });

  } catch (error: any) {
    console.error('Card creation error:', error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}
