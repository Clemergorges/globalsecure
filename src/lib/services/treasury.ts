import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type LimitDefaults = { currency: string; minBalance: number; alertThreshold: number };

function getDefaults(): LimitDefaults[] {
  return [
    { currency: 'EUR', minBalance: 0, alertThreshold: 2000 },
    { currency: 'USD', minBalance: 0, alertThreshold: 5000 },
    { currency: 'GBP', minBalance: 0, alertThreshold: 1500 },
    { currency: 'BRL', minBalance: 0, alertThreshold: 10000 },
  ];
}

export async function ensureTreasuryLimits() {
  const existing = await prisma.treasuryLimit.findMany({ select: { currency: true } });
  const have = new Set(existing.map((e) => e.currency.toUpperCase()));

  for (const d of getDefaults()) {
    if (have.has(d.currency)) continue;
    await prisma.treasuryLimit.create({
      data: {
        currency: d.currency,
        minBalance: new Prisma.Decimal(d.minBalance),
        alertThreshold: new Prisma.Decimal(d.alertThreshold),
      },
    });
  }
}

function getAlertDedupeMinutes() {
  const raw = process.env.TREASURY_ALERT_DEDUPE_MINUTES;
  const n = raw ? Number(raw) : 15;
  const minutes = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 15;
  return Math.min(minutes, 24 * 60);
}

export async function runTreasuryCheck() {
  await ensureTreasuryLimits();

  const totals = await prisma.fiatBalance.groupBy({
    by: ['currency'],
    _sum: { amount: true },
  });

  const limits = await prisma.treasuryLimit.findMany();
  const totalsByCurrency = new Map<string, Prisma.Decimal>();
  for (const t of totals) {
    totalsByCurrency.set(t.currency.toUpperCase(), t._sum.amount || new Prisma.Decimal(0));
  }

  const alerts: Array<{ currency: string; balance: string; minBalance: string; alertThreshold: string; criticalThreshold: string | null; level: 'WARNING' | 'CRITICAL' }> = [];

  for (const limit of limits) {
    const currency = limit.currency.toUpperCase();
    const total = totalsByCurrency.get(currency) || new Prisma.Decimal(0);
    if (!total.lessThan(limit.alertThreshold)) continue;

    const level: 'WARNING' | 'CRITICAL' =
      limit.criticalThreshold && total.lessThan(limit.criticalThreshold) ? 'CRITICAL' : 'WARNING';

    const criticalThreshold = limit.criticalThreshold ? limit.criticalThreshold.toFixed(2) : null;

    alerts.push({
      currency,
      balance: total.toFixed(2),
      minBalance: limit.minBalance.toFixed(2),
      alertThreshold: limit.alertThreshold.toFixed(2),
      criticalThreshold,
      level,
    });

    const dedupeMinutes = getAlertDedupeMinutes();
    const shouldDedupe =
      limit.lastAlertLevel === level &&
      !!limit.lastAlertAt &&
      Date.now() - limit.lastAlertAt.getTime() < dedupeMinutes * 60 * 1000;

    if (shouldDedupe) continue;

    const now = new Date();
    await prisma.auditLog.create({
      data: {
        action: 'TREASURY_ALERT',
        userId: null,
        status: level,
        metadata: {
          actor: 'system',
          currency,
          balance: total.toString(),
          total: total.toString(),
          minBalance: limit.minBalance.toString(),
          alertThreshold: limit.alertThreshold.toString(),
          criticalThreshold: limit.criticalThreshold?.toString() || null,
          level,
          dedupeMinutes,
        },
      },
    });

    await prisma.treasuryLimit.update({
      where: { id: limit.id },
      data: {
        lastAlertLevel: level,
        lastAlertAt: now,
      },
    });
  }

  return { checked: limits.length, alerts };
}
