import { prisma } from '@/lib/db';
import { alertService } from '@/lib/services/alert';
import { PartnerBreakerState, PartnerName } from '@prisma/client';

export class PartnerTemporarilyUnavailableError extends Error {
  code = 'PARTNER_TEMPORARILY_UNAVAILABLE' as const;
  constructor() {
    super('PARTNER_TEMPORARILY_UNAVAILABLE');
  }
}

function isBreakerEnabled() {
  if (process.env.PARTNER_BREAKER_ENABLED === 'false') return false;
  if (process.env.DISABLE_EXTERNAL_SERVICES === 'true') return false;
  return true;
}

function getWindowSeconds() {
  const raw = process.env.PARTNER_BREAKER_WINDOW_SECONDS;
  const n = raw ? Number(raw) : 10 * 60;
  const seconds = Number.isFinite(n) && n > 0 ? Math.floor(n) : 10 * 60;
  return Math.min(Math.max(seconds, 30), 6 * 60 * 60);
}

function getWarnRate() {
  const raw = process.env.PARTNER_BREAKER_ERROR_RATE_WARN;
  const n = raw ? Number(raw) : 0.2;
  const rate = Number.isFinite(n) && n >= 0 ? n : 0.2;
  return Math.min(Math.max(rate, 0), 1);
}

function getOpenRate() {
  const raw = process.env.PARTNER_BREAKER_ERROR_RATE_OPEN;
  const n = raw ? Number(raw) : 0.5;
  const rate = Number.isFinite(n) && n >= 0 ? n : 0.5;
  return Math.min(Math.max(rate, 0), 1);
}

function getMinSamples() {
  return 10;
}

function getHalfOpenProbeCooldownSeconds() {
  return 30;
}

function nowMs(now?: Date) {
  return (now || new Date()).getTime();
}

function asPartnerName(partner: 'stripe' | 'polygon' | 'etherfi'): PartnerName {
  if (partner === 'stripe') return 'STRIPE';
  if (partner === 'polygon') return 'POLYGON';
  return 'ETHERFI';
}

function partnerKey(partner: PartnerName) {
  if (partner === 'STRIPE') return 'stripe';
  if (partner === 'POLYGON') return 'polygon';
  return 'etherfi';
}

async function ensureState(partner: PartnerName) {
  const existing = await prisma.partnerCircuitState.findUnique({ where: { partner } });
  if (existing) return existing;
  return prisma.partnerCircuitState.create({
    data: {
      partner,
      state: 'CLOSED',
      lastStateChangeAt: new Date(),
    },
  });
}

async function transitionState(partner: PartnerName, next: PartnerBreakerState, now: Date, meta: Record<string, any>) {
  const prev = await ensureState(partner);
  if (prev.state === next) return prev;

  const updated = await prisma.partnerCircuitState.update({
    where: { partner },
    data: {
      state: next,
      openedAt: next === 'OPEN' ? now : prev.openedAt,
      halfOpenedAt: next === 'HALF_OPEN' ? now : prev.halfOpenedAt,
      lastStateChangeAt: now,
    },
  });

  if (next === 'OPEN') {
    await prisma.partnerCircuitEvent.create({
      data: { partner, eventType: 'STATE_CHANGE', success: false, errorKind: 'OPEN' },
    });
    await prisma.auditLog.create({
      data: {
        userId: null,
        action: 'PARTNER_OUTAGE',
        status: 'OPEN',
        metadata: { partner: partnerKey(partner), state: 'OPEN', ...meta },
      },
    });

    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const openCount24h = await prisma.partnerCircuitEvent.count({
      where: { partner, eventType: 'STATE_CHANGE', errorKind: 'OPEN', createdAt: { gte: since } },
    });

    if (openCount24h > 3) {
      await prisma.auditLog.create({
        data: {
          userId: null,
          action: 'PARTNER_OUTAGE_FREQUENT',
          status: 'CRITICAL',
          metadata: { partner: partnerKey(partner), openCount24h },
        },
      });
      await alertService
        .notify({
          title: 'Partner circuit breaker flapping',
          message: `Circuit breaker opened more than 3 times in 24h for partner=${partnerKey(partner)}.`,
          severity: 'CRITICAL',
          source: 'PARTNER_BREAKER',
          metadata: { partner: partnerKey(partner), openCount24h },
          channels: ['ALL'],
        })
        .catch(() => {});
    }
  }

  return updated;
}

