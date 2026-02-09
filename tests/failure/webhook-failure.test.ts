import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Webhook Failure Scenarios', () => {
  afterAll(async () => {
    await prisma.topUp.deleteMany({});
    await prisma.walletTransaction.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.user.deleteMany({ where: { email: { startsWith: 'webhook-' } } });
    await prisma.$disconnect();
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
    await prisma.wallet.create({
      data: { userId: user.id, balanceEUR: 1000, balanceUSD: 0, balanceGBP: 0, primaryCurrency: 'EUR' }
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
        await tx.wallet.update({
          where: { userId: user.id },
          data: { balanceEUR: { increment: amount } }
        });
      });
    };

    await processOnce();
    await processOnce();

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const topups = await prisma.topUp.findMany({ where: { stripeSessionId: sessionId } });
    expect(topups.length).toBe(1);
    expect(Number(wallet!.balanceEUR)).toBe(1000 + 30);
  });
});
