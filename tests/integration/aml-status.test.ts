import { prisma } from '../setup/prisma';

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import { getSession } from '@/lib/auth';
import { GET as amlStatusGet } from '@/app/api/aml/status/route';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('AML status endpoint', () => {
  test('VERIFIED quando aprovado e sem casos', async () => {
    const email = `${uid('aml_ok')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', kycStatus: 'APPROVED', riskTier: 'LOW' },
      select: { id: true },
    });
    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id, email, role: 'USER', isAdmin: false });

    const r = await amlStatusGet();
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.status).toBe('VERIFIED');
    expect(b.has_open_case).toBe(false);
    expect(typeof b.last_update).toBe('string');
    expect(Object.keys(b).sort()).toEqual(['has_open_case', 'last_update', 'status']);

    await prisma.user.delete({ where: { id: user.id } });
  });

  test('REVIEW quando existe caso aberto', async () => {
    const email = `${uid('aml_review')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', kycStatus: 'APPROVED', riskTier: 'LOW' },
      select: { id: true },
    });
    await prisma.amlReviewCase.create({
      data: { userId: user.id, reason: 'TEST', contextJson: {}, status: 'PENDING', riskLevel: 'MEDIUM', riskScore: 10 },
      select: { id: true },
    });

    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id, email, role: 'USER', isAdmin: false });
    const r = await amlStatusGet();
    const b = await r.json();
    expect(b.status).toBe('REVIEW');
    expect(b.has_open_case).toBe(true);

    await prisma.amlReviewCase.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('ACTION_REQUIRED quando risco HIGH e sem caso aberto', async () => {
    const email = `${uid('aml_action')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', kycStatus: 'APPROVED', riskTier: 'HIGH' },
      select: { id: true },
    });
    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id, email, role: 'USER', isAdmin: false });

    const r = await amlStatusGet();
    const b = await r.json();
    expect(b.status).toBe('ACTION_REQUIRED');
    expect(b.has_open_case).toBe(false);

    await prisma.user.delete({ where: { id: user.id } });
  });

  test('BLOCKED quando existe caso bloqueado', async () => {
    const email = `${uid('aml_blocked')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', kycStatus: 'APPROVED', riskTier: 'LOW' },
      select: { id: true },
    });
    await prisma.amlReviewCase.create({
      data: { userId: user.id, reason: 'TEST', contextJson: {}, status: 'BLOCKED', riskLevel: 'CRITICAL', riskScore: 99 },
      select: { id: true },
    });

    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id, email, role: 'USER', isAdmin: false });
    const r = await amlStatusGet();
    const b = await r.json();
    expect(b.status).toBe('BLOCKED');

    await prisma.amlReviewCase.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});

