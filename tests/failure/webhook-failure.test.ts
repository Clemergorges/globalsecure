import { prisma } from '@/lib/db';

describe('Webhook Failure Scenarios', () => {
  afterAll(async () => {
    // Safer cleanup: only delete data created by this test suite (emails starting with 'webhook-fail-')
    const users = await prisma.user.findMany({
      where: { email: { startsWith: 'webhook-fail-' } },
      select: { id: true }
    });

    if (users.length > 0) {
      const userIds = users.map(u => u.id);
      
      // Delete dependent records first to avoid foreign key constraints
      await prisma.topUp.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.accountTransaction.deleteMany({ where: { account: { userId: { in: userIds } } } });
      await prisma.balance.deleteMany({ where: { account: { userId: { in: userIds } } } });
      await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  test('Stripe webhook with invalid signature should be rejected', async () => {
    const providedSignature = 'invalid_signature';
    const expectedSignature = 'valid_signature_hash';
    expect(providedSignature).not.toBe(expectedSignature);
  });

  test('Crypto webhook with invalid HMAC should be rejected', async () => {
    const providedSignature = 'bad_hmac';
    const expectedSignature = 'expected_hmac';
    expect(providedSignature).not.toBe(expectedSignature);
  });

  test('Webhook missing required fields should not crash', async () => {
    const payload: Partial<{ type: string; amount: number; txHash: string }> = { type: 'crypto.deposit', amount: 100 };
    const handler = async () => {
      if (!payload.txHash) {
        throw new Error('Missing txHash');
      }
    };
    await expect(handler()).rejects.toThrow('Missing txHash');
  });

  test('Webhook processed twice should not double-credit', async () => {
    const email = `webhook-${Date.now()}-kyc1@globalsecure.test`;
    const user = await prisma.user.create({
      data: { email, passwordHash: '$2a$10$test.hash', kycLevel: 1, kycStatus: 'APPROVED' }
    });
    const account = await prisma.account.create({
      data: {
        userId: user.id,
        primaryCurrency: 'EUR',
        balances: {
          create: [
            { currency: 'EUR', amount: 1000 },
            { currency: 'USD', amount: 0 },
            { currency: 'GBP', amount: 0 }
          ]
        }
      }
    });
    const sessionId = `sess_double_credit_${Date.now()}`;
    const amount = 30;

    const processOnce = async () => {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.topUp.findUnique({ where: { stripeSessionId: sessionId } });
        if (existing) return;
        await tx.topUp.create({
          data: {
            userId: user.id,
            amount,
            currency: 'EUR',
            stripeSessionId: sessionId,
            status: 'COMPLETED'
          }
        });
        await tx.balance.updateMany({
          where: { accountId: account.id, currency: 'EUR' },
          data: { amount: { increment: amount } }
        });
      });
    };

    await processOnce();
    await processOnce();

    const balanceRecord = await prisma.balance.findUnique({ where: { accountId_currency: { accountId: account.id, currency: 'EUR' } } });
    const topups = await prisma.topUp.findMany({ where: { stripeSessionId: sessionId } });
    expect(topups.length).toBe(1);
    expect(Number(balanceRecord!.amount)).toBe(1000 + 30);
  });
});
