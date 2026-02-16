import { NextRequest } from 'next/server';

const mockPrisma: any = {
  claimLink: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  virtualCard: {
    update: jest.fn(),
  },
  $transaction: jest.fn(async (arg: any): Promise<any> => {
    if (typeof arg === 'function') return arg(mockPrisma as any);
    return Promise.all(arg);
  }),
};

const mockCheckRateLimit = jest.fn();
const mockLogAudit = jest.fn();
const mockGetCardData = jest.fn();

jest.mock('@/lib/db', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: (...args: any[]) => mockCheckRateLimit(...args) }));
jest.mock('@/lib/logger', () => ({
  logAudit: (...args: any[]) => mockLogAudit(...args),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/services/card', () => ({ getCardData: (...args: any[]) => mockGetCardData(...args) }));

import { GET as claimGET } from '@/app/api/claim/[token]/route';
import { POST as claimUnlockPOST } from '@/app/api/claim/[token]/unlock/route';

describe('Claim link unlock flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ success: true, limit: 3, remaining: 2, reset: Date.now() + 60_000 });
    mockGetCardData.mockResolvedValue({ pan: '4242 4242 4242 4242', cvv: '123', expMonth: 12, expYear: 2028 });
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma as any));
  });

  test('GET /api/claim/[token] valid returns public data', async () => {
    mockPrisma.claimLink.findUnique.mockResolvedValue({
      id: 'cl1',
      token: 't1',
      amount: 199,
      currency: 'EUR',
      message: 'hi',
      status: 'PENDING',
      claimedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      virtualCard: {
        id: 'vc1',
        last4: '4242',
        brand: 'visa',
        expMonth: 12,
        expYear: 2028,
        unlockedAt: null,
      }
    });

    const req = new NextRequest('http://localhost/api/claim/t1', { method: 'GET' });
    const res = await claimGET(req as any, { params: Promise.resolve({ token: 't1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.last4).toBe('4242');
  });

  test('GET /api/claim/[token] expired returns CLAIM_EXPIRED', async () => {
    mockPrisma.claimLink.findUnique.mockResolvedValue({
      id: 'cl1',
      token: 't1',
      amount: 199,
      currency: 'EUR',
      message: null,
      status: 'PENDING',
      claimedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      virtualCard: {
        id: 'vc1',
        last4: '4242',
        brand: 'visa',
        expMonth: 12,
        expYear: 2028,
        unlockedAt: null,
      }
    });

    const req = new NextRequest('http://localhost/api/claim/t1', { method: 'GET' });
    const res = await claimGET(req as any, { params: Promise.resolve({ token: 't1' }) });
    const json = await res.json();
    expect(res.status).toBe(410);
    expect(json.error).toBe('CLAIM_EXPIRED');
  });

  test('POST /api/claim/[token]/unlock correct code returns card data and marks claimed', async () => {
    const claimObj = {
      id: 'cl1',
      token: 't1',
      status: 'PENDING',
      claimedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(Date.now() - 5000),
      virtualCard: {
        id: 'vc1',
        unlockCode: 'a1b2c3',
        last4: '4242',
        brand: 'visa',
        unlockedAt: null,
      }
    };

    mockPrisma.claimLink.findUnique.mockResolvedValue(claimObj);
    mockPrisma.claimLink.update.mockResolvedValue({});
    mockPrisma.virtualCard.update.mockResolvedValue({});

    const req = new NextRequest('http://localhost/api/claim/t1/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4', 'x-forwarded-proto': 'https' },
      body: JSON.stringify({ unlockCode: 'A1B2C3' }),
    });

    const res = await claimUnlockPOST(req as any, { params: Promise.resolve({ token: 't1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.cardNumber).toMatch(/4242/);
    expect(mockPrisma.virtualCard.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.claimLink.update).toHaveBeenCalledTimes(1);
    expect(mockLogAudit).toHaveBeenCalled();
  });

  test('POST /api/claim/[token]/unlock wrong code returns attemptsRemaining', async () => {
    mockPrisma.claimLink.findUnique.mockResolvedValue({
      id: 'cl1',
      token: 't1',
      status: 'PENDING',
      claimedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      virtualCard: {
        id: 'vc1',
        unlockCode: 'a1b2c3',
        last4: '4242',
        brand: 'visa',
        unlockedAt: null,
      }
    });

    mockCheckRateLimit.mockResolvedValue({ success: true, limit: 3, remaining: 1, reset: Date.now() + 60_000 });

    const req = new NextRequest('http://localhost/api/claim/t1/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4', 'x-forwarded-proto': 'https' },
      body: JSON.stringify({ unlockCode: 'ZZZZZZ' }),
    });

    const res = await claimUnlockPOST(req as any, { params: Promise.resolve({ token: 't1' }) });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe('INVALID_UNLOCK_CODE');
    expect(json.attemptsRemaining).toBe(1);
  });

  test('POST /api/claim/[token]/unlock blocks after rate limit exceeded', async () => {
    mockPrisma.claimLink.findUnique.mockResolvedValue({
      id: 'cl1',
      token: 't1',
      status: 'PENDING',
      claimedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      virtualCard: {
        id: 'vc1',
        unlockCode: 'a1b2c3',
        last4: '4242',
        brand: 'visa',
        unlockedAt: null,
      }
    });

    mockCheckRateLimit.mockResolvedValue({ success: false, limit: 3, remaining: 0, reset: Date.now() + 60_000 });

    const req = new NextRequest('http://localhost/api/claim/t1/unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4', 'x-forwarded-proto': 'https' },
      body: JSON.stringify({ unlockCode: 'ZZZZZZ' }),
    });

    const res = await claimUnlockPOST(req as any, { params: Promise.resolve({ token: 't1' }) });
    const json = await res.json();
    expect(res.status).toBe(429);
    expect(json.error).toBe('TOO_MANY_ATTEMPTS');
  });
});
