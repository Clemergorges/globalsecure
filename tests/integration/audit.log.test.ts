import { prisma } from '../setup/prisma';
import { UserRole, SensitiveActionType } from '@prisma/client';
import { hashPassword } from '@/lib/auth';
import { createSession } from '@/lib/session';
import { NextRequest } from 'next/server';

jest.mock('@/lib/services/email', () => ({
  sendEmail: jest.fn(async () => ({ ok: true })),
  templates: {
    sensitiveActionCode: (code: string) => `CODE:${code}`,
  },
}));

jest.mock('@/lib/services/fiat-ledger', () => ({
  applyFiatMovement: jest.fn(async () => {}),
}));

jest.mock('@/lib/notifications', () => ({
  createNotification: jest.fn(async () => {}),
}));

import { sendEmail } from '@/lib/services/email';
import { POST as loginPost } from '@/app/api/auth/login-secure/route';
import { POST as otpRequestPost } from '@/app/api/auth/sensitive/otp/request/route';
import { POST as changePasswordPost } from '@/app/api/security/change-password/route';
import { POST as amlQueuePost } from '@/app/api/admin/aml/review-queue/route';
import { POST as topupPost } from '@/app/api/admin/wallet/topup/route';

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

async function waitForAudit(where: any) {
  for (let i = 0; i < 20; i++) {
    const row = await prisma.auditLog.findFirst({ where, orderBy: { createdAt: 'desc' } });
    if (row) return row;
    await new Promise((r) => setTimeout(r, 25));
  }
  return null;
}

