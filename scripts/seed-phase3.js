const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local'), override: true });

const bcrypt = require('bcryptjs');
const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'phase3.user@gss.dev';
  const password = process.env.PHASE3_SEED_PASSWORD || 'dev123';
  const passwordHash = bcrypt.hashSync(password, 10);
  const firstName = 'Phase3';
  const lastName = 'User';

  console.log('🚀 Seed Phase 3: criando usuário base...');

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      emailVerified: true,
      yieldEnabled: true,
      yieldEnabledAt: new Date(),
    },
    create: {
      email,
      emailVerified: true,
      passwordHash,
      firstName,
      lastName,
      yieldEnabled: true,
      yieldEnabledAt: new Date(),
    },
    select: { id: true, email: true },
  });

  console.log('✅ User ID:', user.id);

  // Account is required for login (JWT carries account.status); without it user gets UNVERIFIED and is sent to onboarding
  const account = await prisma.account.upsert({
    where: { userId: user.id },
    update: { status: 'ACTIVE', primaryCurrency: 'EUR' },
    create: {
      userId: user.id,
      status: 'ACTIVE',
      primaryCurrency: 'EUR',
      balances: { create: { currency: 'EUR', amount: 0 } },
    },
  });
  console.log('✅ Account ID:', account.id, 'status:', account.status);

  console.log('💶 Criando fiatBalance EUR + linha de crédito...');

  await prisma.fiatBalance.upsert({
    where: { userId_currency: { userId: user.id, currency: 'EUR' } },
    update: { amount: new Prisma.Decimal(500) },
    create: {
      userId: user.id,
      currency: 'EUR',
      amount: new Prisma.Decimal(500),
    },
  });

  await prisma.userCreditLine.upsert({
    where: { userId: user.id },
    update: {
      collateralAsset: 'EETH',
      collateralAmount: new Prisma.Decimal(0),
      collateralValueUsd: new Prisma.Decimal(10000),
      ltvMax: new Prisma.Decimal(0.3),
      ltvCurrent: new Prisma.Decimal(0),
      status: 'ACTIVE',
    },
    create: {
      userId: user.id,
      collateralAsset: 'EETH',
      collateralAmount: new Prisma.Decimal(0),
      collateralValueUsd: new Prisma.Decimal(10000),
      ltvMax: new Prisma.Decimal(0.3),
      ltvCurrent: new Prisma.Decimal(0),
      status: 'ACTIVE',
    },
  });

  if ((process.env.PHASE3_SEED_AML_CASE || '').toLowerCase() === 'true') {
    await prisma.amlReviewCase.deleteMany({
      where: { userId: user.id, reason: 'CANARY_SEED' },
    });

    await prisma.amlReviewCase.create({
      data: {
        userId: user.id,
        reason: 'CANARY_SEED',
        contextJson: { source: 'seed:phase3' },
        status: 'PENDING',
        riskLevel: 'CRITICAL',
        riskScore: 100,
        slaDueAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });
  }

  if ((process.env.PHASE4_SEED_AML_VELOCITY || '').toLowerCase() === 'true') {
    await prisma.amlReviewCase.deleteMany({
      where: { userId: user.id, reason: 'VELOCITY_TX_COUNT' },
    });

    const hours = Number(process.env.AML_SLA_HIGH_HOURS || 24);
    const slaDueAt = new Date(Date.now() + (Number.isFinite(hours) && hours > 0 ? hours : 24) * 60 * 60 * 1000);
    await prisma.amlReviewCase.create({
      data: {
        userId: user.id,
        reason: 'VELOCITY_TX_COUNT',
        contextJson: { source: 'seed:phase3', rule: 'VELOCITY_TX_COUNT' },
        status: 'PENDING',
        riskLevel: 'HIGH',
        riskScore: 80,
        slaDueAt,
      },
    });
  }

  if ((process.env.PHASE4_SEED_AML_JURISDICTION || '').toLowerCase() === 'true') {
    await prisma.amlReviewCase.deleteMany({
      where: { userId: user.id, reason: 'HIGH_RISK_JURISDICTION' },
    });

    const highRisk = (process.env.AML_HIGH_RISK_COUNTRIES || 'RU').split(',')[0]?.trim().toUpperCase() || 'RU';
    await prisma.user.update({ where: { id: user.id }, data: { country: highRisk } });

    const hours = Number(process.env.AML_SLA_CRITICAL_HOURS || 4);
    const slaDueAt = new Date(Date.now() + (Number.isFinite(hours) && hours > 0 ? hours : 4) * 60 * 60 * 1000);
    await prisma.amlReviewCase.create({
      data: {
        userId: user.id,
        reason: 'HIGH_RISK_JURISDICTION',
        contextJson: { source: 'seed:phase3', rule: 'HIGH_RISK_JURISDICTION', country: highRisk },
        status: 'PENDING',
        riskLevel: 'CRITICAL',
        riskScore: 100,
        slaDueAt,
      },
    });
  }

  if ((process.env.PHASE4_SEED_TREASURY || '').toLowerCase() === 'true') {
    const balanceAgg = await prisma.fiatBalance.aggregate({
      where: { currency: 'EUR' },
      _sum: { amount: true },
    });
    const totalEur = balanceAgg._sum.amount || new Prisma.Decimal(0);
    const alertThreshold = new Prisma.Decimal(600);
    const criticalThreshold = new Prisma.Decimal(400);

    await prisma.treasuryLimit.upsert({
      where: { currency: 'EUR' },
      update: { minBalance: new Prisma.Decimal(0), alertThreshold, criticalThreshold },
      create: { currency: 'EUR', minBalance: new Prisma.Decimal(0), alertThreshold, criticalThreshold },
    });

    const level = totalEur.lessThan(criticalThreshold) ? 'CRITICAL' : totalEur.lessThan(alertThreshold) ? 'WARNING' : null;
    console.log('🏦 TREASURY EUR:', { level, balance: totalEur.toFixed(2), alertThreshold: alertThreshold.toFixed(2), criticalThreshold: criticalThreshold.toFixed(2) });
  }

  await prisma.fxRate.upsert({
    where: { baseCurrency_quoteCurrency: { baseCurrency: 'USD', quoteCurrency: 'EUR' } },
    update: { rate: new Prisma.Decimal(0.9), spreadBps: 0, source: 'SEED', fetchedAt: new Date() },
    create: { baseCurrency: 'USD', quoteCurrency: 'EUR', rate: new Prisma.Decimal(0.9), spreadBps: 0, source: 'SEED', fetchedAt: new Date() },
  });

  console.log('📈 Criando yieldLiability para simular uso de crédito...');
  await prisma.yieldLiability.deleteMany({ where: { userId: user.id } });
  await prisma.yieldLiability.createMany({
    data: [
      {
        userId: user.id,
        amountUsd: new Prisma.Decimal(200),
        status: 'PENDING_SETTLEMENT',
      },
      {
        userId: user.id,
        amountUsd: new Prisma.Decimal(300),
        status: 'PENDING_SETTLEMENT',
      },
    ],
  });

  const creditLine = await prisma.userCreditLine.findUnique({
    where: { userId: user.id },
    select: { collateralValueUsd: true, ltvMax: true },
  });
  const creditLineCount = await prisma.userCreditLine.count({ where: { userId: user.id } });

  const debtAgg = await prisma.yieldLiability.aggregate({
    where: { userId: user.id, status: { in: ['PENDING_SETTLEMENT', 'SETTLED_READY'] } },
    _sum: { amountUsd: true },
  });

  const reservedAgg = await prisma.yieldLiability.aggregate({
    where: { userId: user.id, status: 'PENDING_SETTLEMENT' },
    _sum: { amountUsd: true },
  });

  const collateralValueUsd = creditLine?.collateralValueUsd?.toNumber() || 0;
  const ltvMax = creditLine?.ltvMax?.toNumber() || 0;
  const powerUsd = collateralValueUsd * ltvMax;
  const debtUsd = debtAgg._sum.amountUsd?.toNumber() || 0;
  const reservedUsd = reservedAgg._sum.amountUsd?.toNumber() || 0;
  const availableUsd = Math.max(powerUsd - debtUsd, 0);

  console.log('✅ Seed Phase 3 concluído. Use o login:');
  console.log('- email:', email);
  console.log('- senha:', password);
  console.log('- userCreditLine rows:', creditLineCount);
  console.log('📊 Esperado no /api/yield/power (USD):', {
    powerUsd: Number(powerUsd.toFixed(2)),
    debtUsd: Number(debtUsd.toFixed(2)),
    reservedUsd: Number(reservedUsd.toFixed(2)),
    availableUsd: Number(availableUsd.toFixed(2)),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
