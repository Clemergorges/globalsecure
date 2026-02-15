import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomBytes } from 'crypto';
import { sendEmail, templates } from '@/lib/services/email';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    // @ts-ignore
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // @ts-ignore
    const userId = session.userId;
    
    const body = await req.json();
    const { amount, currency, message, recipientEmail, recipientName } = body;

    if (!amount || !currency) {
        return NextResponse.json({ error: 'Missing amount or currency' }, { status: 400 });
    }

    // 1. Execute database operations atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1a. Create Transfer
      const transferRecipientEmail = recipientEmail || 'claim-placeholder@globalsecuresend.com';
      const transfer = await tx.transfer.create({
          data: {
              senderId: userId,
              recipientEmail: transferRecipientEmail,
              amountSent: amount,
              currencySent: currency,
              amountReceived: amount,
              currencyReceived: currency,
              fee: 0,
              type: 'CARD',
              status: 'COMPLETED' // Funds effectively reserved
          }
      });

      // 1b. Create Virtual Card
      const mockStripeCardId = `ic_claim_${randomBytes(4).toString('hex')}`;
      const virtualCard = await tx.virtualCard.create({
          data: {
              transferId: transfer.id,
              userId: userId,
              stripeCardId: mockStripeCardId,
              stripeCardholderId: `ich_mock_${randomBytes(4).toString('hex')}`,
              last4: '4242', // Mock
              brand: 'visa',
              expMonth: 12,
              expYear: 2028,
              amount: amount,
              currency: currency,
              status: 'ACTIVE',
              unlockCode: randomBytes(3).toString('hex'), // 6 chars
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
      });

      // 1c. Create Claim Link
      const token = randomBytes(16).toString('hex');
      const claimLink = await tx.claimLink.create({
          data: {
              token,
              creatorId: userId,
              amount,
              currency,
              message,
              expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
              virtualCardId: virtualCard.id
          }
      });

      return { transfer, virtualCard, claimLink, token };
    });

    const { virtualCard, token } = result;
    const claimUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/claim/${token}`;

    // 2. Send Email (Side Effect - outside transaction)
    if (recipientEmail) {
        await sendEmail({
            to: recipientEmail,
            subject: 'Você recebeu um Pagamento Seguro GlobalSecure 🛡️',
            html: templates.cardClaim(
                recipientName || 'Usuário',
                amount.toString(),
                currency,
                claimUrl
            )
        });
    }

    console.info(`Secure Link Created: Transfer=${result.transfer.id}, Card=${result.virtualCard.id}, Link=${result.token}`);

    return NextResponse.json({ 
        success: true, 
        claimUrl,
        token,
        cardId: virtualCard.id,
        unlockCode: virtualCard.unlockCode 
    });

  } catch (error: any) {
    console.error('Create Claim Link Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
