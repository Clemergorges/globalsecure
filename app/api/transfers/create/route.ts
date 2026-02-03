import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createVirtualCard } from '@/lib/services/stripe';
import { calculateTransferAmounts } from '@/lib/services/exchange';
import { pusherService } from '@/lib/services/pusher';

export async function POST(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { 
      mode, 
      amountSource, 
      currencySource, 
      currencyTarget, 
      receiverEmail, 
      receiverName 
    } = body;

    // 1. Calculate Amounts
    const calculation = await calculateTransferAmounts(
      Number(amountSource),
      currencySource,
      currencyTarget
    );

    // 2. Find Receiver if Account mode
    let receiverId = null;
    if (mode === 'ACCOUNT_CONTROLLED' && receiverEmail) {
      const receiver = await prisma.user.findUnique({ where: { email: receiverEmail } });
      if (receiver) receiverId = receiver.id;
    }

    // 3. Create Transfer
    const transfer = await prisma.transfer.create({
      data: {
        // @ts-ignore
        senderId: session.userId,
        receiverId,
        mode,
        amountSource: Number(amountSource),
        currencySource,
        amountTarget: calculation.amountReceived,
        currencyTarget,
        fxRateUsed: calculation.exchangeRate,
        feePercent: calculation.feePercentage,
        status: mode === 'CARD_EMAIL' ? 'WAITING_SENDER_APPROVAL' : 'PENDING_RECEIVER_ACCOUNT',
        logs: {
          create: {
            type: 'CREATE_TRANSFER',
            metadata: { receiverEmail, receiverName }
          }
        }
      }
    });

    // 4. If Card Mode, create Virtual Card
    if (mode === 'CARD_EMAIL') {
      const cardData = await createVirtualCard({
        amount: calculation.amountReceived,
        currency: currencyTarget,
        recipientEmail: receiverEmail || 'no-email@example.com',
        recipientName: receiverName || 'Beneficiary',
        transferId: transfer.id
      });
      
      await prisma.virtualCard.create({
        data: {
          transferId: transfer.id,
          cardToken: cardData.cardId, 
          last4: cardData.last4,
          brand: cardData.brand,
          expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 3)), // 3 years
          spendingLimit: calculation.amountReceived,
          status: 'PAUSED' // Waiting approval
        }
      });
    }

    // 5. Notify Sender
    // @ts-ignore
    await pusherService.trigger(`user-${session.userId}`, 'transfer-created', { transferId: transfer.id });

    return NextResponse.json({ success: true, transferId: transfer.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Transfer creation failed' }, { status: 500 });
  }
}
