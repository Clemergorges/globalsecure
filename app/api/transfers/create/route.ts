import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createVirtualCard } from '@/lib/services/stripe';
import { calculateTransferAmounts } from '@/lib/services/exchange';
import { pusherService } from '@/lib/services/pusher';
import { z } from 'zod';

const transferSchema = z.object({
  mode: z.enum(['ACCOUNT_CONTROLLED', 'CARD_EMAIL', 'SELF_TRANSFER']), // Add other modes if needed
  amountSource: z.number().min(1, "Minimum amount is 1"),
  currencySource: z.string().length(3),
  currencyTarget: z.string().length(3),
  receiverEmail: z.string().email().optional(),
  receiverName: z.string().optional()
});

export async function POST(req: Request) {
  const session = await getSession();

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    
    // Convert string amount to number for validation
    if (typeof body.amountSource === 'string') {
        body.amountSource = parseFloat(body.amountSource);
    }

    const validation = transferSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation Error', details: validation.error.format() }, { status: 400 });
    }

    const {
      mode,
      amountSource,
      currencySource,
      currencyTarget,
      receiverEmail,
      receiverName
    } = validation.data;

    // 0. KYC Check
    const user = await prisma.user.findUnique({ 
        where: { id: (session as any).userId },
        include: { wallet: true }
    });

    if (!user || !user.wallet) {
        return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Limits based on KYC Level
    const amount = amountSource;
    const kycLevel = user.kycLevel;

    if (kycLevel === 0 && amount > 100) {
      return NextResponse.json({ error: 'Unverified account limit exceeded. Please complete KYC to send more than €100.' }, { status: 403 });
    }
    if (kycLevel === 1 && amount > 500) {
      return NextResponse.json({ error: 'Pending verification limit exceeded. Please wait for approval to send more than €500.' }, { status: 403 });
    }

    // 1. Calculate Amounts
    const calculation = await calculateTransferAmounts(
      amountSource,
      currencySource,
      currencyTarget
    );
    
    // Total to deduct = Amount + Fee
    const totalDeduction = Number(amountSource) + Number(calculation.fee);

    // 2. Transaction: Debit & Create Transfer
    const result = await prisma.$transaction(async (tx) => {
        // 2.1 Check Balance & Debit
        const balanceRecord = await tx.balance.findUnique({
            where: {
                walletId_currency: {
                    walletId: user.wallet!.id,
                    currency: currencySource
                }
            }
        });

        if (!balanceRecord || balanceRecord.amount.toNumber() < totalDeduction) {
            throw new Error(`Insufficient funds. You have ${balanceRecord?.amount || 0} ${currencySource} but need ${totalDeduction} ${currencySource}`);
        }

        // Debit Balance
        await tx.balance.update({
            where: { id: balanceRecord.id },
            data: { amount: { decrement: totalDeduction } }
        });

        // Log Debit Transaction
        await tx.walletTransaction.create({
            data: {
                walletId: user.wallet!.id,
                type: 'DEBIT',
                amount: totalDeduction,
                currency: currencySource,
                description: `Transfer to ${receiverEmail || 'External'} (${mode})`
            }
        });

        // 2.2 Find Receiver if Account mode
        let receiverId = null;
        if (mode === 'ACCOUNT_CONTROLLED' && receiverEmail) {
            const receiver = await tx.user.findUnique({ where: { email: receiverEmail } });
            if (receiver) receiverId = receiver.id;
        }

        // 2.3 Create Transfer Record
        const transfer = await tx.transfer.create({
            data: {
                senderId: (session as any).userId,
                recipientId: receiverId,
                recipientEmail: receiverEmail || 'unknown',
                recipientName: receiverName,
                type: mode === 'CARD_EMAIL' ? 'CARD' : 'ACCOUNT',
                amountSent: amountSource,
                currencySent: currencySource,
                amountReceived: calculation.amountReceived,
                currencyReceived: currencyTarget,
                exchangeRate: calculation.exchangeRate,
                feePercentage: calculation.feePercentage,
                fee: calculation.fee,
                status: 'PENDING',
                logs: {
                    create: {
                        type: 'CREATE_TRANSFER',
                        metadata: { receiverEmail, receiverName }
                    }
                }
            }
        });
        
        return transfer;
    });

    // 4. If Card Mode, create Virtual Card (OUTSIDE Transaction because it calls External API)
    // If this fails, we should probably mark transfer as FAILED and refund the user, 
    // OR keep it PENDING for manual retry. For now, we'll mark FAILED but NOT auto-refund (requires manual admin check)
    // Ideally, we would have a background job for this.
    if (mode === 'CARD_EMAIL') {
      console.log('[Transfer] Mode is CARD_EMAIL. Initiating Stripe Card creation...');
      const supportedCurrencies = ['eur', 'usd', 'gbp'];
      let issueCurrency = currencyTarget.toLowerCase();
      let issueAmount = calculation.amountReceived;

      if (!supportedCurrencies.includes(issueCurrency)) {
        console.log(`[Transfer] Currency ${issueCurrency} not supported for card issuing. Converting to EUR.`);
        const { getExchangeRate } = await import('@/lib/services/exchange');
        const exchangeData = await getExchangeRate(currencyTarget, 'EUR');
        issueAmount = calculation.amountReceived * exchangeData.rate;
        issueCurrency = 'eur';
      }

      let cardData;
      try {
        cardData = await createVirtualCard({
          amount: Number(issueAmount),
          currency: issueCurrency,
          recipientEmail: receiverEmail!,
          recipientName: receiverName!,
          transferId: result.id
        });
        console.log('[Transfer] Stripe Card created successfully:', cardData.cardId);
        
        await prisma.virtualCard.create({
            data: {
              transferId: result.id,
              stripeCardId: cardData.cardId,
              stripeCardholderId: cardData.cardholderId,
              last4: cardData.last4,
              brand: cardData.brand,
              expMonth: cardData.exp_month,
              expYear: cardData.exp_year,
              expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 3)),
              amount: calculation.amountReceived,
              currency: currencyTarget,
              status: 'ACTIVE'
            }
        });
        
        // Update Transfer to COMPLETED if card created successfully
        await prisma.transfer.update({ where: { id: result.id }, data: { status: 'COMPLETED' } });

        // Send Email
        try {
            const { sendEmail, templates } = await import('@/lib/services/email');
            await sendEmail({
              to: receiverEmail!,
              subject: '🎁 You received a GlobalSecure Virtual Card',
              html: templates.cardCreated(
                receiverName || 'Cliente',
                cardData.last4,
                Number(issueAmount).toFixed(2),
                issueCurrency.toUpperCase()
              )
            });
        } catch (emailError) {
            console.error('[Transfer] Email sending failed:', emailError);
        }

      } catch (stripeError: any) {
        console.error('[Transfer] Stripe Card Creation Failed:', stripeError);
        // Mark as FAILED
        await prisma.transfer.update({ where: { id: result.id }, data: { status: 'FAILED' } });
        // NOTE: Funds are already deducted. Admin needs to refund or retry.
        throw new Error(`Stripe Issuing Failed: ${stripeError.message}`);
      }
    }

    // 5. Notify Sender
    try {
      await pusherService.trigger(`user-${(session as any).userId}`, 'transfer-created', { transferId: result.id });
    } catch (pusherError) {
      console.warn('Pusher trigger failed:', pusherError);
    }

    return NextResponse.json({ success: true, transferId: result.id });
  } catch (error: any) {
    console.error('Transfer creation failed:', error);
    return NextResponse.json({ error: 'Transfer creation failed', details: error.message }, { status: 500 });
  }
}
