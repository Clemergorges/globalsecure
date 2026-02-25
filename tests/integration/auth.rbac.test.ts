import { prisma } from '../setup/prisma';
import { UserRole } from '@prisma/client';
import { hashPassword } from '@/lib/auth';
import { createSession } from '@/lib/session';
import { NextRequest } from 'next/server';

jest.mock('@/lib/services/polygon', () => ({
  deriveUserAddress: jest.fn(async (userId: string) => `0x${userId.replaceAll('-', '').slice(0, 40)}`),
  getUserBalanceUsdt: jest.fn(async () => '10.0'),
  getUsdtPriceUsd: jest.fn(async () => 1.0),
}));

jest.mock('@/lib/services/fiat-ledger', () => ({
  applyFiatMovement: jest.fn(async () => {}),
}));

jest.mock('@/lib/notifications', () => ({
  createNotification: jest.fn(async () => {}),
}));

import { GET as balanceUsdtGet } from '@/app/api/wallet/[userId]/balance-usdt/route';
import { GET as amlQueueGet } from '@/app/api/admin/aml/review-queue/route';
import { POST as topupPost } from '@/app/api/admin/wallet/topup/route';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('Block 2: RBAC enforcement', () => {
  const password = 'Password123!';
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let compliance: { id: string; email: string };
  let treasury: { id: string; email: string };

  beforeAll(async () => {
    const uA = `${uid('userA')}@test.com`;
    const uB = `${uid('userB')}@test.com`;
    const uC = `${uid('compliance')}@test.com`;
    const uT = `${uid('treasury')}@test.com`;

    userA = await prisma.user.create({
      data: { email: uA, passwordHash: await hashPassword(password), emailVerified: true, role: UserRole.END_USER },
      select: { id: true, email: true },
    });
    userB = await prisma.user.create({
      data: { email: uB, passwordHash: await hashPassword(password), emailVerified: true, role: UserRole.END_USER },
      select: { id: true, email: true },
    });
    compliance = await prisma.user.create({
      data: { email: uC, passwordHash: await hashPassword(password), emailVerified: true, role: UserRole.COMPLIANCE },
      select: { id: true, email: true },
    });
    treasury = await prisma.user.create({
      data: { email: uT, passwordHash: await hashPassword(password), emailVerified: true, role: UserRole.TREASURY },
      select: { id: true, email: true },
    });

    await prisma.account.create({
      data: { userId: userA.id, primaryCurrency: 'EUR' },
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { userId: { in: [compliance.id, treasury.id] } } });
    await prisma.amlReviewNote.deleteMany({ where: { authorId: compliance.id } });
    await prisma.amlReviewCase.deleteMany({ where: { userId: userA.id } });
    await prisma.session.deleteMany({ where: { userId: { in: [userA.id, userB.id, compliance.id, treasury.id] } } });
    await prisma.accountTransaction.deleteMany({ where: { account: { userId: userA.id } } });
    await prisma.account.deleteMany({ where: { userId: userA.id } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id, compliance.id, treasury.id] } } });
  });

  test('END_USER cannot access another user resource (balance-usdt)', async () => {
    const { token } = await createSession({ id: userA.id, role: UserRole.END_USER }, '127.0.0.1', 'jest-agent');

    const req = new NextRequest('http://localhost/api/wallet/x/balance-usdt', {
      headers: {
        cookie: `auth_token=${token}`,
        'user-agent': 'jest-agent',
      },
    });

    const res = await balanceUsdtGet(req as any, { params: Promise.resolve({ userId: userB.id }) } as any);
    expect(res.status).toBe(403);
  });

  test('COMPLIANCE can access another user resource (balance-usdt)', async () => {
    const { token } = await createSession({ id: compliance.id, role: UserRole.COMPLIANCE }, '127.0.0.1', 'jest-agent');

    const req = new NextRequest('http://localhost/api/wallet/x/balance-usdt', {
      headers: {
        cookie: `auth_token=${token}`,
        'user-agent': 'jest-agent',
      },
    });

    const res = await balanceUsdtGet(req as any, { params: Promise.resolve({ userId: userB.id }) } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe(userB.id);
    expect(body.balanceUsdt).toBe('10.0');
  });

  test('END_USER cannot access AML review queue', async () => {
    const created = await prisma.amlReviewCase.create({
      data: {
        userId: userA.id,
        reason: 'VELOCITY',
        contextJson: { amountUsd: 10 },
        status: 'PENDING',
        riskLevel: 'HIGH',
        riskScore: 80,
        slaDueAt: new Date(Date.now() + 60 * 60 * 1000),
      },
      select: { id: true },
    });

    const { token } = await createSession({ id: userA.id, role: UserRole.END_USER }, '127.0.0.1', 'jest-agent');
    const req = new NextRequest('http://localhost/api/admin/aml/review-queue?status=PENDING&take=50', {
      headers: {
        cookie: `auth_token=${token}`,
        'user-agent': 'jest-agent',
      },
    });

    const res = await amlQueueGet(req as any);
    expect(res.status).toBe(403);

    await prisma.amlReviewCase.delete({ where: { id: created.id } });
  });

  test('COMPLIANCE can list AML review queue', async () => {
    const created = await prisma.amlReviewCase.create({
      data: {
        userId: userA.id,
        reason: 'VELOCITY',
        contextJson: { amountUsd: 10 },
        status: 'PENDING',
        riskLevel: 'HIGH',
        riskScore: 80,
        slaDueAt: new Date(Date.now() + 60 * 60 * 1000),
      },
      select: { id: true },
    });

    const { token } = await createSession({ id: compliance.id, role: UserRole.COMPLIANCE }, '127.0.0.1', 'jest-agent');
    const req = new NextRequest('http://localhost/api/admin/aml/review-queue?status=PENDING&take=50', {
      headers: {
        cookie: `auth_token=${token}`,
        'user-agent': 'jest-agent',
      },
    });

    const res = await amlQueueGet(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cases.some((c: any) => c.id === created.id)).toBe(true);

    await prisma.amlReviewCase.delete({ where: { id: created.id } });
  });

  test('END_USER cannot call treasury/admin topup', async () => {
    const { token } = await createSession({ id: userA.id, role: UserRole.END_USER }, '127.0.0.1', 'jest-agent');
    const req = new NextRequest('http://localhost/api/admin/wallet/topup', {
      method: 'POST',
      headers: {
        cookie: `auth_token=${token}`,
        'user-agent': 'jest-agent',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ userId: userA.id, amount: 10, currency: 'EUR' }),
    });

    const res = await topupPost(req as any);
    expect(res.status).toBe(403);
  });

  test('TREASURY can call treasury/admin topup', async () => {
    const { token } = await createSession({ id: treasury.id, role: UserRole.TREASURY }, '127.0.0.1', 'jest-agent');
    const req = new NextRequest('http://localhost/api/admin/wallet/topup', {
      method: 'POST',
      headers: {
        cookie: `auth_token=${token}`,
        'user-agent': 'jest-agent',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ userId: userA.id, amount: 10, currency: 'EUR' }),
    });

    const res = await topupPost(req as any);
    expect([200, 404]).toContain(res.status);
  });
});
