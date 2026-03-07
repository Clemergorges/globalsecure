import Stripe from 'stripe';
import { callPartnerWithBreaker } from '@/lib/services/partner-circuit-breaker';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

let cachedStripe: Stripe | null = null;
function stripeClient() {
  if (cachedStripe) return cachedStripe;
  const key = env.stripeSecretKey() || 'sk_test_mock';
  cachedStripe = new Stripe(key, {
    apiVersion: '2026-01-28.clover' as any,
    typescript: true,
  });
  return cachedStripe;
}

export function getStripe() {
  return stripeClient();
}

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
  if (!env.stripeSecretKey()) {
      logger.warn('stripe key missing, returning mock card');
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

export async function issueCard(userId: string, type: 'virtual' | 'physical', currency: 'eur' | 'usd' | 'gbp', limit?: number) {
    // Mock Implementation for now
    // In production: Create Cardholder -> Create Card
    logger.info({ userId, type, currency, hasLimit: typeof limit === 'number' }, 'stripe.issue_card.mock');
    
    return {
      id: 'ic_' + Math.random().toString(36).substr(2, 9),
      last4: Math.floor(1000 + Math.random() * 9000).toString(),
      exp_month: 12,
      exp_year: new Date().getFullYear() + 4,
      brand: Math.random() > 0.5 ? 'visa' : 'mastercard',
      status: 'active'
    };
}

export async function updateCardStatus(cardId: string, status: 'active' | 'inactive') {
  if (!env.stripeSecretKey()) return { status };
  
  return callPartnerWithBreaker('stripe', 'issuing.cards.updateStatus', async () =>
    stripeClient().issuing.cards.update(cardId, {
      status: status,
    }),
  );
}

export async function updateCardControls(cardId: string, controls: any) {
  if (!env.stripeSecretKey()) return controls;

  return callPartnerWithBreaker('stripe', 'issuing.cards.updateControls', async () =>
    stripeClient().issuing.cards.update(cardId, {
      spending_controls: controls,
    }),
  );
}

export async function createIssuingEphemeralKey(cardId: string, nonce: string) {
    // This is for the frontend to reveal sensitive details
    // It requires a specific API call
    if (!env.stripeSecretKey()) return { secret: 'ek_test_mock' };
    
    // This is a special endpoint, not always available in standard SDK typings without correct version
    // @ts-ignore
    return callPartnerWithBreaker('stripe', 'ephemeralKeys.create', async () =>
      // @ts-ignore
      stripeClient().ephemeralKeys.create({ issuing_card: cardId, nonce: nonce }, { apiVersion: '2022-08-01' }),
    );
}
