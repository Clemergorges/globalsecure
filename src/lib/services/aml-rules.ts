import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export type YieldSpendContext = {
  amountUsd: number;
  merchantCountry?: string | null;
  merchantCategory?: string | null;
  currency?: string | null;
};

function getSanctionedCountries(): Set<string> {
  const raw = process.env.AML_SANCTIONED_COUNTRIES || '';
  return new Set(
    raw
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean),
  );
}

export function isSanctionedCountry(countryCode?: string | null) {
  if (!countryCode) return false;
  return getSanctionedCountries().has(countryCode.toUpperCase());
}

function getSingleTxMaxUsd() {
  const raw = process.env.AML_SINGLE_TX_MAX_USD;
  const n = raw ? Number(raw) : 250;
  return Number.isFinite(n) && n > 0 ? n : 250;
}

function getDailyMaxUsd() {
  const raw = process.env.AML_DAILY_MAX_USD;
  const n = raw ? Number(raw) : 500;
  return Number.isFinite(n) && n > 0 ? n : 500;
}

export async function isHighRiskPattern(userId: string, ctx: YieldSpendContext) {
  if (ctx.amountUsd > getSingleTxMaxUsd()) return { hit: true, reason: 'SINGLE_TX_MAX' };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sum = await prisma.yieldLiability.aggregate({
    where: { userId, status: { in: ['PENDING_SETTLEMENT', 'SETTLED_READY'] }, createdAt: { gte: since } },
    _sum: { amountUsd: true },
  });
  const rolling = sum._sum.amountUsd?.toNumber() || 0;
  if (rolling + ctx.amountUsd > getDailyMaxUsd()) return { hit: true, reason: 'DAILY_MAX' };

  return { hit: false as const };
}

export async function checkAmlForYieldSpend(userId: string, ctx: YieldSpendContext) {
  if (isSanctionedCountry(ctx.merchantCountry)) {
    return { allowed: false as const, reason: 'SANCTIONED_COUNTRY' };
  }

  const risk = await isHighRiskPattern(userId, ctx);
  if (risk.hit) return { allowed: false as const, reason: risk.reason };

  return { allowed: true as const };
}

export type TransferAmlContext = {
  transferId?: string;
  transferType?: string;
  currencySent?: string;
  currencyReceived?: string;
  recipientEmail?: string | null;
  recipientId?: string | null;
  senderCountry?: string | null;
  recipientCountry?: string | null;
};

function getHighRiskCountries(): Set<string> {
  const raw = process.env.AML_HIGH_RISK_COUNTRIES || '';
  return new Set(
    raw
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean),
  );
}

function getVelocityMaxTx() {
  const raw = process.env.AML_VELOCITY_MAX_TX;
  const n = raw ? Number(raw) : 5;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function getVelocityWindowMinutes() {
  const raw = process.env.AML_VELOCITY_WINDOW_MINUTES;
  const n = raw ? Number(raw) : 10;
  const minutes = Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
  return Math.min(minutes, 24 * 60);
}

function getSlaHours(level: 'HIGH' | 'CRITICAL') {
  const raw = level === 'CRITICAL' ? process.env.AML_SLA_CRITICAL_HOURS : process.env.AML_SLA_HIGH_HOURS;
  const n = raw ? Number(raw) : level === 'CRITICAL' ? 4 : 24;
  const hours = Number.isFinite(n) && n > 0 ? n : level === 'CRITICAL' ? 4 : 24;
  return Math.min(hours, 24 * 7);
}

function computeSlaDueAt(level: 'HIGH' | 'CRITICAL', now = Date.now()) {
  const hours = getSlaHours(level);
  return new Date(now + hours * 60 * 60 * 1000);
}

async function ensureOpenCase(db: any, userId: string, data: { reason: string; riskLevel: 'HIGH' | 'CRITICAL'; contextJson: any; now?: Date }) {
  const existing = await db.amlReviewCase.findFirst({
    where: { userId, reason: data.reason, status: { in: ['PENDING', 'IN_REVIEW'] } },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) return { created: false as const, caseId: existing.id };

  const slaDueAt = computeSlaDueAt(data.riskLevel, data.now ? data.now.getTime() : Date.now());
  const created = await db.amlReviewCase.create({
    data: {
      userId,
      reason: data.reason,
      contextJson: data.contextJson,
      status: 'PENDING',
      riskLevel: data.riskLevel,
      riskScore: data.riskLevel === 'CRITICAL' ? 100 : 80,
      slaDueAt,
    },
    select: { id: true },
  });
  return { created: true as const, caseId: created.id };
}

export async function checkAndCreateAmlCasesForTransfer(
  db: Prisma.TransactionClient | typeof prisma,
  userId: string,
  ctx: TransferAmlContext,
  options?: { now?: Date; velocityCountBefore?: number },
) {
  const now = options?.now || new Date();
  const results: Array<{ reason: string; riskLevel: 'HIGH' | 'CRITICAL'; caseId: string; created: boolean }> = [];

  const highRiskCountries = getHighRiskCountries();
  const senderCountry = ctx.senderCountry?.toUpperCase() || null;
  const recipientCountry = ctx.recipientCountry?.toUpperCase() || null;
  const hitHighRisk = (senderCountry && highRiskCountries.has(senderCountry)) || (recipientCountry && highRiskCountries.has(recipientCountry));

  if (hitHighRisk) {
    const created = await ensureOpenCase(db, userId, {
      reason: 'HIGH_RISK_JURISDICTION',
      riskLevel: 'CRITICAL',
      contextJson: {
        rule: 'HIGH_RISK_JURISDICTION',
        senderCountry,
        recipientCountry,
        highRiskCountries: Array.from(highRiskCountries),
        transferId: ctx.transferId || null,
        transferType: ctx.transferType || null,
        currencySent: ctx.currencySent || null,
        currencyReceived: ctx.currencyReceived || null,
        recipientEmail: ctx.recipientEmail || null,
        recipientId: ctx.recipientId || null,
      },
      now,
    });
    results.push({ reason: 'HIGH_RISK_JURISDICTION', riskLevel: 'CRITICAL', caseId: created.caseId, created: created.created });
  }

  const windowMinutes = getVelocityWindowMinutes();
  const maxTx = getVelocityMaxTx();
  const since = new Date(now.getTime() - windowMinutes * 60 * 1000);

  const countBefore =
    typeof options?.velocityCountBefore === 'number'
      ? options.velocityCountBefore
      : await db.transfer.count({ where: { senderId: userId, createdAt: { gte: since } } });

  if (countBefore + 1 >= maxTx) {
    const created = await ensureOpenCase(db, userId, {
      reason: 'VELOCITY_TX_COUNT',
      riskLevel: 'HIGH',
      contextJson: {
        rule: 'VELOCITY_TX_COUNT',
        windowMinutes,
        maxTx,
        countBefore,
        countIncludingCurrent: countBefore + 1,
        transferId: ctx.transferId || null,
        currencySent: ctx.currencySent || null,
        currencyReceived: ctx.currencyReceived || null,
      },
      now,
    });
    results.push({ reason: 'VELOCITY_TX_COUNT', riskLevel: 'HIGH', caseId: created.caseId, created: created.created });
  }

  return { hits: results.length > 0, results };
}
