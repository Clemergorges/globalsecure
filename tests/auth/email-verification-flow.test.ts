import { NextRequest } from 'next/server';

const mockTx = {
  user: {
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  account: {
    delete: jest.fn(),
    deleteMany: jest.fn(),
    update: jest.fn(),
  },
  balance: {
    deleteMany: jest.fn(),
  },
  accountTransaction: {
    deleteMany: jest.fn(),
  },
  oTP: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    delete: jest.fn(),
  },
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  account: {
    delete: jest.fn(),
    deleteMany: jest.fn(),
    update: jest.fn(),
  },
  balance: {
    deleteMany: jest.fn(),
  },
  accountTransaction: {
    deleteMany: jest.fn(),
  },
  oTP: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(async (arg: any) => {
    if (typeof arg === 'function') return arg(mockTx as any);
    return Promise.all(arg);
  }),
};

const mockCheckRateLimit = jest.fn();
const mockSendEmail = jest.fn();
const mockHashPassword = jest.fn();
const mockComparePassword = jest.fn();
const mockLogAudit = jest.fn();
const mockGetCurrencyForCountry = jest.fn();

jest.mock('@/lib/db', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: (...args: any[]) => mockCheckRateLimit(...args) }));
jest.mock('@/lib/services/email', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
  templates: { verificationCode: (code: string) => `<div>${code}</div>` },
}));
jest.mock('@/lib/auth', () => ({
  hashPassword: (...args: any[]) => mockHashPassword(...args),
  comparePassword: (...args: any[]) => mockComparePassword(...args),
  extractUserId: jest.fn(async () => undefined),
}));
jest.mock('@/lib/logger', () => ({
  logAudit: (...args: any[]) => mockLogAudit(...args),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/country-config', () => ({ getCurrencyForCountry: (...args: any[]) => mockGetCurrencyForCountry(...args) }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
jest.mock('@/lib/redis', () => ({
  redis: {
    multi: () => {
      const chain = {
        zRemRangeByScore: () => chain,
        zAdd: () => chain,
        zCard: () => chain,
        expire: () => chain,
        exec: async () => [0, 0, 1, 0],
      };
      return chain;
    }
  }
}));

import { POST as registerPOST } from '@/app/api/auth/register/route';
import { POST as verifyPOST } from '@/app/api/auth/verify-email/route';
import { POST as resendPOST } from '@/app/api/auth/resend-verification/route';
import { POST as loginPOST } from '@/app/api/auth/login-secure/route';

describe('Auth: Email verification flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test_secret_key_min_32_chars_long_for_testing';
    mockCheckRateLimit.mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: Date.now() + 60000 });
    mockHashPassword.mockResolvedValue('hashed');
    mockComparePassword.mockResolvedValue(true);
    mockGetCurrencyForCountry.mockReturnValue('EUR');
    mockSendEmail.mockResolvedValue({ ok: true, messageId: 'm1' });
    mockPrisma.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') return arg(mockTx as any);
      return Promise.all(arg);
    });
  });

  test('register: success creates user+otp and returns 201', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    mockTx.user.create.mockResolvedValue({
      id: 'u1',
      email: 'user@test.com',
      account: { status: 'UNVERIFIED' },
    });
    mockTx.oTP.create.mockResolvedValue({ id: 'otp1' });

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({ email: 'User@Test.com', password: 'Password1', country: 'BR', gdprConsent: true, marketingConsent: false }),
    });

    const res = await registerPOST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.email).toBe('user@test.com');
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  test('register: existing email returns 409', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@test.com', password: 'Password1', country: 'BR', gdprConsent: true }),
    });

    const res = await registerPOST(req);
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json.error).toMatch(/Email já cadastrado/i);
  });

  test('register: email send failure rolls back user and returns 503', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    mockTx.user.create.mockResolvedValue({
      id: 'u1',
      email: 'user@test.com',
      account: { id: 'a1', status: 'UNVERIFIED' },
    });
    mockTx.oTP.create.mockResolvedValue({ id: 'otp1' });

    mockSendEmail.mockResolvedValue({ ok: false, error: 'SMTP_SEND_FAILED' });

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@test.com', password: 'Password1', country: 'BR', gdprConsent: true }),
    });

    const res = await registerPOST(req);
    const json = await res.json();
    expect(res.status).toBe(503);
    expect(json.error).toMatch(/Falha ao enviar/i);
    expect(mockTx.oTP.deleteMany).toHaveBeenCalledTimes(1);
    expect(mockTx.balance.deleteMany).toHaveBeenCalledTimes(1);
    expect(mockTx.account.deleteMany).toHaveBeenCalledTimes(1);
    expect(mockTx.user.delete).toHaveBeenCalledTimes(1);

    const accountDeleteOrder = mockTx.account.deleteMany.mock.invocationCallOrder[0];
    const userDeleteOrder = mockTx.user.delete.mock.invocationCallOrder[0];
    expect(accountDeleteOrder).toBeLessThan(userDeleteOrder);
  });

  test('verify-email: correct code marks emailVerified and updates account', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@test.com',
      emailVerified: false,
      account: { userId: 'u1', status: 'UNVERIFIED' }
    });

    mockPrisma.oTP.findFirst.mockResolvedValue({
      id: 'otp1',
      userId: 'u1',
      type: 'EMAIL',
      code: '123456',
      used: false,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      createdAt: new Date(),
    });

    const req = new Request('http://localhost/api/auth/verify-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'USER@test.com', code: '123456' }),
    });

    const res = await verifyPOST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockTx.user.update).toHaveBeenCalledTimes(1);
    expect(mockTx.account.update).toHaveBeenCalledTimes(1);
    expect(mockTx.oTP.update).toHaveBeenCalledTimes(1);
  });

  test('verify-email: expired code returns OTP_EXPIRED', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@test.com',
      emailVerified: false,
      account: { userId: 'u1', status: 'UNVERIFIED' }
    });

    mockPrisma.oTP.findFirst.mockResolvedValue({
      id: 'otp1',
      userId: 'u1',
      type: 'EMAIL',
      code: '123456',
      used: false,
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
    });

    const req = new Request('http://localhost/api/auth/verify-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@test.com', code: '123456' }),
    });

    const res = await verifyPOST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe('OTP_EXPIRED');
  });

  test('resend-verification: when user not found returns generic success', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'missing@test.com' }),
    });

    const res = await resendPOST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  test('login-secure: blocks login when email not verified', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@test.com',
      emailVerified: false,
      passwordHash: 'hashed',
      account: { status: 'UNVERIFIED' }
    });

    const req = new NextRequest('http://localhost/api/auth/login-secure', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', password: 'Password1' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await loginPOST(req as any);
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.code).toBe('EMAIL_NOT_VERIFIED');
  });

  test('login-secure: allows login when email verified and sets auth_token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@test.com',
      emailVerified: true,
      passwordHash: 'hashed',
      account: { status: 'ACTIVE' }
    });

    const req = new NextRequest('http://localhost/api/auth/login-secure', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', password: 'Password1' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await loginPOST(req as any);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toMatch(/auth_token=/);
  });
});
