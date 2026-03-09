import { prisma } from '../setup/prisma';
import { POST as stripeIdentityPost } from '@/app/api/kyc/stripe-identity/route';

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

jest.mock('@/lib/services/partner-circuit-breaker', () => {
  class PartnerTemporarilyUnavailableError extends Error {
    code: string;
    constructor(code = 'PARTNER_TEMPORARILY_UNAVAILABLE') {
      super(code);
      this.code = code;
    }
  }
  return {
    callPartnerWithBreaker: jest.fn(async (_partner: string, _op: string, fn: () => any) => fn()),
    PartnerTemporarilyUnavailableError,
  };
});

const stripeCreateMock = jest.fn();
jest.mock('stripe', () => {
  const StripeMock = jest.fn().mockImplementation(() => ({
    identity: {
      verificationSessions: {
        create: stripeCreateMock,
      },
    },
  }));
  return { __esModule: true, default: StripeMock };
});

import { getSession } from '@/lib/auth';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('POST /api/kyc/stripe-identity usa user.country e valida suporte', () => {
  const createdUserIds: string[] = [];

  beforeEach(() => {
    stripeCreateMock.mockReset();
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.KYC_STRIPE_IDENTITY_ENABLED = 'true';
    process.env.STRIPE_IDENTITY_VERIFICATION_FLOW_BR = 'vf_br_test';
  });

  afterEach(async () => {
    await prisma.auditLog.deleteMany({ where: { action: 'KYC_STRIPE_IDENTITY_CREATE' } });
    if (createdUserIds.length) {
      await prisma.kYCDocument.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.account.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      createdUserIds.splice(0, createdUserIds.length);
    }
  });

  test('usa o país do usuário (user.country) ao criar VerificationSession', async () => {
    const email = `${uid('stripe_identity_country')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', country: 'BR' },
      select: { id: true },
    });
    createdUserIds.push(user.id);

    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id });
    stripeCreateMock.mockResolvedValue({
      id: 'vs_test_123',
      url: 'https://verify.stripe.test/vs_test_123',
      client_secret: 'vs_secret_test',
    });

    const req = new Request('http://localhost/api/kyc/stripe-identity', { method: 'POST' });
    const res = await stripeIdentityPost(req);
    expect(res.status).toBe(200);

    expect(stripeCreateMock).toHaveBeenCalledTimes(1);
    const args = stripeCreateMock.mock.calls[0]?.[0];
    expect(args?.metadata?.country).toBe('BR');
    expect(args?.verification_flow).toBe('vf_br_test');
  });

  test('não exige SSN para países não-US (require_id_number=false)', async () => {
    const email = `${uid('stripe_identity_requireid')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', country: 'LU' },
      select: { id: true },
    });
    createdUserIds.push(user.id);

    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id });
    stripeCreateMock.mockResolvedValue({
      id: 'vs_test_456',
      url: 'https://verify.stripe.test/vs_test_456',
      client_secret: 'vs_secret_test_456',
    });

    const req = new Request('http://localhost/api/kyc/stripe-identity', { method: 'POST' });
    const res = await stripeIdentityPost(req);
    expect(res.status).toBe(200);

    expect(stripeCreateMock).toHaveBeenCalledTimes(1);
    const args = stripeCreateMock.mock.calls[0]?.[0];
    expect(args?.metadata?.country).toBe('LU');
    expect(args?.options?.document?.require_id_number).toBe(false);
  });

  test('força return_url em localhost:3000 quando origin está em outra porta', async () => {
    const email = `${uid('stripe_identity_returnurl')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', country: 'LU' },
      select: { id: true },
    });
    createdUserIds.push(user.id);

    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id });
    stripeCreateMock.mockResolvedValue({
      id: 'vs_test_789',
      url: 'https://verify.stripe.test/vs_test_789',
      client_secret: 'vs_secret_test_789',
    });

    const req = new Request('http://localhost:3002/api/kyc/stripe-identity', {
      method: 'POST',
      headers: { origin: 'http://localhost:3002' },
    });
    const res = await stripeIdentityPost(req);
    expect(res.status).toBe(200);

    const args = stripeCreateMock.mock.calls[0]?.[0];
    expect(args?.return_url).toBe('http://localhost:3000/dashboard/settings/kyc');
  });

  test('bloqueia quando user.country está ausente', async () => {
    const email = `${uid('stripe_identity_nocountry')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', country: null },
      select: { id: true },
    });
    createdUserIds.push(user.id);

    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id });

    const req = new Request('http://localhost/api/kyc/stripe-identity', { method: 'POST' });
    const res = await stripeIdentityPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('KYC_COUNTRY_MISSING');
    expect(stripeCreateMock).not.toHaveBeenCalled();
  });

  test('bloqueia quando user.country não é suportado', async () => {
    const email = `${uid('stripe_identity_unsupported')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', country: 'ZZ' },
      select: { id: true },
    });
    createdUserIds.push(user.id);

    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id });

    const req = new Request('http://localhost/api/kyc/stripe-identity', { method: 'POST' });
    const res = await stripeIdentityPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('KYC_UNSUPPORTED_COUNTRY');
    expect(stripeCreateMock).not.toHaveBeenCalled();
  });

  test('retorna 502 e code quando Stripe responde erro de autenticação', async () => {
    const email = `${uid('stripe_identity_autherr')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', country: 'BR' },
      select: { id: true },
    });
    createdUserIds.push(user.id);

    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id });

    stripeCreateMock.mockRejectedValue({
      type: 'StripeAuthenticationError',
      message: 'Invalid API Key provided',
      statusCode: 401,
      requestId: 'req_test_123',
    });

    const req = new Request('http://localhost/api/kyc/stripe-identity', { method: 'POST' });
    const res = await stripeIdentityPost(req);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.code).toBe('STRIPE_AUTH_ERROR');
  });
});
