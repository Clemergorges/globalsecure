import { Prisma } from '@prisma/client';
import { prisma } from '../setup/prisma';

const mockConstructEvent = jest.fn();
const mockSendEmail = jest.fn();
const mockCardSpent = jest.fn();

jest.mock('next/headers', () => ({
  headers: async () => ({
    get: (key: string) => (key === 'stripe-signature' ? 'sig_test' : null),
  }),
}));

jest.mock('@/lib/services/stripe', () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: (...args: any[]) => mockConstructEvent(...args),
    },
  }),
}));

jest.mock('@/lib/services/email', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
  templates: {
    cardSpent: (...args: any[]) => mockCardSpent(...args),
  },
}));

import { POST as stripeWebhookPost } from '@/app/api/webhooks/stripe/route';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('MVP Feb/2026: Stripe issuing webhook -> cardSpent email + Notification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendEmail.mockResolvedValue({ ok: true, messageId: 'm1' });
    mockCardSpent.mockReturnValue('<html>cardSpent</html>');
  });

  afterEach(async () => {
    const users = await prisma.user.findMany({
      where: { email: { contains: 'mvp_stripe_spent_' } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length === 0) return;

    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.spendTransaction.deleteMany({ where: { card: { transfer: { senderId: { in: ids } } } } });
    await prisma.virtualCard.deleteMany({ where: { transfer: { senderId: { in: ids } } } });
    await prisma.transfer.deleteMany({ where: { senderId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  test('approved authorization updates card usage, creates SpendTransaction, emails cardSpent and creates Notification', async () => {
    const senderEmail = `${uid('mvp_stripe_spent_')}@test.com`;
    const recipientEmail = `${uid('mvp_stripe_spent_')}@test.com`;

    const sender = await prisma.user.create({
      data: { email: senderEmail, passwordHash: 'hash', emailVerified: true, role: 'END_USER' },
      select: { id: true },
    });
    const recipient = await prisma.user.create({
      data: { email: recipientEmail, passwordHash: 'hash', emailVerified: true, role: 'END_USER' },
      select: { id: true },
    });

    const transfer = await prisma.transfer.create({
      data: {
        senderId: sender.id,
        recipientEmail,
        recipientName: 'Recipient',
        amountSent: new Prisma.Decimal(100),
        currencySent: 'EUR',
        amountReceived: new Prisma.Decimal(100),
        currencyReceived: 'EUR',
        fee: new Prisma.Decimal(0),
        feePercentage: new Prisma.Decimal(0),
        type: 'CARD',
        status: 'COMPLETED',
      },
      select: { id: true },
    });

    await prisma.virtualCard.create({
      data: {
        transferId: transfer.id,
        userId: null,
        stripeCardId: 'ic_test_spent_1',
        stripeCardholderId: 'ich_test_1',
        last4: '4242',
        brand: 'visa',
        expMonth: 12,
        expYear: 2030,
        amount: new Prisma.Decimal(100),
        currency: 'EUR',
        amountUsed: new Prisma.Decimal(0),
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        unlockedAt: new Date(),
      },
    });

    mockConstructEvent.mockReturnValue({
      id: 'evt_test_1',
      type: 'issuing_authorization.request',
      data: {
        object: {
          id: 'iauth_test_1',
          amount: 2500,
          currency: 'eur',
          card: { id: 'ic_test_spent_1' },
          merchant_data: { name: 'Test Merchant', country: 'DE', category: '5411', city: 'Berlin' },
        },
      },
    });

    const res = await stripeWebhookPost(new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.approved).toBe(true);

    const updatedCard = await prisma.virtualCard.findUnique({ where: { stripeCardId: 'ic_test_spent_1' } });
    expect(updatedCard?.amountUsed.toFixed(2)).toBe('25.00');

    const spendTx = await prisma.spendTransaction.findUnique({ where: { stripeAuthId: 'iauth_test_1' } });
    expect(spendTx).toBeTruthy();
    expect(spendTx!.status).toBe('approved');

    expect(mockCardSpent).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: recipientEmail,
        subject: 'Your GlobalSecure card has been used',
      }),
    );

    const notif = await prisma.notification.findFirst({ where: { userId: recipient.id, type: 'CARD_SPENT' }, orderBy: { createdAt: 'desc' } });
    expect(notif).toBeTruthy();
  });
});

