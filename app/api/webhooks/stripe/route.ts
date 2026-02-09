import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { pusherService } from '@/lib/services/pusher';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || 'sk_test_dummy').trim(), {
  // @ts-expect-error Stripe version mismatch
  apiVersion: '2024-12-18.acacia', // Bypass TS check for version mismatch
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    // Verificar assinatura do webhook
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', errorMessage);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  // Processar evento
  try {
    switch (event.type as any) {
      case 'issuing_authorization.request':
        await handleAuthorizationRequest(event.data.object as Stripe.Issuing.Authorization);
        break;

      case 'issuing_authorization.created':
        await handleAuthorizationCreated(event.data.object as Stripe.Issuing.Authorization);
        break;

      case 'issuing_transaction.created':
        await handleTransactionCreated(event.data.object as Stripe.Issuing.Transaction);
        break;

      case 'issuing_card.created':
        await handleCardCreated(event.data.object as Stripe.Issuing.Card);
        break;

      case 'issuing_card.updated':
        await handleCardUpdated(event.data.object as Stripe.Issuing.Card);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'identity.verification_session.verified':
        await handleIdentityVerified(event.data.object as Stripe.Identity.VerificationSession);
        break;

      case 'identity.verification_session.requires_action':
        // @ts-expect-error Accessing dynamic property
        console.log('Identity verification requires action:', (event.data.object).id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Quando alguém tenta usar o cartão
 */
async function handleAuthorizationRequest(
  authorization: Stripe.Issuing.Authorization
) {
  console.log('Authorization requested:', authorization.id);
  
  // Exemplo: Log de tentativa de uso (pode ser expandido para aprovação customizada)
  // Atualmente o Stripe Issuing aprova/nega baseado nas regras do cartão,
  // mas aqui poderíamos adicionar lógica extra se estivermos usando fluxo síncrono.
}

/**
 * Autorização aprovada/negada
 */
async function handleAuthorizationCreated(
  authorization: Stripe.Issuing.Authorization
) {
  const stripeCardId = typeof authorization.card === 'string' 
    ? authorization.card 
    : authorization.card.id;

  if (!stripeCardId) {
    console.error('Missing stripe card ID in authorization');
    return;
  }

  const card = await prisma.virtualCard.findFirst({
    where: { stripeCardId: stripeCardId } // Updated field name
  });

  if (!card) return;

  // Notificar via Pusher
  await pusherService.trigger(`card-${card.id}`, 'authorization-update', {
    status: authorization.status,
    amount: authorization.amount,
    merchant: authorization.merchant_data.name
  });
}

/**
 * Transação confirmada (dinheiro saiu)
 */
async function handleTransactionCreated(
  transaction: Stripe.Issuing.Transaction
) {
  const stripeCardId = typeof transaction.card === 'string'
    ? transaction.card
    : transaction.card.id;

  if (!stripeCardId) {
    console.error('Missing stripe card ID in transaction');
    return;
  }

  const card = await prisma.virtualCard.findFirst({
    where: { stripeCardId: stripeCardId }
  });

  if (!card) {
    console.log('Card not found for transaction:', stripeCardId);
    return;
  }

  await prisma.spendTransaction.create({
    data: {
      cardId: card.id,
      stripeAuthId: transaction.authorization as string,
      amount: transaction.amount / 100, // Stripe é em centavos
      currency: transaction.currency.toUpperCase(),
      merchantName: transaction.merchant_data.name,
      merchantCategory: transaction.merchant_data.category,
      merchantCountry: transaction.merchant_data.country,
      status: 'approved',
      // metadata field removed as it's not in the schema
      stripeTxId: transaction.id // Store ID in dedicated field if schema supports it, or ignore
    }
  });

  console.log(`Transaction recorded: ${transaction.id} for card ${card.id}`);
}

async function handleCardCreated(card: Stripe.Issuing.Card) {
  console.log('Card created on Stripe:', card.id);

  const transferId = card.metadata.transferId;
  if (!transferId) {
    console.log('Card created without transferId metadata, skipping sync');
    return;
  }

  const existing = await prisma.virtualCard.findUnique({
    where: { stripeCardId: card.id }
  });

  if (existing) return;

  const holderId = typeof card.cardholder === 'string' 
    ? card.cardholder 
    : card.cardholder.id;

  const statusMap: Record<string, 'ACTIVE' | 'INACTIVE' | 'CANCELED'> = {
    'active': 'ACTIVE',
    'inactive': 'INACTIVE',
    'canceled': 'CANCELED'
  };

  try {
    await prisma.virtualCard.create({
      data: {
        stripeCardId: card.id,
        transferId: transferId,
        stripeCardholderId: holderId,
        last4: card.last4,
        brand: card.brand,
        expMonth: card.exp_month,
        expYear: card.exp_year,
        // Calculate expiration date (last day of the month)
        expiresAt: new Date(card.exp_year, card.exp_month, 0),
        amount: 0, // Value unknown from webhook event alone
        currency: card.currency,
        status: statusMap[card.status] || 'INACTIVE'
      }
    });
    console.log('Synced new Stripe card to DB:', card.id);
  } catch (error) {
    console.error('Failed to sync new card:', error);
  }
}

async function handleCardUpdated(card: Stripe.Issuing.Card) {
  console.log('Card updated on Stripe:', card.id);

  const statusMap: Record<string, 'ACTIVE' | 'INACTIVE' | 'CANCELED'> = {
    'active': 'ACTIVE',
    'inactive': 'INACTIVE',
    'canceled': 'CANCELED'
  };

  const newStatus = statusMap[card.status];
  if (!newStatus) return;

  try {
    await prisma.virtualCard.update({
      where: { stripeCardId: card.id },
      data: { status: newStatus }
    });
    console.log('Updated card status in DB:', card.id, newStatus);
  } catch (error) {
    console.error('Failed to update card status:', error);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.metadata?.type !== 'WALLET_TOPUP') return;

  try {
    // 1. Mark TopUp as Completed
    // We try to update. If it fails (race condition or not found), we log but continue credit logic if userId exists
    try {
       await prisma.topUp.update({
        where: { stripeSessionId: session.id },
        data: { status: 'COMPLETED' },
      });
    } catch (e) {
      console.log('TopUp record update skipped (might be missing or already updated)');
    }

    const userId = session.metadata.userId;
    if (!userId) return;

    const currency = session.currency!.toUpperCase();
    const baseMinor = session.metadata?.base_amount_minor ? Number(session.metadata.base_amount_minor) : Math.round(Number(session.amount_total!) );
    const surchargeMinor = session.metadata?.surcharge_minor ? Number(session.metadata.surcharge_minor) : 0;
    const baseAmount = baseMinor / 100;
    const surchargeAmount = surchargeMinor / 100;

    // 2. Find Wallet
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    
    if (wallet) {
      // 3. Update Balance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {};
      if (currency === 'EUR') {
         updateData.balanceEUR = { increment: baseAmount };
      } else if (currency === 'USD') {
         updateData.balanceUSD = { increment: baseAmount };
      } else if (currency === 'GBP') {
         updateData.balanceGBP = { increment: baseAmount };
      }

      await prisma.wallet.update({
        where: { id: wallet.id },
        data: updateData
      });

      // 4. Create Transaction Record
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount: baseAmount,
          currency: currency,
          description: `Recarga via Cartão (Stripe)`
        }
      });
      
      if (surchargeAmount > 0) {
        await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'FEE',
            amount: surchargeAmount,
            currency: currency,
            description: 'Taxa de processamento de recarga (cartão)'
          }
        });
      }
      
      // 5. Notify User
      const { createNotification } = await import('@/lib/notifications');
      await createNotification({
        userId,
        title: 'Depósito Confirmado',
        body: `Sua recarga de ${currency} ${baseAmount.toFixed(2)} foi creditada com sucesso.`,
        type: 'SUCCESS'
      });
      
      console.log(`TopUp success: ${baseAmount} ${currency} for user ${userId}`);
    }
  } catch (error) {
    console.error('Error handling checkout completion:', error);
  }
}

async function handleIdentityVerified(session: Stripe.Identity.VerificationSession) {
  console.log('Identity verified:', session.id);
  const userId = session.metadata?.userId;

  if (!userId) {
    console.error('No userId in metadata for identity session');
    return;
  }

  // 1. Find the KYCDocument linked to this session
  const doc = await prisma.kYCDocument.findUnique({
    where: { stripeVerificationId: session.id }
  });

  if (doc) {
    // 2. Update Document Status
    await prisma.kYCDocument.update({
      where: { id: doc.id },
      data: {
        status: 'APPROVED',
        verifiedAt: new Date(),
        documentType: 'STRIPE_IDENTITY_PASSPORT', // Or fetch from session.last_verification_report
        issuingCountry: 'UNKNOWN' // Could fetch from report
      }
    });

    // 3. Upgrade User Level
    await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'APPROVED',
        kycLevel: 2 // Max Level
      }
    });

    // 4. Notify User
    const { createNotification } = await import('@/lib/notifications');
    await createNotification({
      userId,
      title: 'Identidade Verificada',
      body: 'Sua verificação foi concluída com sucesso! Seus limites foram aumentados.',
      type: 'SUCCESS'
    });
  } else {
    console.warn('KYC Document not found for session:', session.id);
  }
}
