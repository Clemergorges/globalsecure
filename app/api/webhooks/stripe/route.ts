import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { pusherService } from '@/lib/services/pusher';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2024-12-18.acacia' as any, // Bypass TS check for version mismatch
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
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  // Processar evento
  try {
    switch (event.type) {
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
