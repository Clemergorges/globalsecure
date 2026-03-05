import { NextRequest } from 'next/server';

jest.mock('@/lib/session', () => ({
  validateSession: jest.fn(async () => ({
    sessionId: 'sess_test',
    userId: 'user_test',
    role: 'END_USER',
    email: 'user@test.com',
  })),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/sms', () => ({
  smsService: {
    sendOTP: jest.fn(async () => true),
  },
}));

jest.mock('@/lib/security/otp/OtpChallengeService', () => ({
  OtpChallengeService: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logAudit: jest.fn(async () => {}),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { prisma } from '@/lib/db';
import { smsService } from '@/lib/services/sms';
import { OtpChallengeService } from '@/lib/security/otp/OtpChallengeService';
import { POST as enablePost } from '@/app/api/security/2fa/enable/route';
import { POST as verifyPost } from '@/app/api/security/2fa/verify/route';

describe('2FA routes (no KYC dependency + hardened errors)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('enable: allows user with KYC pending to request OTP', async () => {
    (prisma.user.findUnique as unknown as jest.Mock).mockResolvedValue({
      id: 'user_test',
      phone: '+15550001111',
      phoneVerified: false,
      kycStatus: 'PENDING',
    });

    const create = jest.fn(async () => ({
      code: '123456',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      ttlSeconds: 600,
    }));
    (OtpChallengeService as unknown as jest.Mock).mockImplementation(() => ({ create }));

    const req = new NextRequest('http://localhost/api/security/2fa/enable', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'auth_token=token', 'user-agent': 'jest-agent' },
      body: JSON.stringify({}),
    });

    const res = await enablePost(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.ttlSeconds).toBe(600);
    expect((smsService.sendOTP as unknown as jest.Mock).mock.calls.length).toBe(1);
    expect((smsService.sendOTP as unknown as jest.Mock).mock.calls[0][0]).toBe('+15550001111');
    expect((smsService.sendOTP as unknown as jest.Mock).mock.calls[0][1]).toBe('123456');
  });

  test('enable: allows user with KYC approved to request OTP', async () => {
    (prisma.user.findUnique as unknown as jest.Mock).mockResolvedValue({
      id: 'user_test',
      phone: '+15550001111',
      phoneVerified: true,
      kycStatus: 'APPROVED',
    });

    const create = jest.fn(async () => ({
      code: '123456',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      ttlSeconds: 600,
    }));
    (OtpChallengeService as unknown as jest.Mock).mockImplementation(() => ({ create }));

    const req = new NextRequest('http://localhost/api/security/2fa/enable', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'auth_token=token', 'user-agent': 'jest-agent' },
      body: JSON.stringify({}),
    });

    const res = await enablePost(req as any);
    expect(res.status).toBe(200);
    expect((smsService.sendOTP as unknown as jest.Mock).mock.calls.length).toBe(1);
  });

  test('enable: returns controlled business error when phone missing', async () => {
    (prisma.user.findUnique as unknown as jest.Mock).mockResolvedValue({
      id: 'user_test',
      phone: null,
      phoneVerified: false,
      kycStatus: 'PENDING',
    });

    const req = new NextRequest('http://localhost/api/security/2fa/enable', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'auth_token=token', 'user-agent': 'jest-agent' },
      body: JSON.stringify({}),
    });

    const res = await enablePost(req as any);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('PHONE_REQUIRED');
  });

  test('enable: unexpected internal error returns 500 without details', async () => {
    (prisma.user.findUnique as unknown as jest.Mock).mockRejectedValueOnce(new Error('db down'));

    const req = new NextRequest('http://localhost/api/security/2fa/enable', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'auth_token=token', 'user-agent': 'jest-agent' },
      body: JSON.stringify({}),
    });

    const res = await enablePost(req as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Internal server error' });
  });

  test('verify: consumes OTP and enables 2FA (phoneVerified=true) even if KYC pending', async () => {
    (prisma.user.findUnique as unknown as jest.Mock).mockResolvedValue({
      id: 'user_test',
      kycStatus: 'PENDING',
    });

    const consume = jest.fn(async () => ({ ok: true as const }));
    (OtpChallengeService as unknown as jest.Mock).mockImplementation(() => ({ consume }));
    (prisma.user.update as unknown as jest.Mock).mockResolvedValue({ id: 'user_test' });

    const req = new NextRequest('http://localhost/api/security/2fa/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'auth_token=token', 'user-agent': 'jest-agent' },
      body: JSON.stringify({ code: '123456' }),
    });

    const res = await verifyPost(req as any);
    expect(res.status).toBe(200);
    expect((prisma.user.update as unknown as jest.Mock).mock.calls.length).toBe(1);
    expect((prisma.user.update as unknown as jest.Mock).mock.calls[0][0]).toEqual({
      where: { id: 'user_test' },
      data: { phoneVerified: true },
    });
  });

  test('verify: invalid OTP returns 400 with controlled reason', async () => {
    (prisma.user.findUnique as unknown as jest.Mock).mockResolvedValue({
      id: 'user_test',
      kycStatus: 'PENDING',
    });

    const consume = jest.fn(async () => ({ ok: false as const, reason: 'INVALID' as const }));
    (OtpChallengeService as unknown as jest.Mock).mockImplementation(() => ({ consume }));

    const req = new NextRequest('http://localhost/api/security/2fa/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'auth_token=token', 'user-agent': 'jest-agent' },
      body: JSON.stringify({ code: '123456' }),
    });

    const res = await verifyPost(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid or expired code');
    expect(body.code).toBe('INVALID');
  });

  test('verify: unexpected internal error returns 500 without details', async () => {
    (prisma.user.findUnique as unknown as jest.Mock).mockRejectedValueOnce(new Error('db down'));

    const req = new NextRequest('http://localhost/api/security/2fa/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'auth_token=token', 'user-agent': 'jest-agent' },
      body: JSON.stringify({ code: '123456' }),
    });

    const res = await verifyPost(req as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Internal server error' });
  });
});

