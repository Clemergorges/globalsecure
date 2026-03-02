import { getStripe } from '@/lib/services/stripe';
import { callPartnerWithBreaker } from '@/lib/services/partner-circuit-breaker';
import { env } from '@/lib/config/env';

export type IssuerCardData = {
  cardId: string;
  cardholderId: string;
  last4: string;
  brand: string;
  exp_month: number;
  exp_year: number;
  number?: string;
  cvc?: string;
  status?: string;
};

export type IssuerCardReveal = {
  pan: string;
  cvv: string;
  expMonth: number;
  expYear: number;
};

export type IssuerConnector = {
  kind: 'mock' | 'stripe_sandbox';
  createVirtualCard(params: {
    amount: number;
    currency: string;
    recipientEmail?: string;
    recipientName?: string;
    transferId?: string;
    userId?: string;
  }): Promise<IssuerCardData>;
  updateCardStatus(cardId: string, status: 'active' | 'inactive'): Promise<{ status: string }>;
  updateCardControls(cardId: string, controls: any): Promise<any>;
  revealCard(cardId: string, fallback: { last4: string; expMonth: number; expYear: number }): Promise<IssuerCardReveal>;
  healthCheck(): Promise<{ ok: boolean; details?: Record<string, any> }>;
};

function asCurrency(code: string) {
  return code.trim().toLowerCase();
}

function getIssuerConnectorKind() {
  const raw = process.env.ISSUER_CONNECTOR || 'mock';
  const v = raw.trim().toLowerCase();
  return v === 'stripe_sandbox' ? ('stripe_sandbox' as const) : ('mock' as const);
}

function mockCardId() {
  return `ic_mock_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function mockCardholderId() {
  return `ich_mock_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function mockLast4() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${n}`;
}

export function getIssuerConnector(): IssuerConnector {
  const kind = getIssuerConnectorKind();

  if (kind === 'stripe_sandbox') {
    return {
      kind,
      async createVirtualCard(params) {
        if (!env.stripeSecretKey()) {
          throw new Error('STRIPE_SECRET_KEY_MISSING');
        }

        const recipientEmail = params.recipientEmail || 'sandbox@example.com';
        const recipientName = params.recipientName || 'Sandbox User';
        const currency = asCurrency(params.currency);

        const cardholder = await callPartnerWithBreaker('stripe', 'issuing.cardholders.create', async () =>
          getStripe().issuing.cardholders.create({
            type: 'individual',
            name: recipientName,
            email: recipientEmail,
            billing: {
              address: {
                line1: '1 Market St',
                city: 'San Francisco',
                state: 'CA',
                postal_code: '94105',
                country: 'US',
              },
            },
            status: 'active',
          }),
        );

        const card = await callPartnerWithBreaker('stripe', 'issuing.cards.create', async () =>
          getStripe().issuing.cards.create({
            type: 'virtual',
            currency,
            cardholder: cardholder.id,
            status: 'active',
          }),
        );

        return {
          cardId: card.id,
          cardholderId: cardholder.id,
          last4: card.last4 || '0000',
          brand: (card.brand as any) || 'visa',
          exp_month: card.exp_month,
          exp_year: card.exp_year,
          status: card.status,
        };
      },
      async updateCardStatus(cardId, status) {
        if (!env.stripeSecretKey()) throw new Error('STRIPE_SECRET_KEY_MISSING');
        const updated = await callPartnerWithBreaker('stripe', 'issuing.cards.updateStatus', async () =>
          getStripe().issuing.cards.update(cardId, { status }),
        );
        return { status: updated.status || status };
      },
      async updateCardControls(cardId, controls) {
        if (!env.stripeSecretKey()) throw new Error('STRIPE_SECRET_KEY_MISSING');
        return callPartnerWithBreaker('stripe', 'issuing.cards.updateControls', async () =>
          getStripe().issuing.cards.update(cardId, { spending_controls: controls }),
        );
      },
      async revealCard(cardId, fallback) {
        if (!env.stripeSecretKey()) {
          return {
            pan: `4242 4242 4242 ${fallback.last4}`,
            cvv: '123',
            expMonth: fallback.expMonth,
            expYear: fallback.expYear,
          };
        }
        try {
          const stripeCard = await callPartnerWithBreaker('stripe', 'issuing.cards.retrieve', async () =>
            getStripe().issuing.cards.retrieve(cardId, { expand: ['number', 'cvc'] }),
          );
          const pan = (stripeCard as any).number ? String((stripeCard as any).number) : `**** **** **** ${fallback.last4}`;
          const cvc = (stripeCard as any).cvc ? String((stripeCard as any).cvc) : '***';
          return { pan, cvv: cvc, expMonth: stripeCard.exp_month, expYear: stripeCard.exp_year };
        } catch {
          return {
            pan: `**** **** **** ${fallback.last4}`,
            cvv: '***',
            expMonth: fallback.expMonth,
            expYear: fallback.expYear,
          };
        }
      },
      async healthCheck() {
        if (!env.stripeSecretKey()) return { ok: false, details: { error: 'STRIPE_SECRET_KEY_MISSING' } };
        try {
          await callPartnerWithBreaker('stripe', 'accounts.retrieve', async () => getStripe().accounts.retrieve());
          return { ok: true };
        } catch (e: any) {
          return { ok: false, details: { error: e?.message || 'STRIPE_SANDBOX_UNREACHABLE' } };
        }
      },
    };
  }

  return {
    kind,
    async createVirtualCard() {
      return {
        cardId: mockCardId(),
        cardholderId: mockCardholderId(),
        last4: mockLast4(),
        brand: 'visa',
        exp_month: 12,
        exp_year: new Date().getFullYear() + 4,
        number: '4242424242424242',
        cvc: '123',
        status: 'active',
      };
    },
    async updateCardStatus(_cardId, status) {
      return { status };
    },
    async updateCardControls(_cardId, controls) {
      return controls;
    },
    async revealCard(_cardId, fallback) {
      return { pan: `4242 4242 4242 ${fallback.last4}`, cvv: '123', expMonth: fallback.expMonth, expYear: fallback.expYear };
    },
    async healthCheck() {
      return { ok: true, details: { issuer: 'mock' } };
    },
  };
}
