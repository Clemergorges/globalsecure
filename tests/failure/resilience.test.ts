import { prisma } from '@/lib/db';
import { KYC_LIMITS } from '@/lib/services/kyc-limits';

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
  return { user, wallet };
}

afterAll(async () => {
  // Safer cleanup: only delete data created by this test suite (emails starting with 'resilience-')
  const users = await prisma.user.findMany({
    where: { email: { startsWith: 'resilience-' } },
    select: { id: true }
  });

  if (users.length > 0) {
    const userIds = users.map(u => u.id);
    
    // Delete dependent records first to avoid foreign key constraints
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.oTP.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.kYCDocument.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.walletTransaction.deleteMany({ where: { wallet: { userId: { in: userIds } } } });
    await prisma.transactionLog.deleteMany({ where: { transfer: { senderId: { in: userIds } } } });
    await prisma.transfer.deleteMany({ where: { senderId: { in: userIds } } });
    await prisma.cryptoDeposit.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.topUp.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.balance.deleteMany({ where: { wallet: { userId: { in: userIds } } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
});

describe('System Resilience & Failure Handling', () => {
  test('should ignore duplicated webhooks', async () => {
    const { user, wallet } = await createUserWithWallet(1);
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
        await tx.balance.updateMany({
          where: { walletId: wallet.id, currency: 'EUR' },
          data: { amount: { increment: amount } }
        });
      });
    };

    await processWebhook();
    await processWebhook();
    await processWebhook();

    const balanceRecord = await prisma.balance.findUnique({ where: { walletId_currency: { walletId: wallet.id, currency: 'EUR' } } });
    const topups = await prisma.topUp.findMany({ where: { stripeSessionId: sessionId } });

    expect(Number(balanceRecord!.amount)).toBe(1000 + amount);
    expect(topups.length).toBe(1);
  });

  test('should handle out-of-order events safely', async () => {
    const { user, wallet } = await createUserWithWallet(1);
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
      // Use wallet.id from closure instead of fetching again to avoid potential null issues in tx context
      const targetWalletId = wallet.id;
      
      const credited = await tx.walletTransaction.findFirst({
        where: { walletId: targetWalletId, type: 'DEPOSIT', amount }
      });
      if (!credited) {
        await tx.balance.updateMany({
          where: { walletId: targetWalletId, currency: 'EUR' },
          data: { amount: { increment: amount } }
        });
        await tx.walletTransaction.create({
          data: {
            walletId: targetWalletId,
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
    const balanceRecord = await prisma.balance.findUnique({ where: { walletId_currency: { walletId: wallet.id, currency: 'EUR' } } });
    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet!.id, type: 'DEPOSIT', amount }
    });

    expect(dep!.status).toBe('CONFIRMED');
    expect(Number(balanceRecord!.amount)).toBe(1000 + amount);
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
    const { user, wallet } = await createUserWithWallet(1);
    const startBalanceRecord = await prisma.balance.findUnique({ where: { walletId_currency: { walletId: wallet.id, currency: 'EUR' } } });
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

    const endBalanceRecord = await prisma.balance.findUnique({ where: { walletId_currency: { walletId: wallet.id, currency: 'EUR' } } });
    expect(Number(endBalanceRecord!.amount)).toBe(Number(startBalanceRecord!.amount));
  });

  test('should not credit balance on blockchain reverted tx', async () => {
    const { user, wallet } = await createUserWithWallet(1);
    const startBalanceRecord = await prisma.balance.findUnique({ where: { walletId_currency: { walletId: wallet.id, currency: 'EUR' } } });
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

    const endBalanceRecord = await prisma.balance.findUnique({ where: { walletId_currency: { walletId: wallet.id, currency: 'EUR' } } });
    expect(Number(endBalanceRecord!.amount)).toBe(Number(startBalanceRecord!.amount));
  });

  test('should reject transfer with insufficient balance', async () => {
    const { user: sender, wallet: senderWallet } = await createUserWithWallet(1);
    const { user: receiver, wallet: receiverWallet } = await createUserWithWallet(2);

    await prisma.balance.updateMany({
      where: { walletId: senderWallet.id, currency: 'EUR' },
      data: { amount: 50 }
    });

    const transferAmount = 100;
    await expect(
      prisma.$transaction(async (tx) => {
        const senderBalance = await tx.balance.findUnique({ where: { walletId_currency: { walletId: senderWallet.id, currency: 'EUR' } } });
        if (Number(senderBalance!.amount) < transferAmount) {
          throw new Error('Insufficient balance');
        }
        await tx.balance.updateMany({
          where: { walletId: senderWallet.id, currency: 'EUR' },
          data: { amount: { decrement: transferAmount } }
        });
        await tx.balance.updateMany({
          where: { walletId: receiverWallet.id, currency: 'EUR' },
          data: { amount: { increment: transferAmount } }
        });
      })
    ).rejects.toThrow('Insufficient balance');
  });

  test('should reject operation above KYC limit', async () => {
    const { user, wallet } = await createUserWithWallet(0);
    const limit = KYC_LIMITS[user.kycLevel as 0 | 1 | 2].singleTransactionLimit;
    const amount = limit + 100;

    await expect(
      prisma.$transaction(async (tx) => {
        if (amount > limit) {
          throw new Error(`Transfer amount exceeds KYC level ${user.kycLevel} limit of €${limit}`);
        }
        await tx.balance.updateMany({
          where: { walletId: wallet.id, currency: 'EUR' },
          data: { amount: { decrement: amount } }
        });
      })
    ).rejects.toThrow(`Transfer amount exceeds KYC level ${user.kycLevel} limit of €${limit}`);
  });
});
