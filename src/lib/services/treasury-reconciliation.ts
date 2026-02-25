import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type DbClient = Prisma.TransactionClient | typeof prisma;

function numEnv(name: string, fallback: number) {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return raw;
}

function pctEnv(name: string, fallback: number) {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw) || raw < 0) return fallback;
  return raw;
}

function asCurrency(c: string) {
  return c.trim().toUpperCase();
}

export type TreasuryReconciliationRow = {
  currency: string;
  internalTotal: string;
  externalTotal: string | null;
  delta: string | null;
  divergencePct: number | null;
  providers: string[];
  snapshotCutoffIso: string;
};

export type TreasuryReconciliationResult = {
  nowIso: string;
  snapshotCutoffIso: string;
  internalTotals: Array<{ currency: string; total: string }>;
  externalTotals: Array<{ currency: string; total: string; providers: string[] }>;
  rows: TreasuryReconciliationRow[];
  alerts: Array<{ currency: string; level: 'WARNING' | 'CRITICAL'; divergencePct: number; delta: string }>;
};

export async function createTreasurySnapshot(params: {
  provider: string;
  currency: string;
  balance: number;
  accountRef?: string | null;
  capturedAt?: Date | null;
  metadata?: any;
}) {
  const provider = params.provider.trim();
  const currency = asCurrency(params.currency);
  const balance = new Prisma.Decimal(Number(params.balance));

  return prisma.treasurySnapshot.create({
    data: {
      provider,
      currency,
      balance,
      accountRef: params.accountRef || null,
      capturedAt: params.capturedAt || undefined,
      metadata: params.metadata || undefined,
    },
  });
}

export async function runTreasuryReconciliation(options?: {
  now?: Date;
  snapshotMaxAgeMinutes?: number;
  warnPct?: number;
  critPct?: number;
  providers?: string[];
  emitAudit?: boolean;
}) {
  const now = options?.now ?? new Date();
  const snapshotMaxAgeMinutes = options?.snapshotMaxAgeMinutes ?? numEnv('TREASURY_SNAPSHOT_MAX_AGE_MIN', 180);
  const warnPct = options?.warnPct ?? pctEnv('TREASURY_DIVERGENCE_WARN_PCT', 1);
  const critPct = options?.critPct ?? pctEnv('TREASURY_DIVERGENCE_CRIT_PCT', 2);
  const emitAudit = options?.emitAudit ?? true;

  const cutoff = new Date(now.getTime() - snapshotMaxAgeMinutes * 60 * 1000);
  const providerAllow = options?.providers?.length ? new Set(options.providers.map((p) => p.trim())) : null;

  const result = await prisma.$transaction(async (tx) => {
    return reconcileWithinTx(tx, {
      now,
      cutoff,
      warnPct,
      critPct,
      providerAllow,
      emitAudit,
    });
  });

  return result;
}

