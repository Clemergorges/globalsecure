import { prisma } from '../setup/prisma';
import { POST as syncPost } from '@/app/api/kyc/stripe-identity/sync/route';

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

jest.mock('@/lib/services/stripe', () => ({
  stripe: {
    identity: {
      verificationSessions: {
        retrieve: jest.fn(),
      },
    },
  },
}));

import { getSession } from '@/lib/auth';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('POST /api/kyc/stripe-identity/sync', () => {
  const createdUserIds: string[] = [];
  const retrieveMock = () =>
    (require('@/lib/services/stripe').stripe.identity.verificationSessions.retrieve as jest.Mock);

  afterEach(async () => {
    retrieveMock().mockReset();
    await prisma.kYCDocument.deleteMany({});
    if (createdUserIds.length) {
      await prisma.account.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      createdUserIds.splice(0, createdUserIds.length);
    }
  });

  test('retorna 401 sem sessão', async () => {
    (getSession as unknown as jest.Mock).mockResolvedValue(null);
    const req = new Request('http://localhost/api/kyc/stripe-identity/sync', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'vs_test_123' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await syncPost(req);
    expect(res.status).toBe(401);
  });

  test('atualiza KYCDocument e User para APPROVED quando Stripe status=verified', async () => {
    const email = `${uid('stripe_identity_sync')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', country: 'LU' },
      select: { id: true },
    });
    createdUserIds.push(user.id);

    const doc = await prisma.kYCDocument.create({
      data: {
        userId: user.id,
        documentType: 'STRIPE_IDENTITY',
        documentNumber: 'PENDING',
        issuingCountry: 'UNKNOWN',
        stripeVerificationId: 'vs_test_999',
        status: 'PENDING',
      },
      select: { id: true },
    });

    ;(getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id });
    retrieveMock().mockResolvedValue({
      id: 'vs_test_999',
      status: 'verified',
      verified_outputs: {
        address: { country: 'LU' },
        id_number: 'A1B2C3',
        id_number_type: 'lu_id_card',
      },
      last_error: null,
    });

    const req = new Request('http://localhost/api/kyc/stripe-identity/sync', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'vs_test_999' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await syncPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('APPROVED');
    expect(retrieveMock()).toHaveBeenCalledTimes(1);

    const updatedDoc = await prisma.kYCDocument.findUnique({ where: { id: doc.id } });
    expect(updatedDoc?.status).toBe('APPROVED');
    expect(updatedDoc?.verifiedAt).not.toBeNull();

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser?.kycStatus).toBe('APPROVED');
    expect(updatedUser?.kycLevel).toBe(2);
  });
});
