import { Prisma } from '@prisma/client';
import { prisma } from '../setup/prisma';
import { checkAmlForYieldSpend } from '@/lib/services/aml-rules';

function uid() {
  return `test_aml_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('AML rules for yield spending', () => {
  let userId: string;

  beforeAll(() => {
    process.env.AML_SANCTIONED_COUNTRIES = 'RU,IR';
    process.env.AML_SINGLE_TX_MAX_USD = '1000';
    process.env.AML_DAILY_MAX_USD = '3000';
  });

  beforeEach(async () => {
    const email = `${uid()}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User' },
      select: { id: true },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await prisma.yieldLiability.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  test('bloqueia país sancionado', async () => {
    const r = await checkAmlForYieldSpend(userId, { amountUsd: 10, merchantCountry: 'RU' });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('SANCTIONED_COUNTRY');
  });

  test('bloqueia por limite diário', async () => {
    await prisma.yieldLiability.create({
      data: {
        userId,
        amountUsd: new Prisma.Decimal(2900),
        status: 'PENDING_SETTLEMENT',
      },
    });

    const r = await checkAmlForYieldSpend(userId, { amountUsd: 200, merchantCountry: 'US' });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('DAILY_MAX');
  });

  test('permite abaixo dos limites', async () => {
    const r = await checkAmlForYieldSpend(userId, { amountUsd: 100, merchantCountry: 'US' });
    expect(r.allowed).toBe(true);
  });
});

