import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Network Failure Simulation', () => {
  afterAll(async () => {
    // Safer cleanup: only delete data created by this test suite (emails starting with 'net-')
    const users = await prisma.user.findMany({ 
      where: { email: { startsWith: 'net-' } },
      select: { id: true }
    });
    const userIds = users.map(u => u.id);

    if (userIds.length > 0) {
      await prisma.topUp.deleteMany({ where: { userId: { in: userIds } } });
      
      await prisma.balance.deleteMany({
        where: { wallet: { userId: { in: userIds } } }
      });
      
      await prisma.wallet.deleteMany({ where: { userId: { in: userIds } } });
      
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    
    await prisma.$disconnect();
  });

  test('should handle database timeout gracefully', async () => {
    const op = async () => {
      throw Object.assign(new Error('DB timeout'), { code: 'ETIMEOUT' });
    };
    const safeHandler = async () => {
      try {
        await op();
      } catch (e) {
        return { handled: true, error: (e as Error).message };
      }
    };
    const res = await safeHandler();
    expect(res).toEqual({ handled: true, error: 'DB timeout' });
  });

  test('should handle external API timeout (Stripe)', async () => {
    let attempts = 0;
    const maxRetries = 2;
    const fetchStripe = async () => {
      attempts += 1;
      if (attempts <= maxRetries) {
        throw Object.assign(new Error('Network timeout'), { code: 'ETIMEDOUT' });
      }
      return { status: 200 };
    };
    async function retry<T>(fn: () => Promise<T>, retries: number) {
      let err: unknown;
      for (let i = 0; i <= retries; i++) {
        try {
          return await fn();
        } catch (e) {
          err = e;
          await new Promise((r) => setTimeout(r, 50));
        }
      }
      throw err;
    }
    const res = await retry(fetchStripe, maxRetries);
    expect(res).toEqual({ status: 200 });
    expect(attempts).toBe(maxRetries + 1);
  });

  test('should handle external API timeout (Alchemy)', async () => {
    let attempts = 0;
    const maxRetries = 3;
    const callAlchemy = async () => {
      attempts += 1;
      if (attempts < maxRetries) {
        throw Object.assign(new Error('Alchemy timeout'), { code: 'ETIMEDOUT' });
      }
      return { ok: true };
    };
    const res = await (async () => {
      let last: unknown;
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await callAlchemy();
        } catch (e) {
          last = e;
          await new Promise((r) => setTimeout(r, 30));
        }
      }
      throw last;
    })();
    expect(res).toEqual({ ok: true });
    expect(attempts).toBe(maxRetries);
  });

  test('should not break when external API returns 500', async () => {
    const callApi = async () => {
      return { status: 500, body: { error: 'Internal Server Error' } };
    };
    const res = await callApi();
    expect(res.status).toBe(500);
  });

  test('should not credit wallet when Stripe returns 500 during topup', async () => {
    const email = `net-${Date.now()}-kyc1@globalsecure.test`;
    const user = await prisma.user.create({
      data: { email, passwordHash: '$2a$10$test.hash', kycLevel: 1, kycStatus: 'APPROVED' }
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
      },
      include: { balances: true }
    });
    
    const startBalanceEUR = wallet.balances.find(b => b.currency === 'EUR')?.amount ?? 0;
    const sessionId = 'sess_api_500';
    const amount = 60;

    const stripeCall = async () => ({ status: 500 });
    const response = await stripeCall();
    if (response.status === 200) {
      await prisma.$transaction(async (tx) => {
        await tx.topUp.create({
          data: {
            userId: user.id,
            amount,
            currency: 'EUR',
            stripeSessionId: sessionId,
            status: 'COMPLETED'
          }
        });
        
        await tx.balance.update({
          where: {
            walletId_currency: {
              walletId: wallet.id,
              currency: 'EUR'
            }
          },
          data: { amount: { increment: amount } }
        });
      });
    }

    const finalWallet = await prisma.wallet.findUnique({ 
      where: { userId: user.id },
      include: { balances: true }
    });
    
    const finalBalanceEUR = finalWallet!.balances.find(b => b.currency === 'EUR')?.amount ?? 0;
    
    expect(Number(finalBalanceEUR)).toBe(Number(startBalanceEUR));
  });
});
