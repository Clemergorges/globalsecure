import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export type UserOverview = {
  user: {
    id: string;
    email: string;
    kycStatus: string;
    kycLevel: string | null;
    riskTier: string;
    country: string | null;
  };
  balances: {
    currency: string;
    amount: string;
    type: 'FIAT_ACCOUNT' | 'FIAT_AGGREGATED' | 'CRYPTO';
  }[];
  limits: {
    perTx: string | null;
    daily: string | null;
    monthly: string | null;
    currency: string;
  } | null;
  yield: {
    enabled: boolean;
    totalLiabilityUsd: string;
    pendingLiabilities: number;
  };
  aml: {
    openCases: number;
    highestRiskLevel: string | null;
  };
};

const LIMITS_BASE = {
  perTx: new Prisma.Decimal(500),
  daily: new Prisma.Decimal(1000),
  monthly: new Prisma.Decimal(5000),
};

const HIGH_RISK_MULTIPLIER = new Prisma.Decimal(0.4);

function maxRiskLevel(levels: string[]) {
  const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  for (const k of order) {
    if (levels.includes(k)) return k;
  }
  return null;
}

export async function getUserOverview(userId: string): Promise<UserOverview> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      country: true,
      riskTier: true,
      kycStatus: true,
      kycLevel: true,
      yieldEnabled: true,
      account: {
        select: {
          id: true,
          primaryCurrency: true,
          balances: { select: { currency: true, amount: true } },
        },
      },
    },
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  const [fiatAgg, kycVerification, yieldAgg, pendingYieldCount, amlCases, cryptoDepositsAgg, cryptoWithdrawAgg] =
    await Promise.all([
      prisma.fiatBalance.findMany({ where: { userId: user.id }, select: { currency: true, amount: true } }),
      prisma.kycVerification.findUnique({ where: { userId: user.id }, select: { level: true } }).catch(() => null),
      prisma.yieldLiability.aggregate({
        where: { userId: user.id, status: { not: 'CANCELLED' } },
        _sum: { amountUsd: true },
      }),
      prisma.yieldLiability.count({ where: { userId: user.id, status: 'PENDING_SETTLEMENT' } }),
      prisma.amlReviewCase.findMany({
        where: { userId: user.id, status: { in: ['PENDING', 'IN_REVIEW', 'BLOCKED'] } },
        select: { riskLevel: true },
      }),
      prisma.cryptoDeposit.aggregate({
        where: { userId: user.id, token: 'USDT', network: 'POLYGON', status: { in: ['CONFIRMED', 'CREDITED'] } },
        _sum: { amount: true },
      }),
      prisma.cryptoWithdraw.aggregate({
        where: { userId: user.id, asset: 'USDT', status: { in: ['PENDING', 'BROADCASTED', 'CONFIRMED'] } },
        _sum: { amount: true },
      }),
    ]);

  const balances: UserOverview['balances'] = [];

  for (const b of user.account?.balances || []) {
    balances.push({
      currency: b.currency,
      amount: b.amount.toFixed(2),
      type: 'FIAT_ACCOUNT',
    });
  }

  for (const b of fiatAgg) {
    balances.push({
      currency: b.currency,
      amount: b.amount.toFixed(2),
      type: 'FIAT_AGGREGATED',
    });
  }

  const dep = cryptoDepositsAgg._sum.amount || new Prisma.Decimal(0);
  const wd = cryptoWithdrawAgg._sum.amount || new Prisma.Decimal(0);
  const net = dep.sub(wd);
  balances.push({
    currency: 'USDT',
    amount: net.toFixed(6),
    type: 'CRYPTO',
  });

  const isApproved = String(user.kycStatus) === 'APPROVED';
  const isHighRisk = String(user.riskTier) === 'HIGH';
  const currency = user.account?.primaryCurrency || 'EUR';

  const limits = isApproved
    ? {
        perTx: (isHighRisk ? LIMITS_BASE.perTx.mul(HIGH_RISK_MULTIPLIER) : LIMITS_BASE.perTx).toFixed(2),
        daily: (isHighRisk ? LIMITS_BASE.daily.mul(HIGH_RISK_MULTIPLIER) : LIMITS_BASE.daily).toFixed(2),
        monthly: (isHighRisk ? LIMITS_BASE.monthly.mul(HIGH_RISK_MULTIPLIER) : LIMITS_BASE.monthly).toFixed(2),
        currency,
      }
    : null;

  const totalLiabilityUsd = (yieldAgg._sum.amountUsd || new Prisma.Decimal(0)).toFixed(2);

  return {
    user: {
      id: user.id,
      email: user.email,
      kycStatus: String(user.kycStatus),
      kycLevel: kycVerification?.level ? String(kycVerification.level) : null,
      riskTier: String(user.riskTier),
      country: user.country || null,
    },
    balances,
    limits,
    yield: {
      enabled: !!user.yieldEnabled,
      totalLiabilityUsd,
      pendingLiabilities: pendingYieldCount,
    },
    aml: {
      openCases: amlCases.length,
      highestRiskLevel: maxRiskLevel(amlCases.map((c) => String(c.riskLevel))),
    },
  };
}