async function isBlockedByState(partner: PartnerName, now: Date) {
  const state = await ensureState(partner);
  const windowSeconds = getWindowSeconds();
  const probeCooldown = getHalfOpenProbeCooldownSeconds();

  if (state.state === 'OPEN') {
    const openedAtMs = state.openedAt ? state.openedAt.getTime() : 0;
    if (openedAtMs && now.getTime() - openedAtMs >= windowSeconds * 1000) {
      await transitionState(partner, 'HALF_OPEN', now, { reason: 'OPEN_COOLDOWN_ELAPSED' });
      return { blocked: false as const, state: 'HALF_OPEN' as const };
    }
    return { blocked: true as const, state: 'OPEN' as const };
  }

  if (state.state === 'HALF_OPEN') {
    const lastProbeMs = state.lastProbeAt ? state.lastProbeAt.getTime() : 0;
    if (lastProbeMs && now.getTime() - lastProbeMs < probeCooldown * 1000) {
      return { blocked: true as const, state: 'HALF_OPEN' as const };
    }
    await prisma.partnerCircuitState.update({
      where: { partner },
      data: { lastProbeAt: now },
    });
    return { blocked: false as const, state: 'HALF_OPEN' as const };
  }

  return { blocked: false as const, state: 'CLOSED' as const };
}

async function evaluateWindow(partner: PartnerName, now: Date) {
  const windowSeconds = getWindowSeconds();
  const since = new Date(now.getTime() - windowSeconds * 1000);
  const events = await prisma.partnerCircuitEvent.findMany({
    where: { partner, eventType: 'CALL', createdAt: { gte: since } },
    select: { success: true },
  });

  const total = events.length;
  const errors = events.reduce((acc, e) => acc + (e.success ? 0 : 1), 0);
  const errorRate = total > 0 ? errors / total : 0;

  return { total, errors, errorRate, windowSeconds };
}

async function maybeUpdateBreakerStateAfterCall(partner: PartnerName, now: Date) {
  const { total, errors, errorRate, windowSeconds } = await evaluateWindow(partner, now);
  const openRate = getOpenRate();
  const warnRate = getWarnRate();
  const minSamples = getMinSamples();

  const state = await ensureState(partner);

  if (total < minSamples) return { ...state, metrics: { total, errors, errorRate, windowSeconds, openRate, warnRate, minSamples } };

  if (errorRate >= openRate) {
    await transitionState(partner, 'OPEN', now, { errorRate, total, errors, windowSeconds, openRate, warnRate });
  } else if (state.state === 'HALF_OPEN' && errorRate < warnRate) {
    await transitionState(partner, 'CLOSED', now, { errorRate, total, errors, windowSeconds, openRate, warnRate });
  }

  return { ...(await ensureState(partner)), metrics: { total, errors, errorRate, windowSeconds, openRate, warnRate, minSamples } };
}

async function recordCall(partner: PartnerName, success: boolean, errorKind: string | null) {
  await prisma.partnerCircuitEvent.create({
    data: {
      partner,
      eventType: 'CALL',
      success,
      errorKind: errorKind || null,
    },
  });
}

function errorKindFromUnknown(err: unknown) {
  const msg = String((err as any)?.message || err || '');
  if (/timeout/i.test(msg)) return 'TIMEOUT';
  if (/network/i.test(msg)) return 'NETWORK';
  if (/429/.test(msg)) return 'HTTP_429';
  if (/5\d\d/.test(msg)) return 'HTTP_5XX';
  return 'ERROR';
}

export async function callPartnerWithBreaker<T>(
  partner: 'stripe' | 'polygon' | 'etherfi',
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!isBreakerEnabled()) {
    return fn();
  }
  const p = asPartnerName(partner);
  const now = new Date();
  const guard = await isBlockedByState(p, now);
  if (guard.blocked) {
    await prisma.auditLog
      .create({
        data: {
          userId: null,
          action: 'PARTNER_CALL_BLOCKED',
          status: 'BLOCKED',
          metadata: { partner: partnerKey(p), state: guard.state, operation },
        },
      })
      .catch(() => {});
    throw new PartnerTemporarilyUnavailableError();
  }

  try {
    const out = await fn();
    await recordCall(p, true, null);
    await maybeUpdateBreakerStateAfterCall(p, new Date(nowMs(now)));
    if (guard.state === 'HALF_OPEN') {
      await transitionState(p, 'CLOSED', new Date(nowMs(now)), { reason: 'HALF_OPEN_SUCCESS', operation });
    }
    return out;
  } catch (err) {
    const kind = errorKindFromUnknown(err);
    await recordCall(p, false, kind);
    await maybeUpdateBreakerStateAfterCall(p, new Date(nowMs(now)));
    if (guard.state === 'HALF_OPEN') {
      await transitionState(p, 'OPEN', new Date(nowMs(now)), { reason: 'HALF_OPEN_FAILURE', operation, errorKind: kind });
    }
    throw err;
  }
}
