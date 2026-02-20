import { Prisma } from '@prisma/client';
import { prisma } from '../setup/prisma';

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import { getSession } from '@/lib/auth';
import { POST as transfersCreatePost } from '@/app/api/transfers/create/route';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('Risk gates', () => {
  test('blocks transfers when user has pending HIGH/CRITICAL AML case', async () => {
    const email = `${uid('test_riskgate')}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true,
        account: { create: { primaryCurrency: 'EUR' } },
      },
      select: { id: true },
    });

    await prisma.amlReviewCase.create({
      data: {
        userId: user.id,
        reason: 'SANCTIONED_COUNTRY',
        contextJson: { country: 'RU' },
        status: 'PENDING',
        riskLevel: 'CRITICAL',
        riskScore: 100,
        slaDueAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id, email, role: 'USER', isAdmin: false });

    const res = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'SELF_TRANSFER',
          amountSource: 10,
          currencySource: 'EUR',
          currencyTarget: 'USD',
        }),
      }),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('AML_REVIEW_PENDING');

    await prisma.amlReviewCase.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});