describe('Block 4: Audit logs', () => {
  const password = 'Password123!';
  let user: { id: string; email: string };
  let compliance: { id: string; email: string };
  let treasury: { id: string; email: string };

  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        email: `${uid('audit_user')}@test.com`,
        passwordHash: await hashPassword(password),
        emailVerified: true,
        role: UserRole.END_USER,
      },
      select: { id: true, email: true },
    });

    compliance = await prisma.user.create({
      data: {
        email: `${uid('audit_compliance')}@test.com`,
        passwordHash: await hashPassword(password),
        emailVerified: true,
        role: UserRole.COMPLIANCE,
      },
      select: { id: true, email: true },
    });

    treasury = await prisma.user.create({
      data: {
        email: `${uid('audit_treasury')}@test.com`,
        passwordHash: await hashPassword(password),
        emailVerified: true,
        role: UserRole.TREASURY,
      },
      select: { id: true, email: true },
    });

    await prisma.account.create({
      data: { userId: user.id, primaryCurrency: 'EUR' },
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { userId: { in: [user.id, compliance.id, treasury.id] } } });
    await prisma.amlReviewNote.deleteMany({ where: { authorId: compliance.id } });
    await prisma.amlReviewCase.deleteMany({ where: { userId: user.id } });
    await prisma.otpChallenge.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: { in: [user.id, compliance.id, treasury.id] } } });
    await prisma.accountTransaction.deleteMany({ where: { account: { userId: user.id } } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: { in: [user.id, compliance.id, treasury.id] } } });
  });

  test('login success/failure creates LOGIN_SUCCESS and LOGIN_FAILURE', async () => {
    await prisma.auditLog.deleteMany({ where: { action: { in: ['LOGIN_SUCCESS', 'LOGIN_FAILURE'] } } });

    const okReq = new NextRequest('http://localhost/api/auth/login-secure', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'jest-agent', 'x-forwarded-for': '10.0.0.1' },
      body: JSON.stringify({ email: user.email, password }),
    });
    const okRes = await loginPost(okReq as any);
    expect(okRes.status).toBe(200);

    const wrongReq = new NextRequest('http://localhost/api/auth/login-secure', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'jest-agent', 'x-forwarded-for': '10.0.0.1' },
      body: JSON.stringify({ email: user.email, password: 'wrong-password' }),
    });
    const wrongRes = await loginPost(wrongReq as any);
    expect(wrongRes.status).toBe(401);

    const success = await waitForAudit({ action: 'LOGIN_SUCCESS', userId: user.id, status: 'SUCCESS' });
    expect(success).not.toBeNull();
    expect(success?.ipAddress).toBeTruthy();
    expect(success?.userAgent).toBeTruthy();

    const failure = await waitForAudit({ action: 'LOGIN_FAILURE', userId: user.id, status: 'FAILURE' });
    expect(failure).not.toBeNull();
    expect((failure?.metadata as any)?.password).toBeUndefined();
  });

  test('OTP request + change password logs SENSITIVE_OTP_REQUEST and SENSITIVE_CHANGE_PASSWORD_SUCCESS', async () => {
    await prisma.auditLog.deleteMany({
      where: { action: { in: ['SENSITIVE_OTP_REQUEST', 'SENSITIVE_OTP_FAILURE', 'SENSITIVE_CHANGE_PASSWORD_SUCCESS'] } },
    });

    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
    const { token } = await createSession({ id: user.id, role: UserRole.END_USER }, '127.0.0.1', 'jest-agent');

    const req1 = new NextRequest('http://localhost/api/auth/sensitive/otp/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `auth_token=${token}`, 'user-agent': 'jest-agent', 'x-forwarded-for': '10.0.0.2' },
      body: JSON.stringify({ actionType: SensitiveActionType.SENSITIVE_CHANGE_PASSWORD }),
    });
    const r1 = await otpRequestPost(req1 as any);
    expect(r1.status).toBe(200);
    const code = extractCodeFromMock();
    expect(code).toBeTruthy();

    const req2 = new NextRequest('http://localhost/api/security/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `auth_token=${token}`, 'user-agent': 'jest-agent', 'x-forwarded-for': '10.0.0.2' },
      body: JSON.stringify({ currentPassword: password, newPassword: 'NewPassword123!', otpCode: code }),
    });
    const r2 = await changePasswordPost(req2 as any);
    expect(r2.status).toBe(200);

    const reqLog = await prisma.auditLog.findFirst({
      where: { action: 'SENSITIVE_OTP_REQUEST', userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(reqLog).not.toBeNull();

    const successLog = await waitForAudit({ action: 'SENSITIVE_CHANGE_PASSWORD_SUCCESS', userId: user.id, status: 'SUCCESS' });
    expect(successLog).not.toBeNull();
  });

  test('invalid OTP confirmation logs SENSITIVE_OTP_FAILURE', async () => {
    await prisma.auditLog.deleteMany({ where: { action: 'SENSITIVE_OTP_FAILURE', userId: user.id } });
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
    const { token } = await createSession({ id: user.id, role: UserRole.END_USER }, '127.0.0.1', 'jest-agent');

    const req2 = new NextRequest('http://localhost/api/security/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `auth_token=${token}`, 'user-agent': 'jest-agent' },
      body: JSON.stringify({ currentPassword: password, newPassword: 'OtherPassword123!', otpCode: '000000' }),
    });
    const r2 = await changePasswordPost(req2 as any);
    expect(r2.status).toBe(400);

    const failureLog = await waitForAudit({ action: 'SENSITIVE_OTP_FAILURE', userId: user.id, status: 'FAILURE' });
    expect(failureLog).not.toBeNull();
  });

  test('AML DECIDE creates AML_CASE_DECISION log', async () => {
    await prisma.auditLog.deleteMany({ where: { action: 'AML_CASE_DECISION', userId: compliance.id } });

    const created = await prisma.amlReviewCase.create({
      data: {
        userId: user.id,
        reason: 'VELOCITY',
        contextJson: { amountUsd: 10 },
        status: 'PENDING',
        riskLevel: 'HIGH',
        riskScore: 80,
        slaDueAt: new Date(Date.now() + 60 * 60 * 1000),
      },
      select: { id: true },
    });

    const { token } = await createSession({ id: compliance.id, role: UserRole.COMPLIANCE }, '127.0.0.1', 'jest-agent');
    const req = new NextRequest('http://localhost/api/admin/aml/review-queue', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `auth_token=${token}`, 'user-agent': 'jest-agent', 'x-forwarded-for': '10.0.0.3' },
      body: JSON.stringify({ action: 'DECIDE', id: created.id, decision: 'CLEAR', decisionNote: 'OK' }),
    });
    const res = await amlQueuePost(req as any);
    expect(res.status).toBe(200);

    const log = await waitForAudit({ action: 'AML_CASE_DECISION', userId: compliance.id, status: 'SUCCESS' });
    expect(log).not.toBeNull();
    expect((log?.metadata as any)?.caseId).toBe(created.id);
    expect(log?.ipAddress).toBeTruthy();
    expect(log?.userAgent).toBeTruthy();
  });

  test('treasury topup creates TREASURY_MANUAL_TOPUP log', async () => {
    await prisma.auditLog.deleteMany({ where: { action: 'TREASURY_MANUAL_TOPUP', userId: treasury.id } });

    const { token } = await createSession({ id: treasury.id, role: UserRole.TREASURY }, '127.0.0.1', 'jest-agent');
    const req = new NextRequest('http://localhost/api/admin/wallet/topup', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `auth_token=${token}`, 'user-agent': 'jest-agent', 'x-forwarded-for': '10.0.0.4' },
      body: JSON.stringify({ userId: user.id, amount: 10, currency: 'EUR' }),
    });
    const res = await topupPost(req as any);
    expect(res.status).toBe(200);

    const log = await waitForAudit({ action: 'TREASURY_MANUAL_TOPUP', userId: treasury.id, status: 'SUCCESS' });
    expect(log).not.toBeNull();
    expect((log?.metadata as any)?.targetUserId).toBe(user.id);
    expect((log?.metadata as any)?.currency).toBe('EUR');
  });
});
