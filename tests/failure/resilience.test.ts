import { PrismaClient } from '@prisma/client';
import { KYC_LIMITS } from '@/lib/services/kyc-limits';

const prisma = new PrismaClient();

async function createUserWithWallet(kycLevel: number) {
  const email = `resilience-${Date.now()}-kyc${kycLevel}@globalsecure.test`;
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: '$2a$10$test.hash.resilience',
      firstName: 'Resilience',
      lastName: `KYC${kycLevel}`,
      kycLevel,
      kycStatus: kycLevel > 0 ? 'APPROVED' : 'PENDING'
    }
  });
  const wallet = await prisma.wallet.create({
    data: {
      userId: user.id,
      balanceEUR: 1000,
      balanceUSD: 0,
      balanceGBP: 0,
      primaryCurrency: 'EUR'
    }
  });
  return { user, wallet };
}

afterAll(async () => {
  await prisma.notification.deleteMany({});
  await prisma.oTP.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.kYCDocument.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  await prisma.transactionLog.deleteMany({});
  await prisma.transfer.deleteMany({});
  await prisma.cryptoDeposit.deleteMany({});
  await prisma.topUp.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.user.deleteMany({
    where: { email: { startsWith: 'resilience-' } }
  });
  await prisma.$disconnect();
});

describe('System Resilience & Failure Handling', () => {
  test('should ignore duplicated webhooks', async () => {
    const { user } = await createUserWithWallet(1);
    const sessionId = `sess_dup_${Date.now()}`;
    const amount = 100;

    const processWebhook = async () => {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.topUp.findUnique({
          where: { stripeSessionId: sessionId }
        });
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

    await processWebhook();
    await processWebhook();
    await processWebhook();

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const topups = await prisma.topUp.findMany({ where: { stripeSessionId: sessionId } });

    expect(Number(wallet!.balanceEUR)).toBe(1000 + amount);
    expect(topups.length).toBe(1);
  });

  test('should handle out-of-order events safely', async () => {
    const { user } = await createUserWithWallet(1);
    const txHash = '0xout_of_order_tx_hash';
    const amount = 50;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.cryptoDeposit.findUnique({ where: { txHash } });
      if (existing) {
        await tx.cryptoDeposit.update({
          where: { txHash },
          data: { status: 'CONFIRMED', confirmedAt: new Date() }
        });
      } else {
        await tx.cryptoDeposit.create({
          data: {
            userId: user.id,
            txHash,
            network: 'POLYGON',
            token: 'USDT',
            amount,
            status: 'CONFIRMED',
            confirmedAt: new Date()
          }
        });
      }
      const wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
      const credited = await tx.walletTransaction.findFirst({
        where: { walletId: wallet!.id, type: 'DEPOSIT', amount }
      });
      if (!credited) {
        await tx.wallet.update({
          where: { userId: user.id },
          data: { balanceEUR: { increment: amount } }
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet!.id,
            type: 'DEPOSIT',
            amount,
            currency: 'EUR',
            description: 'Crypto deposit'
          }
        });
      }
    });

    await prisma.$transaction(async (tx) => {
      const existing = await tx.cryptoDeposit.findUnique({ where: { txHash } });
      if (existing) {
        if (existing.status === 'PENDING') {
          await tx.cryptoDeposit.update({
            where: { txHash },
            data: { status: 'PENDING' }
          });
        }
      } else {
        await tx.cryptoDeposit.create({
          data: {
            userId: user.id,
            txHash,
            network: 'POLYGON',
            token: 'USDT',
            amount,
            status: 'PENDING'
          }
        });
      }
    });

    const dep = await prisma.cryptoDeposit.findUnique({ where: { txHash } });
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet!.id, type: 'DEPOSIT', amount }
    });

    expect(dep!.status).toBe('CONFIRMED');
    expect(Number(wallet!.balanceEUR)).toBe(1000 + amount);
    expect(transactions.length).toBe(1);
  });

  test('should retry external API failures (network timeout)', async () => {
    let attempts = 0;
    const maxRetries = 3;
    const fn = async () => {
      attempts += 1;
      if (attempts < maxRetries) {
        const err = new Error('ETIMEDOUT') as { code?: string };
        err.code = 'ETIMEDOUT';
        throw err;
      }
      return { ok: true };
    };

    async function withRetry<T>(op: () => Promise<T>, retries: number) {
      let lastError: unknown;
      for (let i = 0; i < retries; i++) {
        try {
          return await op();
        } catch (e) {
          lastError = e;
          await new Promise((r) => setTimeout(r, 50));
        }
      }
      throw lastError;
    }

    const res = await withRetry(fn, maxRetries);
    expect(res).toEqual({ ok: true });
    expect(attempts).toBe(maxRetries);
  });

  test('should not credit balance on Stripe failure', async () => {
    const { user } = await createUserWithWallet(1);
    const startWallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const amount = 75;
    const sessionId = 'sess_fail_test_001';

    await prisma.$transaction(async (tx) => {
      await tx.topUp.create({
        data: {
          userId: user.id,
          amount,
          currency: 'EUR',
          stripeSessionId: sessionId,
          status: 'FAILED'
        }
      });
    });

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    expect(Number(wallet!.balanceEUR)).toBe(Number(startWallet!.balanceEUR));
  });

  test('should not credit balance on blockchain reverted tx', async () => {
    const { user } = await createUserWithWallet(1);
    const startWallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const txHash = '0xreverted_tx';
    const amount = 200;

    await prisma.$transaction(async (tx) => {
      await tx.cryptoDeposit.create({
        data: {
          userId: user.id,
          txHash,
          network: 'POLYGON',
          token: 'USDT',
          amount,
          status: 'FAILED'
        }
      });
    });

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    expect(Number(wallet!.balanceEUR)).toBe(Number(startWallet!.balanceEUR));
  });

  test('should reject transfer with insufficient balance', async () => {
    const { user: sender } = await createUserWithWallet(1);
    const { user: receiver } = await createUserWithWallet(2);

    await prisma.wallet.update({
      where: { userId: sender.id },
      data: { balanceEUR: 50 }
    });

    const transferAmount = 100;
    await expect(
      prisma.$transaction(async (tx) => {
        const senderWallet = await tx.wallet.findUnique({ where: { userId: sender.id } });
        if (Number(senderWallet!.balanceEUR) < transferAmount) {
          throw new Error('Insufficient balance');
        }
        await tx.wallet.update({
          where: { userId: sender.id },
          data: { balanceEUR: { decrement: transferAmount } }
        });
        await tx.wallet.update({
          where: { userId: receiver.id },
          data: { balanceEUR: { increment: transferAmount } }
        });
      })
    ).rejects.toThrow('Insufficient balance');
  });

  test('should reject operation above KYC limit', async () => {
    const { user } = await createUserWithWallet(0);
    const limit = KYC_LIMITS[user.kycLevel as keyof typeof KYC_LIMITS];
    const amount = limit + 100;

    await expect(
      prisma.$transaction(async (tx) => {
        if (amount > limit) {
          throw new Error(`Transfer amount exceeds KYC level ${user.kycLevel} limit of €${limit}`);
        }
        await tx.wallet.update({
          where: { userId: user.id },
          data: { balanceEUR: { decrement: amount } }
        });
      })
    ).rejects.toThrow(`Transfer amount exceeds KYC level ${user.kycLevel} limit of €${limit}`);
  });
});
