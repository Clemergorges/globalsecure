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

    // 0. KYC Check
    // @ts-ignore
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    
    // Limits based on KYC Level
    // Level 0 (Unverified): Max 100 EUR
    // Level 1 (Pending): Max 500 EUR
    // Level 2 (Verified): Max 10,000 EUR
    
    const amount = Number(amountSource);
    // @ts-ignore
    const kycLevel = user?.kycLevel || 0;

    if (kycLevel === 0 && amount > 100) {
      return NextResponse.json({ error: 'Unverified account limit exceeded. Please complete KYC to send more than €100.' }, { status: 403 });
    }
    if (kycLevel === 1 && amount > 500) {
      return NextResponse.json({ error: 'Pending verification limit exceeded. Please wait for approval to send more than €500.' }, { status: 403 });
    }

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
        recipientId: receiverId, // Correct field name
        recipientEmail: receiverEmail || 'unknown', // Required field
        recipientName: receiverName,
        // mode: mode, // Removed as per new schema
        type: mode === 'CARD_EMAIL' ? 'CARD' : 'ACCOUNT',
        amountSent: Number(amountSource), // Correct field name
        currencySent: currencySource,
        amountReceived: calculation.amountReceived, // Correct field name
        currencyReceived: currencyTarget,
        exchangeRate: calculation.exchangeRate,
        feePercentage: calculation.feePercentage,
        fee: calculation.fee, // Changed from feeAmount to fee
        status: 'PENDING', // Default valid status
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
          stripeCardId: cardData.cardId, 
          stripeCardholderId: 'temp_holder_id', // Placeholder for MVP
          last4: cardData.last4,
          brand: cardData.brand,
          expMonth: 12, // Placeholder
          expYear: 2029, // Placeholder
          expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 3)), 
          amount: calculation.amountReceived,
          currency: currencyTarget,
          status: 'INACTIVE' 
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
