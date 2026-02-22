import { prisma } from '../setup/prisma';

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  checkAdmin: jest.fn(),
}));

import { getSession } from '@/lib/auth';
import { GET as consentsGET, PUT as consentsPUT } from '@/app/api/user/privacy/consents/route';

describe('GDPR: consent preferences', () => {
  const tag = `gdpr-consents-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let userId = '';

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `${tag}@globalsecure.test`,
        passwordHash: '$2a$10$test.hash',
        gdprConsent: true,
        gdprConsentAt: new Date(),
        marketingConsent: false,
        cookieConsent: false,
      }
    });
    userId = user.id;
    await prisma.account.create({
      data: {
        userId,
        primaryCurrency: 'EUR',
        balances: { create: [{ currency: 'EUR', amount: 0 }] },
      }
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.userConsentRecord.deleteMany({ where: { userId } });
    await prisma.accountTransaction.deleteMany({ where: { account: { userId } } });
    await prisma.balance.deleteMany({ where: { account: { userId } } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  beforeEach(() => {
    (getSession as jest.Mock).mockResolvedValue({ userId, email: `${tag}@globalsecure.test`, role: 'USER', isAdmin: false });
  });

  test('GET returns current preferences and consent document', async () => {
    const res = await consentsGET(new Request('http://localhost/api/user/privacy/consents'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.preferences).toEqual({ gdprConsent: true, marketingConsent: false, cookieConsent: false });
    expect(json.currentDocument).toEqual(expect.objectContaining({ version: expect.any(String), locale: expect.any(String) }));
  });

  test('PUT updates preferences and creates audit + consent records', async () => {
    const res = await consentsPUT(new Request('http://localhost/api/user/privacy/consents', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.1.1.1', 'user-agent': 'jest' },
      body: JSON.stringify({ marketingConsent: true, cookieConsent: true }),
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const refreshed = await prisma.user.findUnique({ where: { id: userId }, select: { marketingConsent: true, cookieConsent: true } });
    expect(refreshed).toEqual({ marketingConsent: true, cookieConsent: true });

    const records = await prisma.userConsentRecord.findMany({ where: { userId } });
    expect(records.some(r => r.consentType === 'MARKETING')).toBe(true);
    expect(records.some(r => r.consentType === 'COOKIES')).toBe(true);

    const audit = await prisma.auditLog.findFirst({ where: { userId, action: 'GDPR_CONSENT_UPDATE' }, orderBy: { createdAt: 'desc' } });
    expect(audit).toBeTruthy();
  });
});

