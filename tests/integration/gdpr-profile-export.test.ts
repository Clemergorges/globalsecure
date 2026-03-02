import { prisma } from '../setup/prisma';

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  checkAdmin: jest.fn(),
}));

import { getSession } from '@/lib/auth';
import { PATCH as profilePATCH } from '@/app/api/user/profile/route';
import { POST as exportPOST } from '@/app/api/user/privacy/export/route';
import { GET as exportGET } from '@/app/api/user/privacy/export/[id]/route';

describe('GDPR: profile update and data export bundle', () => {
  const tag = `gdpr-export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let userId = '';

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `${tag}@globalsecure.test`,
        passwordHash: '$2a$10$test.hash',
        gdprConsent: true,
        gdprConsentAt: new Date(),
      }
    });
    userId = user.id;
    await prisma.account.create({
      data: { userId, primaryCurrency: 'EUR', balances: { create: [{ currency: 'EUR', amount: 0 }] } }
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.dataExportJob.deleteMany({ where: { userId } });
    await prisma.accountTransaction.deleteMany({ where: { account: { userId } } });
    await prisma.balance.deleteMany({ where: { account: { userId } } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  beforeEach(() => {
    (getSession as jest.Mock).mockResolvedValue({ userId, email: `${tag}@globalsecure.test`, role: 'USER', isAdmin: false });
  });

  test('PATCH /api/user/profile updates fields and writes AuditLog', async () => {
    const res = await profilePATCH(new Request('http://localhost/api/user/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '4.4.4.4', 'user-agent': 'jest' },
      body: JSON.stringify({ firstName: 'Alice', lastName: 'Tester', city: 'Lux' }),
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user.firstName).toBe('Alice');
    expect(json.user.city).toBe('Lux');

    const audit = await prisma.auditLog.findFirst({ where: { userId, action: 'USER_PROFILE_UPDATED' } });
    expect(audit).toBeTruthy();
  });

  test('POST then GET GDPR export returns JSON bundle', async () => {
    const createRes = await exportPOST(new Request('http://localhost/api/user/privacy/export', {
      method: 'POST',
      headers: { 'x-forwarded-for': '4.4.4.4', 'user-agent': 'jest' },
    }));

    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(typeof created.jobId).toBe('string');

    const getRes = await exportGET(new Request(`http://localhost/api/user/privacy/export/${created.jobId}`), {
      params: Promise.resolve({ id: created.jobId })
    });

    expect(getRes.status).toBe(200);
    const bundle = await getRes.json();
    expect(bundle.meta.jobId).toBe(created.jobId);
    expect(bundle.profile.user.id).toBe(userId);
    expect(bundle.profile.user.passwordHash).toBeUndefined();
    expect(bundle.consents.flags.gdprConsent).toBe(true);
    expect(Array.isArray(bundle.transactions)).toBe(true);

    const auditReq = await prisma.auditLog.findFirst({ where: { userId, action: 'GDPR_EXPORT_REQUEST' } });
    const auditDl = await prisma.auditLog.findFirst({ where: { userId, action: 'GDPR_EXPORT_DOWNLOAD' } });
    expect(auditReq).toBeTruthy();
    expect(auditDl).toBeTruthy();
  });
});

