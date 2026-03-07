import { prisma } from '../setup/prisma';
import { UserRole, SensitiveActionType } from '@prisma/client';
import { hashPassword, comparePassword } from '@/lib/auth';
import { createSession } from '@/lib/session';
import { NextRequest } from 'next/server';

jest.mock('@/lib/services/email', () => ({
  sendEmail: jest.fn(async () => ({ ok: true })),
  templates: {
    sensitiveActionCode: (code: string) => `CODE:${code}`,
  },
}));

import { sendEmail } from '@/lib/services/email';
import { POST as otpRequestPost } from '@/app/api/auth/sensitive/otp/request/route';
import { POST as otpConfirmPost } from '@/app/api/auth/sensitive/otp/confirm/route';
import { POST as changePasswordPost } from '@/app/api/security/change-password/route';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function extractCodeFromMock() {
  const calls = (sendEmail as unknown as jest.Mock).mock.calls;
  const last = calls[calls.length - 1]?.[0];
  const html = String(last?.html || '');
  const m = html.match(/CODE:(\d{6})/);
  return m?.[1] || null;
}

describe('Block 3: Sensitive action OTP', () => {
  const password = 'Password123!';
  let user: { id: string; email: string };

  beforeAll(async () => {
    const email = `${uid('sotp')}@test.com`;
    user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password), emailVerified: true, role: UserRole.END_USER },
      select: { id: true, email: true },
    });
  });

  afterAll(async () => {
    await prisma.otpChallenge.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  test('request OTP creates DB record and sends email (mocked)', async () => {
    const { token } = await createSession({ id: user.id, role: UserRole.END_USER }, '127.0.0.1', 'jest-agent');
    const req = new NextRequest('http://localhost/api/auth/sensitive/otp/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `auth_token=${token}`, 'user-agent': 'jest-agent' },
      body: JSON.stringify({ actionType: SensitiveActionType.SENSITIVE_CHANGE_PASSWORD }),
    });

    const res = await otpRequestPost(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const latest = await prisma.otpChallenge.findFirst({
      where: { userId: user.id, purpose: 'PASSWORD_CHANGE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(latest).not.toBeNull();
    expect((sendEmail as unknown as jest.Mock).mock.calls.length).toBeGreaterThan(0);
  });

  test('confirm OTP for high value transfer marks OTP used and updates session lastScaAt', async () => {
    const { token, sessionId } = await createSession({ id: user.id, role: UserRole.END_USER }, '127.0.0.1', 'jest-agent');

    const req1 = new NextRequest('http://localhost/api/auth/sensitive/otp/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `auth_token=${token}`, 'user-agent': 'jest-agent' },
      body: JSON.stringify({ actionType: SensitiveActionType.SENSITIVE_HIGH_VALUE_TRANSFER }),
    });
    const r1 = await otpRequestPost(req1 as any);
    expect(r1.status).toBe(200);
    const code = extractCodeFromMock();
    expect(code).toBeTruthy();

    const req2 = new NextRequest('http://localhost/api/auth/sensitive/otp/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `auth_token=${token}`, 'user-agent': 'jest-agent' },
      body: JSON.stringify({ actionType: SensitiveActionType.SENSITIVE_HIGH_VALUE_TRANSFER, otpCode: code }),
    });
    const r2 = await otpConfirmPost(req2 as any);
    expect(r2.status).toBe(200);

    const dbSession = await prisma.session.findUnique({ where: { id: sessionId }, select: { lastScaAt: true } });
    expect(dbSession?.lastScaAt).toBeTruthy();

    const otp = await prisma.otpChallenge.findFirst({
      where: { userId: user.id, purpose: 'HIGH_VALUE_TRANSFER' },
      orderBy: { createdAt: 'desc' },
      select: { usedAt: true },
    });
    expect(otp?.usedAt).toBeTruthy();
  });

  test('change-password requires valid OTP and updates password', async () => {
    const { token } = await createSession({ id: user.id, role: UserRole.END_USER }, '127.0.0.1', 'jest-agent');

    const req1 = new NextRequest('http://localhost/api/auth/sensitive/otp/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `auth_token=${token}`, 'user-agent': 'jest-agent' },
      body: JSON.stringify({ actionType: SensitiveActionType.SENSITIVE_CHANGE_PASSWORD }),
    });
    await otpRequestPost(req1 as any);
    const code = extractCodeFromMock();
    expect(code).toBeTruthy();

    const newPassword = 'NewPassword123!';
    const req2 = new NextRequest('http://localhost/api/security/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `auth_token=${token}`, 'user-agent': 'jest-agent' },
      body: JSON.stringify({ currentPassword: password, newPassword, otpCode: code }),
    });
    const r2 = await changePasswordPost(req2 as any);
    expect(r2.status).toBe(200);
    const body2 = await r2.json();
    expect(body2.success).toBe(true);

    const updated = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    expect(updated).not.toBeNull();
    const ok = await comparePassword(newPassword, updated!.passwordHash);
    expect(ok).toBe(true);
  });

  test('wrong OTP does not change password', async () => {
    const { token } = await createSession({ id: user.id, role: UserRole.END_USER }, '127.0.0.1', 'jest-agent');

    const req1 = new NextRequest('http://localhost/api/auth/sensitive/otp/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `auth_token=${token}`, 'user-agent': 'jest-agent' },
      body: JSON.stringify({ actionType: SensitiveActionType.SENSITIVE_CHANGE_PASSWORD }),
    });
    await otpRequestPost(req1 as any);

    const before = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    const req2 = new NextRequest('http://localhost/api/security/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `auth_token=${token}`, 'user-agent': 'jest-agent' },
      body: JSON.stringify({ currentPassword: 'NewPassword123!', newPassword: 'OtherPassword123!', otpCode: '000000' }),
    });
    const r2 = await changePasswordPost(req2 as any);
    expect(r2.status).toBe(400);

    const after = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    expect(after?.passwordHash).toBe(before?.passwordHash);
  });

  test('expired OTP fails', async () => {
    const { token } = await createSession({ id: user.id, role: UserRole.END_USER }, '127.0.0.1', 'jest-agent');

    const req1 = new NextRequest('http://localhost/api/auth/sensitive/otp/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `auth_token=${token}`, 'user-agent': 'jest-agent' },
      body: JSON.stringify({ actionType: SensitiveActionType.SENSITIVE_CHANGE_PASSWORD }),
    });
    await otpRequestPost(req1 as any);
    const code = extractCodeFromMock();
    expect(code).toBeTruthy();

    await prisma.otpChallenge.updateMany({
      where: { userId: user.id, purpose: 'PASSWORD_CHANGE', usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const req2 = new NextRequest('http://localhost/api/security/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `auth_token=${token}`, 'user-agent': 'jest-agent' },
      body: JSON.stringify({ currentPassword: 'NewPassword123!', newPassword: 'OtherPassword123!', otpCode: code }),
    });
    const r2 = await changePasswordPost(req2 as any);
    expect(r2.status).toBe(400);
  });
});

