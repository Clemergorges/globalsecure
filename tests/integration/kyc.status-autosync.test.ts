import { prisma } from '../setup/prisma';
import { GET as statusGet } from '@/app/api/kyc/status/route';

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

var stripeRetrieveMock = jest.fn();
jest.mock('@/lib/services/stripe', () => ({
  getStripe: () => ({
    identity: {
      verificationSessions: {
        retrieve: stripeRetrieveMock,
      },
    },
  }),
}));

import { getSession } from '@/lib/auth';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('GET /api/kyc/status auto-sync Stripe Identity', () => {
  const createdUserIds: string[] = [];
  const retrieveMock = () => stripeRetrieveMock;

  afterEach(async () => {
    retrieveMock().mockReset();
    await prisma.kYCDocument.deleteMany({});
    if (createdUserIds.length) {
      await prisma.account.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      createdUserIds.splice(0, createdUserIds.length);
    }
  });

  test('retorna status atual sem sessão', async () => {
    (getSession as unknown as jest.Mock).mockResolvedValue(null);
    const req = new Request('http://localhost/api/kyc/status', { method: 'GET' });
    const res = await statusGet(req);
    expect(res.status).toBe(401);
  });

  test('atualiza para APPROVED quando Stripe retorna verified', async () => {
    const email = `${uid('kyc_status_autosync')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', country: 'LU', kycStatus: 'PENDING', kycLevel: 0 },
      select: { id: true },
    });
    createdUserIds.push(user.id);

    await prisma.kYCDocument.create({
      data: {
        userId: user.id,
        documentType: 'STRIPE_IDENTITY',
        documentNumber: 'PENDING',
        issuingCountry: 'UNKNOWN',
        stripeVerificationId: 'vs_test_status_1',
        status: 'PENDING',
      },
    });

    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id });
    retrieveMock().mockResolvedValue({
      id: 'vs_test_status_1',
      status: 'verified',
      verified_outputs: {
        address: { country: 'LU' },
        id_number: 'A1B2C3',
        id_number_type: 'lu_id_card',
      },
    });

    const req = new Request('http://localhost/api/kyc/status', { method: 'GET' });
    const res = await statusGet(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('APPROVED');
    expect(body.level).toBe(2);

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id }, select: { kycStatus: true, kycLevel: true } });
    expect(updatedUser?.kycStatus).toBe('APPROVED');
    expect(updatedUser?.kycLevel).toBe(2);
  });
});

