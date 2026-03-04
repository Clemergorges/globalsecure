import { Prisma } from '@prisma/client';
import { prisma } from '../setup/prisma';
import { getYieldPower, setCollateralSnapshot } from '@/lib/services/yield-credit';

function uid() {
  return `test_yield_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('Yield credit helpers', () => {
  let userId: string;
  let assetSymbol: string;

  beforeAll(() => {
    process.env.YIELD_LTV_MAX_BPS = '3000';
    process.env.YIELD_COLLATERAL_VALUE_USD_STUB = '0';
  });

  beforeEach(async () => {
    const email = `${uid()}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User' },
      select: { id: true },
    });
    userId = user.id;
    assetSymbol = `TEST_${uid()}`.toUpperCase();
    await prisma.userCreditLine.create({
      data: {
        userId,
        collateralAsset: assetSymbol,
        collateralAmount: new Prisma.Decimal(0),
        collateralValueUsd: new Prisma.Decimal(0),
        ltvMax: new Prisma.Decimal(0),
        ltvCurrent: new Prisma.Decimal(0),
        status: 'INACTIVE',
      },
    });
  });

  afterEach(async () => {
    await prisma.yieldLiability.deleteMany({ where: { userId } });
    await prisma.userCreditLine.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  test('calcula power/available/reserved/debt e atualiza ltvCurrent', async () => {
    await setCollateralSnapshot(userId, 0, 10000);

    await prisma.yieldLiability.create({
      data: {
        userId,
        amountUsd: new Prisma.Decimal(500),
        status: 'PENDING_SETTLEMENT',
      },
    });

    const r = await getYieldPower(userId);

    expect(r.collateralValueUsd).toBeCloseTo(10000, 2);
    expect(r.powerUsd).toBeCloseTo(3000, 2);
    expect(r.debtUsd).toBeCloseTo(500, 2);
    expect(r.reservedUsd).toBeCloseTo(500, 2);
    expect(r.availableUsd).toBeCloseTo(2500, 2);

    const cl = await prisma.userCreditLine.findUnique({ where: { userId } });
    expect(cl?.ltvCurrent.toNumber()).toBeCloseTo(0.05, 4);
  });
});