async function reconcileWithinTx(
  tx: DbClient,
  params: {
    now: Date;
    cutoff: Date;
    warnPct: number;
    critPct: number;
    providerAllow: Set<string> | null;
    emitAudit: boolean;
  }
): Promise<TreasuryReconciliationResult> {
  const totals = await tx.fiatBalance.groupBy({
    by: ['currency'],
    _sum: { amount: true },
  });

  const internalByCurrency = new Map<string, Prisma.Decimal>();
  for (const t of totals) {
    internalByCurrency.set(asCurrency(t.currency), t._sum.amount || new Prisma.Decimal(0));
  }

  const snapshots = await tx.treasurySnapshot.findMany({
    where: { capturedAt: { gte: params.cutoff } },
    distinct: ['provider', 'currency'],
    orderBy: [{ provider: 'asc' }, { currency: 'asc' }, { capturedAt: 'desc' }],
    select: { provider: true, currency: true, balance: true, capturedAt: true },
  });

  const externalByCurrency = new Map<string, { total: Prisma.Decimal; providers: Set<string> }>();
  for (const s of snapshots) {
    const provider = s.provider.trim();
    if (params.providerAllow && !params.providerAllow.has(provider)) continue;
    const currency = asCurrency(s.currency);

    const existing = externalByCurrency.get(currency) || { total: new Prisma.Decimal(0), providers: new Set<string>() };
    externalByCurrency.set(currency, {
      total: existing.total.add(s.balance || new Prisma.Decimal(0)),
      providers: new Set([...existing.providers, provider]),
    });
  }

  const currencies = new Set<string>([...internalByCurrency.keys(), ...externalByCurrency.keys()]);
  const rows: TreasuryReconciliationRow[] = [];
  const alerts: Array<{ currency: string; level: 'WARNING' | 'CRITICAL'; divergencePct: number; delta: string }> = [];

  for (const currency of Array.from(currencies).sort()) {
    const internal = internalByCurrency.get(currency) || new Prisma.Decimal(0);
    const external = externalByCurrency.get(currency) || null;
    const externalTotal = external ? external.total : null;
    const delta = externalTotal ? internal.sub(externalTotal) : null;
    const divergencePct =
      externalTotal && !externalTotal.isZero()
        ? Math.abs(delta!.toNumber()) / Math.max(externalTotal.toNumber(), 1) * 100
        : null;

    const providers = external ? Array.from(external.providers).sort() : [];

    rows.push({
      currency,
      internalTotal: internal.toFixed(2),
      externalTotal: externalTotal ? externalTotal.toFixed(2) : null,
      delta: delta ? delta.toFixed(2) : null,
      divergencePct: divergencePct !== null ? Number(divergencePct.toFixed(4)) : null,
      providers,
      snapshotCutoffIso: params.cutoff.toISOString(),
    });

    if (params.emitAudit) {
      if (!externalTotal && internal.toNumber() !== 0) {
        await tx.auditLog.create({
          data: {
            action: 'TREASURY_RECONCILIATION_MISSING',
            userId: null,
            status: 'WARNING',
            metadata: {
              currency,
              internalTotal: internal.toString(),
              snapshotCutoffIso: params.cutoff.toISOString(),
              nowIso: params.now.toISOString(),
            },
          },
        });
      }

      if (divergencePct !== null && divergencePct >= params.warnPct) {
        const level: 'WARNING' | 'CRITICAL' = divergencePct >= params.critPct ? 'CRITICAL' : 'WARNING';
        const d = delta!.toFixed(2);
        alerts.push({ currency, level, divergencePct: Number(divergencePct.toFixed(4)), delta: d });
        await tx.auditLog.create({
          data: {
            action: 'TREASURY_RECONCILIATION_DIVERGENCE',
            userId: null,
            status: level,
            metadata: {
              currency,
              internalTotal: internal.toString(),
              externalTotal: externalTotal!.toString(),
              delta: delta!.toString(),
              divergencePct,
              providers,
              snapshotCutoffIso: params.cutoff.toISOString(),
              nowIso: params.now.toISOString(),
              severity: 'HIGH',
            },
          },
        });
      }
    }
  }

  if (params.emitAudit) {
    await tx.auditLog.create({
      data: {
        action: 'TREASURY_RECONCILIATION',
        userId: null,
        status: 'OK',
        metadata: {
          nowIso: params.now.toISOString(),
          snapshotCutoffIso: params.cutoff.toISOString(),
          currencies: rows.length,
          alerts: alerts.length,
        },
      },
    });
  }

  return {
    nowIso: params.now.toISOString(),
    snapshotCutoffIso: params.cutoff.toISOString(),
    internalTotals: Array.from(internalByCurrency.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, total]) => ({ currency, total: total.toFixed(2) })),
    externalTotals: Array.from(externalByCurrency.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, v]) => ({ currency, total: v.total.toFixed(2), providers: Array.from(v.providers).sort() })),
    rows,
    alerts,
  };
}

