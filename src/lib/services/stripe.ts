import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2026-01-28.clover' as any,
  typescript: true,
});

export interface CreateCardParams {
  amount: number;
  currency: string;
  recipientEmail: string;
  recipientName: string;
  transferId: string;
}

export async function createVirtualCard(params: CreateCardParams) {
  // In a real implementation, this would:
  // 1. Create or retrieve a Cardholder for the user
  // 2. Create a Card via Stripe Issuing API
  // 3. Return the card details
  
  // For now, if we don't have a real key, we throw or return mock
  if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('Stripe key missing, returning mock card');
      return {
        cardId: 'ic_mock_' + Date.now(),
        cardholderId: 'ich_mock_' + Date.now(),
        last4: '4242',
        number: '4242424242424242',
        cvc: '123',
        exp_month: 12,
        exp_year: 2030,
        brand: 'visa'
    };
  }

  // Real implementation would go here
  throw new Error('Not implemented');
}

export async function updateCardStatus(cardId: string, status: 'active' | 'inactive') {
  if (!process.env.STRIPE_SECRET_KEY) return { status };
  
  return await stripe.issuing.cards.update(cardId, {
    status: status,
  });
}

export async function updateCardControls(cardId: string, controls: any) {
  if (!process.env.STRIPE_SECRET_KEY) return controls;

  return await stripe.issuing.cards.update(cardId, {
    spending_controls: controls,
  });
}

export async function createIssuingEphemeralKey(cardId: string, nonce: string) {
    // This is for the frontend to reveal sensitive details
    // It requires a specific API call
    if (!process.env.STRIPE_SECRET_KEY) return { secret: 'ek_test_mock' };
    
    // This is a special endpoint, not always available in standard SDK typings without correct version
    // @ts-ignore
    return await stripe.ephemeralKeys.create(
        { issuing_card: cardId, nonce: nonce },
        { apiVersion: '2022-08-01' } // Issuing often needs specific version
    );
}
