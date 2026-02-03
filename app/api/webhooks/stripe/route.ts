import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { pusherService } from '@/lib/services/pusher';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
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
  // @ts-ignore
  const stripeCardId = authorization.card.id || authorization.card; // Pode vir expandido ou ID

  const card = await prisma.virtualCard.findFirst({
    where: { cardToken: stripeCardId } // Assumindo que cardToken armazena o ID do cartão Stripe
  });

  if (!card) return;

  // Notificar via Pusher
  // @ts-ignore
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
  // @ts-ignore
  const stripeCardId = transaction.card.id || transaction.card;

  const card = await prisma.virtualCard.findFirst({
    where: { cardToken: stripeCardId }
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
      metadata: {
        stripeTransactionId: transaction.id
      }
    }
  });

  console.log(`Transaction recorded: ${transaction.id} for card ${card.id}`);
}

async function handleCardCreated(card: Stripe.Issuing.Card) {
  console.log('Card created on Stripe:', card.id);
}

async function handleCardUpdated(card: Stripe.Issuing.Card) {
  console.log('Card updated on Stripe:', card.id);
}
