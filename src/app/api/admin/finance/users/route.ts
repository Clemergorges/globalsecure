import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdmin } from '@/lib/auth';

function getCollateralStubUsd() {
  const raw = process.env.YIELD_COLLATERAL_VALUE_USD_STUB;
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function GET(req: Request) {
  try {
    await checkAdmin();

    const url = new URL(req.url);
    const take = Math.min(Number(url.searchParams.get('take') || 50), 200);

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        email: true,
        country: true,
        kycLevel: true,
        yieldEnabled: true,
        fiatBalances: { select: { currency: true, amount: true } },
        creditLines: { select: { collateralAsset: true, collateralAmount: true, collateralValueUsd: true, ltvMax: true, ltvCurrent: true, status: true } },
      },
    });

    const ids = users.map((u) => u.id);
    const liabilities = await prisma.yieldLiability.groupBy({
      by: ['userId', 'status'],
      where: { userId: { in: ids }, status: { in: ['PENDING_SETTLEMENT', 'SETTLED_READY'] } },
      _sum: { amountUsd: true },
    });

    const liabMap = new Map<string, { debtUsd: number; reservedUsd: number }>();
    for (const row of liabilities) {
      const cur = liabMap.get(row.userId) || { debtUsd: 0, reservedUsd: 0 };
      const v = row._sum.amountUsd?.toNumber() || 0;
      cur.debtUsd += v;
      if (row.status === 'PENDING_SETTLEMENT') cur.reservedUsd += v;
      liabMap.set(row.userId, cur);
    }

    const out = users.map((u) => {
      const cl = u.creditLines[0] || null;
      const collateralValueUsd = (cl?.collateralValueUsd?.toNumber() || 0) || getCollateralStubUsd();
      const ltvMax = cl?.ltvMax?.toNumber() || 0;
      const powerUsd = collateralValueUsd * ltvMax;
      const liab = liabMap.get(u.id) || { debtUsd: 0, reservedUsd: 0 };
      const availableUsd = Math.max(powerUsd - liab.debtUsd, 0);

      return {
        id: u.id,
        email: u.email,
        country: u.country,
        kycLevel: u.kycLevel,
        yieldEnabled: u.yieldEnabled,
        fiatBalances: u.fiatBalances.map((b) => ({ currency: b.currency, amount: b.amount.toString() })),
        creditLine: cl
          ? {
              collateralAsset: cl.collateralAsset,
              collateralAmount: cl.collateralAmount.toString(),
              collateralValueUsd: cl.collateralValueUsd.toString(),
              ltvMax: cl.ltvMax.toString(),
              ltvCurrent: cl.ltvCurrent.toString(),
              status: cl.status,
            }
          : null,
        yield: {
          powerUsd,
          availableUsd,
          reservedUsd: liab.reservedUsd,
          debtUsd: liab.debtUsd,
        },
      };
    });

    return NextResponse.json({ users: out });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

