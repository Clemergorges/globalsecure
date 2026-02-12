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

    // 1. Create a Transfer to track funds (reserved)
    // Use real email if provided, otherwise placeholder
    const transferRecipientEmail = recipientEmail || 'claim-placeholder@globalsecuresend.com';

    const transfer = await prisma.transfer.create({
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

    // 2. Create the Virtual Card (Mocking Stripe Issuing for MVP)
    // In production, call stripe.issuing.cards.create() here
    const mockStripeCardId = `ic_claim_${randomBytes(4).toString('hex')}`;
    
    const virtualCard = await prisma.virtualCard.create({
        data: {
            transferId: transfer.id,
            userId: userId, // Remains owned by creator
            stripeCardId: mockStripeCardId,
            stripeCardholderId: `ich_mock_${randomBytes(4).toString('hex')}`,
            last4: '4242', // Mock
            brand: 'visa',
            expMonth: 12,
            expYear: 2028,
            amount: amount,
            currency: currency,
            status: 'ACTIVE',
            unlockStatus: 'LOCKED', // Starts locked per security flow
            unlockCode: randomBytes(3).toString('hex'), // 6 chars
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days card validity
        }
    });

    // 3. Create the Claim Link
    const token = randomBytes(16).toString('hex');
    
    const claimLink = await prisma.claimLink.create({
        data: {
            token,
            creatorId: userId,
            amount,
            currency,
            message,
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // Link expires in 48h
            virtualCardId: virtualCard.id
        }
    });

    const claimUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/claim/${token}`;

    // 4. Send Email if recipient is provided
    if (recipientEmail) {
        await sendEmail({
            to: recipientEmail,
            subject: 'Você recebeu um Cartão Virtual GlobalSecure! 🎁',
            html: templates.cardClaim(
                recipientName || 'Usuário',
                amount.toString(),
                currency,
                claimUrl
            )
        });
        
        // Also send the unlock code in a separate email or same?
        // For security, usually code is separate or sender gives it. 
        // The template says: "Você precisará do Código de Desbloqueio fornecido pelo remetente."
        // So we do NOT send the code here. Correct.
    }

    return NextResponse.json({ 
        success: true, 
        claimUrl,
        token,
        cardId: virtualCard.id,
        unlockCode: virtualCard.unlockCode // Sender needs to see this to share it!
    });

  } catch (error: any) {
    console.error('Create Claim Link Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
