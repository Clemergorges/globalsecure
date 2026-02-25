import { Prisma } from '@prisma/client';
import { prisma } from '../setup/prisma';
import { createSession } from '@/lib/session';
import { NextRequest } from 'next/server';

import { GET as overviewGet } from '@/app/api/dashboard/overview/route';
import { POST as fxQuotePost } from '@/app/api/fx/quote/route';
import { POST as fxConvertPost } from '@/app/api/fx/convert/route';
import { GET as cryptoGet } from '@/app/api/wallet/crypto/route';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('Dashboard overview + FX + Crypto wallet', () => {
  const userAgent = 'jest-agent';

  test('GET /api/dashboard/overview returns 401 when unauthenticated', async () => {
    const req = new NextRequest('http://localhost/api/dashboard/overview', { method: 'GET' });
    const res = await overviewGet(req);
    expect(res.status).toBe(401);
  });

  test('GET /api/dashboard/overview returns consolidated data', async () => {
    const email = `${uid('overview')}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        country: 'DE',
        riskTier: 'LOW',
        kycStatus: 'APPROVED',
        kycLevel: 1,
        yieldEnabled: true,
        account: {
          create: {
            status: 'ACTIVE',
            primaryCurrency: 'EUR',
            balances: { create: [{ currency: 'EUR', amount: new Prisma.Decimal(12.34) }] },
          },
        },
      },
      select: { id: true },
    });

    await prisma.fiatBalance.upsert({
      where: { userId_currency: { userId: user.id, currency: 'EUR' } },
      update: { amount: new Prisma.Decimal(50) },
      create: { userId: user.id, currency: 'EUR', amount: new Prisma.Decimal(50) },
    });

    await prisma.kycVerification.create({
      data: { userId: user.id, level: 'BASIC', status: 'APPROVED' },
    });

    await prisma.yieldLiability.createMany({
      data: [
        { userId: user.id, amountUsd: new Prisma.Decimal(10), status: 'PENDING_SETTLEMENT' },
        { userId: user.id, amountUsd: new Prisma.Decimal(5), status: 'SETTLED_READY' },
        { userId: user.id, amountUsd: new Prisma.Decimal(999), status: 'CANCELLED' },
      ],
    });

    await prisma.amlReviewCase.createMany({
      data: [
        { userId: user.id, reason: 'TEST', contextJson: {}, status: 'PENDING', riskLevel: 'MEDIUM', riskScore: 10 },
        { userId: user.id, reason: 'TEST', contextJson: {}, status: 'IN_REVIEW', riskLevel: 'HIGH', riskScore: 80 },
      ],
    });

    await prisma.cryptoDeposit.createMany({
      data: [
        { userId: user.id, txHash: uid('txd1'), network: 'POLYGON', token: 'USDT', amount: new Prisma.Decimal('100.000000'), status: 'CONFIRMED' },
        { userId: user.id, txHash: uid('txd2'), network: 'POLYGON', token: 'USDT', amount: new Prisma.Decimal('2.000000'), status: 'PENDING' },
      ],
    });

    await prisma.cryptoWithdraw.create({
      data: { userId: user.id, asset: 'USDT', amount: new Prisma.Decimal('25.000000'), toAddress: '0xabc', status: 'PENDING' },
    });

    const { token } = await createSession({ id: user.id, role: 'END_USER' as any }, '127.0.0.1', userAgent);

    const req = new NextRequest('http://localhost/api/dashboard/overview', {
      method: 'GET',
      headers: { cookie: `auth_token=${token}`, 'user-agent': userAgent },
    });
    const res = await overviewGet(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data.user.id).toBe(user.id);
    expect(body.data.user.kycStatus).toBe('APPROVED');
    expect(body.data.user.kycLevel).toBe('BASIC');
    expect(body.data.user.riskTier).toBe('LOW');
    expect(body.data.yield.enabled).toBe(true);
    expect(body.data.yield.pendingLiabilities).toBe(1);
    expect(body.data.yield.totalLiabilityUsd).toBe('15.00');
    expect(body.data.aml.openCases).toBe(2);
    expect(body.data.aml.highestRiskLevel).toBe('HIGH');
    expect(Array.isArray(body.data.balances)).toBe(true);

    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.cryptoDeposit.deleteMany({ where: { userId: user.id } });
    await prisma.cryptoWithdraw.deleteMany({ where: { userId: user.id } });
    await prisma.amlReviewCase.deleteMany({ where: { userId: user.id } });
    await prisma.yieldLiability.deleteMany({ where: { userId: user.id } });
    await prisma.kycVerification.deleteMany({ where: { userId: user.id } });
    await prisma.fiatBalance.deleteMany({ where: { userId: user.id } });
    await prisma.balance.deleteMany({ where: { account: { userId: user.id } } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('POST /api/fx/quote returns 401 when unauthenticated', async () => {
    const req = new NextRequest('http://localhost/api/fx/quote', { method: 'POST', body: JSON.stringify({ fromCurrency: 'EUR', toCurrency: 'USD', amount: '10.00' }) as any });
    const res = await fxQuotePost(req);
    expect(res.status).toBe(401);
  });

  test('POST /api/fx/quote returns 200 for available pair and 400 for missing pair', async () => {
    const email = `${uid('fxquote')}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR', balances: { create: [{ currency: 'EUR', amount: new Prisma.Decimal(0) }] } } },
      },
      select: { id: true },
    });

    const { token } = await createSession({ id: user.id, role: 'END_USER' as any }, '127.0.0.1', userAgent);

    await prisma.fxRate.upsert({
      where: { baseCurrency_quoteCurrency: { baseCurrency: 'EUR', quoteCurrency: 'USD' } },
      update: { rate: new Prisma.Decimal('1.050000'), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
      create: { baseCurrency: 'EUR', quoteCurrency: 'USD', rate: new Prisma.Decimal('1.050000'), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
    });

    const okReq = new NextRequest('http://localhost/api/fx/quote', {
      method: 'POST',
      headers: { cookie: `auth_token=${token}`, 'user-agent': userAgent, 'content-type': 'application/json' },
      body: JSON.stringify({ fromCurrency: 'EUR', toCurrency: 'USD', amount: '100.00' }),
    });
    const okRes = await fxQuotePost(okReq);
    expect(okRes.status).toBe(200);
    const okBody = await okRes.json();
    expect(okBody.data.rate).toBe('1.050000');
    expect(okBody.data.fee).toBe('1.80');
    expect(okBody.data.total).toBe('101.80');

    const badReq = new NextRequest('http://localhost/api/fx/quote', {
      method: 'POST',
      headers: { cookie: `auth_token=${token}`, 'user-agent': userAgent, 'content-type': 'application/json' },
      body: JSON.stringify({ fromCurrency: 'EUR', toCurrency: 'BRL', amount: '10.00' }),
    });
    const badRes = await fxQuotePost(badReq);
    expect(badRes.status).toBe(400);
    const badBody = await badRes.json();
    expect(badBody.code).toBe('PAIR_NOT_AVAILABLE');

    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.fxRate.deleteMany({ where: { baseCurrency: 'EUR', quoteCurrency: 'USD' } });
    await prisma.balance.deleteMany({ where: { account: { userId: user.id } } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('POST /api/fx/convert returns 400 INSUFFICIENT_FUNDS when balance is low', async () => {
    const email = `${uid('fxconvert_low')}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR', balances: { create: [{ currency: 'EUR', amount: new Prisma.Decimal(0) }] } } },
      },
      select: { id: true },
    });

    await prisma.fxRate.upsert({
      where: { baseCurrency_quoteCurrency: { baseCurrency: 'EUR', quoteCurrency: 'USD' } },
      update: { rate: new Prisma.Decimal('1.100000'), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
      create: { baseCurrency: 'EUR', quoteCurrency: 'USD', rate: new Prisma.Decimal('1.100000'), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
    });

    await prisma.fiatBalance.upsert({
      where: { userId_currency: { userId: user.id, currency: 'EUR' } },
      update: { amount: new Prisma.Decimal(50) },
      create: { userId: user.id, currency: 'EUR', amount: new Prisma.Decimal(50) },
    });

    const { token } = await createSession({ id: user.id, role: 'END_USER' as any }, '127.0.0.1', userAgent);
    const req = new NextRequest('http://localhost/api/fx/convert', {
      method: 'POST',
      headers: { cookie: `auth_token=${token}`, 'user-agent': userAgent, 'content-type': 'application/json' },
      body: JSON.stringify({ fromCurrency: 'EUR', toCurrency: 'USD', amount: '100.00' }),
    });
    const res = await fxConvertPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INSUFFICIENT_FUNDS');

    await prisma.userTransaction.deleteMany({ where: { userId: user.id } });
    await prisma.fiatBalance.deleteMany({ where: { userId: user.id } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.fxRate.deleteMany({ where: { baseCurrency: 'EUR', quoteCurrency: 'USD' } });
    await prisma.balance.deleteMany({ where: { account: { userId: user.id } } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('POST /api/fx/convert converts and updates fiat balances and creates UserTransaction FX', async () => {
    const email = `${uid('fxconvert_ok')}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR', balances: { create: [{ currency: 'EUR', amount: new Prisma.Decimal(0) }] } } },
      },
      select: { id: true },
    });

    await prisma.fxRate.upsert({
      where: { baseCurrency_quoteCurrency: { baseCurrency: 'EUR', quoteCurrency: 'USD' } },
      update: { rate: new Prisma.Decimal('1.100000'), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
      create: { baseCurrency: 'EUR', quoteCurrency: 'USD', rate: new Prisma.Decimal('1.100000'), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
    });

    await prisma.fiatBalance.upsert({
      where: { userId_currency: { userId: user.id, currency: 'EUR' } },
      update: { amount: new Prisma.Decimal(200) },
      create: { userId: user.id, currency: 'EUR', amount: new Prisma.Decimal(200) },
    });

    const { token } = await createSession({ id: user.id, role: 'END_USER' as any }, '127.0.0.1', userAgent);
    const req = new NextRequest('http://localhost/api/fx/convert', {
      method: 'POST',
      headers: { cookie: `auth_token=${token}`, 'user-agent': userAgent, 'content-type': 'application/json' },
      body: JSON.stringify({ fromCurrency: 'EUR', toCurrency: 'USD', amount: '100.00' }),
    });
    const res = await fxConvertPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.fee).toBe('1.80');
    expect(body.data.debitTotal).toBe('101.80');
    expect(body.data.credited).toBe('110.000000');

    const eur = await prisma.fiatBalance.findUnique({ where: { userId_currency: { userId: user.id, currency: 'EUR' } } });
    const usd = await prisma.fiatBalance.findUnique({ where: { userId_currency: { userId: user.id, currency: 'USD' } } });
    expect(eur?.amount.toFixed(2)).toBe('98.20');
    expect(usd?.amount.toFixed(2)).toBe('110.00');

    const utx = await prisma.userTransaction.findFirst({ where: { userId: user.id, type: 'FX' }, orderBy: { createdAt: 'desc' } });
    expect(utx).toBeTruthy();

    await prisma.userTransaction.deleteMany({ where: { userId: user.id } });
    await prisma.fiatBalance.deleteMany({ where: { userId: user.id } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.fxRate.deleteMany({ where: { baseCurrency: 'EUR', quoteCurrency: 'USD' } });
    await prisma.balance.deleteMany({ where: { account: { userId: user.id } } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('GET /api/wallet/crypto returns balance and lists', async () => {
    const email = `${uid('crypto')}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR', balances: { create: [{ currency: 'EUR', amount: new Prisma.Decimal(0) }] } } },
      },
      select: { id: true },
    });

    await prisma.cryptoDeposit.createMany({
      data: [
        { userId: user.id, txHash: uid('dep1'), network: 'POLYGON', token: 'USDT', amount: new Prisma.Decimal('10.000000'), status: 'CONFIRMED' },
        { userId: user.id, txHash: uid('dep2'), network: 'POLYGON', token: 'USDT', amount: new Prisma.Decimal('5.000000'), status: 'CREDITED' },
      ],
    });
    await prisma.cryptoWithdraw.createMany({
      data: [
        { userId: user.id, asset: 'USDT', amount: new Prisma.Decimal('3.000000'), toAddress: '0xabc', status: 'PENDING' },
        { userId: user.id, asset: 'USDT', amount: new Prisma.Decimal('2.000000'), toAddress: '0xdef', status: 'FAILED' },
      ],
    });

    const { token } = await createSession({ id: user.id, role: 'END_USER' as any }, '127.0.0.1', userAgent);
    const req = new NextRequest('http://localhost/api/wallet/crypto', {
      method: 'GET',
      headers: { cookie: `auth_token=${token}`, 'user-agent': userAgent },
    });
    const res = await cryptoGet(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.network).toBe('POLYGON');
    expect(body.data.token).toBe('USDT');
    expect(body.data.balance).toBe('12.000000');
    expect(body.data.deposits.length).toBeGreaterThan(0);
    expect(body.data.withdrawals.length).toBeGreaterThan(0);

    await prisma.cryptoDeposit.deleteMany({ where: { userId: user.id } });
    await prisma.cryptoWithdraw.deleteMany({ where: { userId: user.id } });
    await prisma.balance.deleteMany({ where: { account: { userId: user.id } } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
