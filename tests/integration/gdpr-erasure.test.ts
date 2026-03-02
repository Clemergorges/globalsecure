import { prisma } from '../setup/prisma';

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  checkAdmin: jest.fn(),
}));

import { getSession } from '@/lib/auth';
import { POST as erasePOST } from '@/app/api/user/privacy/erase/route';

describe('GDPR: right to erasure (anonymization)', () => {
  const tag = `gdpr-erase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  async function seedUser() {
    const user = await prisma.user.create({
      data: {
        email: `${tag}-${Math.random().toString(36).slice(2, 6)}@globalsecure.test`,
        passwordHash: '$2a$10$test.hash',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: `+352${Math.floor(Math.random() * 1e9)}`,
        gdprConsent: true,
        gdprConsentAt: new Date(),
      }
    });
    await prisma.account.create({
      data: { userId: user.id, primaryCurrency: 'EUR', balances: { create: [{ currency: 'EUR', amount: 0 }] } }
    });
    await prisma.address.create({
      data: {
        userId: user.id,
        streetLine1: '1 Test St',
        postalCode: 'L-1234',
        city: 'Lux',
        country: 'LU',
      }
    });
    return user.id;
  }

  async function cleanupUser(userId: string) {
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.deletionJob.deleteMany({ where: { userId } });
    await prisma.amlReviewNote.deleteMany({ where: { amlCase: { userId } } });
    await prisma.amlReviewCase.deleteMany({ where: { userId } });
    await prisma.address.deleteMany({ where: { userId } });
    await prisma.accountTransaction.deleteMany({ where: { account: { userId } } });
    await prisma.balance.deleteMany({ where: { account: { userId } } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }

  test('happy path anonymizes user and completes job', async () => {
    const userId = await seedUser();
    (getSession as jest.Mock).mockResolvedValue({ userId, email: 'x', role: 'USER', isAdmin: false });

    const res = await erasePOST(new Request('http://localhost/api/user/privacy/erase', {
      method: 'POST',
      headers: { 'x-forwarded-for': '2.2.2.2', 'user-agent': 'jest' },
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(typeof json.jobId).toBe('string');

    const job = await prisma.deletionJob.findUnique({ where: { id: json.jobId } });
    expect(job?.status).toBe('COMPLETED');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.emailAnonymized).toBe(true);
    expect(user?.phoneAnonymized).toBe(true);
    expect(user?.deletedAt).toBeTruthy();
    expect(user?.anonymizedAt).toBeTruthy();
    expect(user?.email).toMatch(/@deleted\.invalid$/);
    expect(user?.phone).toBeNull();
    expect(user?.firstName).toBeNull();

    const addresses = await prisma.address.findMany({ where: { userId } });
    expect(addresses.length).toBe(0);

    const audit = await prisma.auditLog.findFirst({ where: { userId, action: 'GDPR_ERASE_COMPLETED' } });
    expect(audit).toBeTruthy();

    await cleanupUser(userId);
  });

  test('legal hold blocks erasure when AML HIGH case is open', async () => {
    const userId = await seedUser();
    await prisma.amlReviewCase.create({
      data: {
        userId,
        reason: 'TEST_HIGH_RISK',
        contextJson: { test: true },
        status: 'PENDING',
        riskLevel: 'HIGH',
      }
    });

    (getSession as jest.Mock).mockResolvedValue({ userId, email: 'x', role: 'USER', isAdmin: false });

    const res = await erasePOST(new Request('http://localhost/api/user/privacy/erase', {
      method: 'POST',
      headers: { 'x-forwarded-for': '2.2.2.2', 'user-agent': 'jest' },
    }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe('LEGAL_HOLD');

    const audit = await prisma.auditLog.findFirst({ where: { userId, action: 'GDPR_ERASE_BLOCKED' } });
    expect(audit).toBeTruthy();

    await cleanupUser(userId);
  });
});

