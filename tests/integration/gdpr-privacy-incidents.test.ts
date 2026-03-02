import { prisma } from '../setup/prisma';

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  checkAdmin: jest.fn(),
}));

import { checkAdmin } from '@/lib/auth';
import { GET as incidentsGET, POST as incidentsPOST } from '@/app/api/admin/privacy/incidents/route';
import { POST as notifyPOST } from '@/app/api/admin/privacy/incidents/[id]/notify/route';

describe('GDPR: privacy incidents (admin)', () => {
  const tag = `gdpr-inc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let adminUserId = '';

  beforeAll(async () => {
    const adminUser = await prisma.user.create({
      data: { email: `${tag}@globalsecure.test`, passwordHash: '$2a$10$test.hash', gdprConsent: true, gdprConsentAt: new Date() }
    });
    adminUserId = adminUser.id;
    await prisma.account.create({
      data: { userId: adminUserId, primaryCurrency: 'EUR', balances: { create: [{ currency: 'EUR', amount: 0 }] } }
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { userId: adminUserId } });
    await prisma.privacyIncident.deleteMany({ where: { createdByUserId: adminUserId } });
    await prisma.accountTransaction.deleteMany({ where: { account: { userId: adminUserId } } });
    await prisma.balance.deleteMany({ where: { account: { userId: adminUserId } } });
    await prisma.account.deleteMany({ where: { userId: adminUserId } });
    await prisma.user.deleteMany({ where: { id: adminUserId } });
  });

  beforeEach(() => {
    (checkAdmin as jest.Mock).mockResolvedValue({ userId: adminUserId, email: `${tag}@globalsecure.test`, role: 'ADMIN', isAdmin: true });
  });

  test('creates, lists, and notifies a PrivacyIncident', async () => {
    const createRes = await incidentsPOST(new Request('http://localhost/api/admin/privacy/incidents', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '3.3.3.3', 'user-agent': 'jest' },
      body: JSON.stringify({ severity: 'HIGH', description: 'Test incident', affectedUserCount: 2 }),
    }));
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.incident).toEqual(expect.objectContaining({ severity: 'HIGH', status: 'OPEN' }));

    const listRes = await incidentsGET();
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(Array.isArray(listJson.incidents)).toBe(true);
    expect(listJson.incidents.some((i: any) => i.id === created.incident.id)).toBe(true);

    const notifyRes = await notifyPOST(new Request(`http://localhost/api/admin/privacy/incidents/${created.incident.id}/notify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notifyAuthority: true, notifyUsers: true }),
    }), { params: Promise.resolve({ id: created.incident.id }) });

    expect(notifyRes.status).toBe(200);
    const notifyJson = await notifyRes.json();
    expect(notifyJson.incident.supervisoryNotifiedAt).toBeTruthy();
    expect(notifyJson.incident.userNotifiedAt).toBeTruthy();

    const auditCreate = await prisma.auditLog.findFirst({ where: { userId: adminUserId, action: 'PRIVACY_INCIDENT_CREATE' } });
    const auditNotify = await prisma.auditLog.findFirst({ where: { userId: adminUserId, action: 'PRIVACY_INCIDENT_NOTIFY' } });
    expect(auditCreate).toBeTruthy();
    expect(auditNotify).toBeTruthy();
  });
});

