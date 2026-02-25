import { Prisma } from '@prisma/client';
import { prisma } from '../setup/prisma';

const mockCheckAuth = jest.fn();
const mockSendUsdtFromHotWallet = jest.fn();

jest.mock('@/lib/auth', () => ({
  checkAuth: () => mockCheckAuth(),
}));

jest.mock('@/lib/services/email', () => ({
  sendEmail: jest.fn(async () => ({ ok: true })),
  templates: {},
}));

jest.mock('@/lib/services/polygon', () => ({
  sendUsdtFromHotWallet: (...args: any[]) => mockSendUsdtFromHotWallet(...args),
}));

import { POST as withdrawPost } from '@/app/api/crypto/withdraw/route';
import { GET as processQueueGet } from '@/app/api/cron/process-queue/route';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('MVP Feb/2026: USDT withdraw (queue + CRYPTO_WITHDRAW_ONCHAIN_ENABLED toggle)', () => {
  const createdWithdrawIds: string[] = [];
  const createdJobIds: string[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    createdWithdrawIds.length = 0;
    createdJobIds.length = 0;
    mockSendUsdtFromHotWallet.mockResolvedValue('0xtxhash');
  });

  afterEach(async () => {
    const users = await prisma.user.findMany({
      where: { email: { contains: 'mvp_withdraw_' } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length === 0) return;

    if (createdJobIds.length > 0) {
      await prisma.job.deleteMany({ where: { id: { in: createdJobIds } } });
    }
    if (createdWithdrawIds.length > 0) {
      await prisma.job.deleteMany({
        where: {
          type: 'PROCESS_WITHDRAW',
          OR: createdWithdrawIds.map((id) => ({ payload: { string_contains: id } })),
        },
      });
    }
    await prisma.cryptoWithdraw.deleteMany({ where: { userId: { in: ids } } });
    await prisma.accountTransaction.deleteMany({ where: { account: { userId: { in: ids } } } });
    await prisma.fiatBalance.deleteMany({ where: { userId: { in: ids } } });
    await prisma.account.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  test("when CRYPTO_WITHDRAW_ONCHAIN_ENABLED='false' worker simulates txHash", async () => {
    process.env.CRYPTO_WITHDRAW_ONCHAIN_ENABLED = 'false';

    const email = `${uid('mvp_withdraw_')}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR' } },
      },
      select: { id: true, account: { select: { id: true } } },
    });

    await prisma.fiatBalance.create({ data: { userId: user.id, currency: 'USD', amount: new Prisma.Decimal(100) } });

    mockCheckAuth.mockResolvedValue({ userId: user.id, role: 'END_USER' });

    const withdrawRes = await withdrawPost(
      new Request('http://localhost/api/crypto/withdraw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount: 10, toAddress: '0x1234567890123456789012345678901234567890' }),
      }),
    );

    expect(withdrawRes.status).toBe(200);
    const withdrawJson = await withdrawRes.json();
    expect(withdrawJson.withdrawId).toBeTruthy();
    createdWithdrawIds.push(withdrawJson.withdrawId);

    const job = await prisma.job.findFirst({
      where: { type: 'PROCESS_WITHDRAW', payload: { string_contains: withdrawJson.withdrawId } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (job?.id) createdJobIds.push(job.id);

    const before = await prisma.fiatBalance.findUnique({ where: { userId_currency: { userId: user.id, currency: 'USD' } } });
    expect(before?.amount.toFixed(2)).toBe('90.00');

    let updated = await prisma.cryptoWithdraw.findUnique({ where: { id: withdrawJson.withdrawId } });
    for (let i = 0; i < 5 && updated?.status !== 'CONFIRMED'; i++) {
      const processRes = await processQueueGet(new Request('http://localhost/api/cron/process-queue', { method: 'GET' }));
      expect(processRes.status).toBe(200);
      await new Promise((r) => setTimeout(r, 30));
      updated = await prisma.cryptoWithdraw.findUnique({ where: { id: withdrawJson.withdrawId } });
    }

    expect(updated?.status).toBe('CONFIRMED');
    expect(updated?.txHash).toMatch(/^simulated-/);
    expect(mockSendUsdtFromHotWallet).not.toHaveBeenCalled();
  });

  test("when CRYPTO_WITHDRAW_ONCHAIN_ENABLED='true' worker calls sendUsdtFromHotWallet", async () => {
    process.env.CRYPTO_WITHDRAW_ONCHAIN_ENABLED = 'true';

    const email = `${uid('mvp_withdraw_')}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR' } },
      },
      select: { id: true },
    });

    await prisma.fiatBalance.create({ data: { userId: user.id, currency: 'USD', amount: new Prisma.Decimal(100) } });
    mockCheckAuth.mockResolvedValue({ userId: user.id, role: 'END_USER' });
    mockSendUsdtFromHotWallet.mockResolvedValue('0xabc123');

    const withdrawRes = await withdrawPost(
      new Request('http://localhost/api/crypto/withdraw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount: 10, toAddress: '0x1234567890123456789012345678901234567890' }),
      }),
    );
    expect(withdrawRes.status).toBe(200);
    const withdrawJson = await withdrawRes.json();
    createdWithdrawIds.push(withdrawJson.withdrawId);

    const job = await prisma.job.findFirst({
      where: { type: 'PROCESS_WITHDRAW', payload: { string_contains: withdrawJson.withdrawId } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (job?.id) createdJobIds.push(job.id);

    let updated = await prisma.cryptoWithdraw.findUnique({ where: { id: withdrawJson.withdrawId } });
    for (let i = 0; i < 5 && updated?.status !== 'CONFIRMED'; i++) {
      const processRes = await processQueueGet(new Request('http://localhost/api/cron/process-queue', { method: 'GET' }));
      expect(processRes.status).toBe(200);
      await new Promise((r) => setTimeout(r, 30));
      updated = await prisma.cryptoWithdraw.findUnique({ where: { id: withdrawJson.withdrawId } });
    }

    const calledWithOurWithdraw = mockSendUsdtFromHotWallet.mock.calls.some(
      (c) => c?.[0] === '0x1234567890123456789012345678901234567890' && String(c?.[1]) === '10',
    );
    expect(calledWithOurWithdraw).toBe(true);

    expect(updated?.status).toBe('CONFIRMED');
    expect(updated?.txHash).toBe('0xabc123');
  });
});
