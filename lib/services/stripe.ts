import Stripe from 'stripe';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || 'sk_test_dummy').trim(), {
  // @ts-expect-error Stripe version mismatch
  apiVersion: '2024-12-18.acacia', // Bypass TS check for version mismatch
});

// Interface para parâmetros
interface CreateVirtualCardParams {
  amount: number;
  currency: string;
  recipientEmail: string;
  recipientName: string;
  transferId: string;
  existingCardholderId?: string; // Reuse existing cardholder
}

// Interface de retorno
interface VirtualCardData {
  cardId: string;
  cardholderId: string;
  last4: string;
  number: string;
  cvc: string;
  exp_month: number;
  exp_year: number;
  brand: string;
}

/**
 * Cria um cartão virtual REAL no Stripe Issuing
 */
export async function createVirtualCard(
  params: CreateVirtualCardParams
): Promise<VirtualCardData> {
  try {
    let cardholderId = params.existingCardholderId;

    // 1. Criar Cardholder se não existir
    if (!cardholderId) {
        const cardholder = await stripe.issuing.cardholders.create({
          name: params.recipientName,
          email: params.recipientEmail,
          phone_number: '+352691123456', // Required for 3DS/SCA in EU
          type: 'individual',
          status: 'active',
          billing: {
            address: {
              line1: '123 Main Street',
              city: 'Luxembourg',
              country: 'LU',
              postal_code: '1234'
            }
          },
          // Metadata para rastreamento
          metadata: {
            transferId: params.transferId,
            createdBy: 'GlobalSecureSend'
          }
        });
        cardholderId = cardholder.id;
    }

    // 2. Criar Card Virtual
    const card = await stripe.issuing.cards.create({
      cardholder: cardholderId,
      currency: params.currency.toLowerCase(),
      type: 'virtual',
      status: 'inactive', // Start inactive until transfer is approved
      spending_controls: {
        spending_limits: [
          {
            amount: Math.round(params.amount * 100), // Stripe usa centavos
            interval: 'all_time'
          }
        ],
        // Permitir apenas compras online (mais seguro)
        // allowed_categories: null, // null = todas categorias
        // blocked_categories: ['gambling_establishments'] as any, // TODO: Find correct category enum for API 2024-12-18
      },
      metadata: {
        transferId: params.transferId,
        recipientEmail: params.recipientEmail
      }
    });

    // 3. Retornar dados do cartão
    // ATENÇÃO: number e cvc só estão disponíveis no momento da criação!
    return {
      cardId: card.id,
      cardholderId: cardholderId,
      last4: card.last4,
      number: card.number!, // Sensível! Criptografar antes de salvar
      cvc: card.cvc!,
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      brand: card.brand
    };
  } catch (error: unknown) {
    console.error('Stripe Issuing Error:', error);
    const err = (error ?? {}) as { code?: string; message?: string; type?: string };
    if (err.code === 'resource_missing') {
       throw new Error(`Stripe Resource Missing: ${err.message ?? 'Unknown error'}`);
    }
    if (err.type === 'StripeAuthenticationError') {
       throw new Error('Stripe Authentication Failed. Check API Keys.');
    }
    throw new Error(`Failed to create virtual card: ${err.message ?? 'Unknown error'}`);
  }
}

/**
 * Recupera detalhes sensíveis do cartão (número, CVC)
 * Requer expand: ['number', 'cvc']
 */
export async function getCardDetails(cardId: string) {
  const card = await stripe.issuing.cards.retrieve(cardId, {
    expand: ['number', 'cvc']
  });

  return {
    number: card.number,
    cvc: card.cvc,
    last4: card.last4,
    exp_month: card.exp_month,
    exp_year: card.exp_year,
    status: card.status
  };
}

/**
 * Cancela um cartão
 */
export async function cancelCard(cardId: string) {
  return await stripe.issuing.cards.update(cardId, {
    status: 'canceled'
  });
}

/**
 * Atualiza o status de um cartão
 */
export async function updateCardStatus(cardId: string, status: 'active' | 'inactive' | 'canceled') {
  return await stripe.issuing.cards.update(cardId, {
    status: status
  });
}

/**
 * Cria uma Ephemeral Key para Apple/Google Pay (Issuing)
 */
export async function createIssuingEphemeralKey(cardId: string, apiVersion: string) {
    return await stripe.ephemeralKeys.create(
      { issuing_card: cardId },
      { apiVersion: apiVersion }
    );
}

/**
 * Atualiza controles de gastos de um cartão
 */
export async function updateCardControls(
  cardId: string, 
  controls: { 
    spending_limits?: Array<{ amount: number; interval: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time' }>;
    blocked_categories?: string[];
  }
) {
  // Convert limits to cents
  const limits = controls.spending_limits?.map(l => ({
    amount: Math.round(l.amount * 100),
    interval: l.interval
  }));

  return await stripe.issuing.cards.update(cardId, {
    spending_controls: {
        spending_limits: limits,
        blocked_categories: controls.blocked_categories as any
    }
  });
}

/**
 * Lista transações de um cartão
 */
export async function getCardTransactions(cardId: string) {
  const transactions = await stripe.issuing.transactions.list({
    card: cardId,
    limit: 100
  });

  return transactions.data.map(tx => ({
    id: tx.id,
    amount: tx.amount / 100,
    currency: tx.currency,
    merchant: tx.merchant_data?.name || 'Unknown',
    category: tx.merchant_data?.category || 'Unknown',
    createdAt: new Date(tx.created * 1000)
  }));
}
