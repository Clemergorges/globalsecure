import { NextRequest, NextResponse } from 'next/server';
import { Prisma, UserRole } from '@prisma/client';
import { validateSession } from '@/lib/session';
import { prisma } from '@/lib/db';

const NETWORK = 'POLYGON';
const TOKEN = 'USDT';

export async function GET(req: NextRequest) {
  const session = await validateSession(req);
  if (!session) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  if (session.role !== UserRole.END_USER) return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });

  // GSS-MVP-FIX: Match withdraw asset string used by /api/crypto/withdraw (USDT_POLYGON_TESTNET) so UI reflects withdrawals.
  const withdrawAssets = [TOKEN, 'USDT_POLYGON_TESTNET'] as const;

  const [deposits, withdrawals, depAgg, wdAgg] = await Promise.all([
    prisma.cryptoDeposit.findMany({
      where: { userId: session.userId, network: NETWORK, token: TOKEN },
      orderBy: { detectedAt: 'desc' },
      take: 50,
      select: { txHash: true, amount: true, status: true, detectedAt: true },
    }),
    prisma.cryptoWithdraw.findMany({
      where: { userId: session.userId, asset: { in: withdrawAssets as any } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { txHash: true, amount: true, status: true, createdAt: true },
    }),
    prisma.cryptoDeposit.aggregate({
      where: { userId: session.userId, network: NETWORK, token: TOKEN, status: { in: ['CONFIRMED', 'CREDITED'] } },
      _sum: { amount: true },
    }),
    prisma.cryptoWithdraw.aggregate({
      where: { userId: session.userId, asset: { in: withdrawAssets as any }, status: { in: ['PENDING', 'BROADCASTED', 'CONFIRMED'] } },
      _sum: { amount: true },
    }),
  ]);

  const dep = depAgg._sum.amount || new Prisma.Decimal(0);
  const wd = wdAgg._sum.amount || new Prisma.Decimal(0);
  const balance = dep.sub(wd);

  return NextResponse.json({
    data: {
      network: NETWORK,
      token: TOKEN,
      balance: balance.toFixed(6),
      deposits: deposits.map((d) => ({
        txHash: d.txHash,
        amount: d.amount.toFixed(6),
        status: String(d.status),
        detectedAt: d.detectedAt.toISOString(),
      })),
      withdrawals: withdrawals.map((w) => ({
        txHash: w.txHash || null,
        amount: w.amount.toFixed(6),
        status: String(w.status),
        createdAt: w.createdAt.toISOString(),
      })),
    },
  });
}
