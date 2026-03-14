import { Prisma, RoutingRail } from '@prisma/client';
import { prisma } from '@/lib/db';

function parseNumber(raw: string | undefined) {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function percentEnv(name: string, fallbackPct: number) {
  const v = parseNumber(process.env[name]);
  if (v === null) return fallbackPct;
  return clamp(v, 0, 100);
}

function usdEnv(name: string, fallbackUsd: number) {
  const v = parseNumber(process.env[name]);
  if (v === null) return fallbackUsd;
  return Math.max(v, 0);
}

export type RoutingInput = {
  userId: string;
  originCountry?: string | null;
  destinationCountry?: string | null;
  amount: Prisma.Decimal;
  currencySource: string;
  currencyTarget: string;
  transferId?: string | null;
};

export type RoutingCandidate = {
  rail: RoutingRail;
  estimatedFeePct: Prisma.Decimal;
  estimatedFeeAmount: Prisma.Decimal;
  estimatedTimeSec: number;
  explanation: Prisma.InputJsonObject;
};

export type RoutingDecisionResult = {
  chosen: RoutingCandidate;
  candidates: RoutingCandidate[];
  id: string;
};

function estimateFees(params: {
  amount: Prisma.Decimal;
  feePct: number;
  fixedUsd: number;
}) {
  const pct = new Prisma.Decimal(params.feePct).div(100);
  const pctFee = params.amount.mul(pct);
  const fixed = new Prisma.Decimal(params.fixedUsd);
  const total = pctFee.add(fixed);
  const totalPct = total.div(params.amount).mul(100);
  return { total, totalPct };
}

function scoreCandidate(c: RoutingCandidate) {
  const cost = c.estimatedFeePct.toNumber();
  const time = c.estimatedTimeSec;
  return cost * 0.7 + (time / 3600) * 0.3;
}

export function buildRoutingCandidates(input: RoutingInput): RoutingCandidate[] {
  const remFeePct = percentEnv('REM_FEE_PERCENT_DEFAULT', 1.8);
  const fxSpreadPct = percentEnv('FX_SPREAD_PERCENT_DEFAULT', 0.75);
  const swapSpreadPct = percentEnv('SWAP_SPREAD_PERCENT_DEFAULT', 0.8);
  const polygonGasUsd = usdEnv('POLYGON_TX_GAS_ESTIMATE_USD', 0.06);
  const fiatPayoutPct = percentEnv('FIAT_PAYOUT_FEE_PERCENT_DEMO', 0.3);
  const fiatPayoutFixedUsd = usdEnv('FIAT_PAYOUT_FEE_FIXED_USD_DEMO', 0.25);
  const onRampPct = percentEnv('CRYPTO_ONRAMP_FEE_PERCENT_DEMO', 0.6);
  const offRampPct = percentEnv('CRYPTO_OFFRAMP_FEE_PERCENT_DEMO', 0.6);
  const offRampFixedUsd = usdEnv('CRYPTO_OFFRAMP_FEE_FIXED_USD_DEMO', 0.35);

  const amount = input.amount;
  const isCrossCurrency = input.currencySource.toUpperCase() !== input.currencyTarget.toUpperCase();

  const ledger = estimateFees({
    amount,
    feePct: remFeePct + (isCrossCurrency ? fxSpreadPct : 0),
    fixedUsd: 0,
  });

  const fiatStub = estimateFees({
    amount,
    feePct: remFeePct + (isCrossCurrency ? fxSpreadPct : 0) + fiatPayoutPct,
    fixedUsd: fiatPayoutFixedUsd,
  });

  const crypto = estimateFees({
    amount,
    feePct: remFeePct + (isCrossCurrency ? fxSpreadPct : 0) + onRampPct + offRampPct,
    fixedUsd: polygonGasUsd + offRampFixedUsd,
  });

  const swap = estimateFees({
    amount,
    feePct: swapSpreadPct,
    fixedUsd: 0,
  });

  const candidates: RoutingCandidate[] = [
    {
      rail: RoutingRail.LEDGER_INTERNAL,
      estimatedFeePct: ledger.totalPct,
      estimatedFeeAmount: ledger.total,
      estimatedTimeSec: 8,
      explanation: {
        model: 'demo',
        components: { remittanceFeePct: remFeePct, fxSpreadPct: isCrossCurrency ? fxSpreadPct : 0 },
      },
    },
    {
      rail: RoutingRail.FIAT_STUB,
      estimatedFeePct: fiatStub.totalPct,
      estimatedFeeAmount: fiatStub.total,
      estimatedTimeSec: 2 * 24 * 60 * 60,
      explanation: {
        model: 'demo',
        components: { remittanceFeePct: remFeePct, fxSpreadPct: isCrossCurrency ? fxSpreadPct : 0, payoutFeePct: fiatPayoutPct, payoutFeeFixedUsd: fiatPayoutFixedUsd },
      },
    },
    {
      rail: RoutingRail.CRYPTO_POLYGON,
      estimatedFeePct: crypto.totalPct,
      estimatedFeeAmount: crypto.total,
      estimatedTimeSec: 120,
      explanation: {
        model: 'demo',
        components: { remittanceFeePct: remFeePct, fxSpreadPct: isCrossCurrency ? fxSpreadPct : 0, onRampFeePct: onRampPct, offRampFeePct: offRampPct, polygonGasUsd, offRampFixedUsd },
      },
    },
  ];

  const cSrc = input.currencySource.toUpperCase();
  const cDst = input.currencyTarget.toUpperCase();
  if ((cSrc === 'USDT' || cSrc === 'USD') && (cDst === 'USDT' || cDst === 'USD') && cSrc !== cDst) {
    candidates.push({
      rail: RoutingRail.LEDGER_INTERNAL,
      estimatedFeePct: swap.totalPct,
      estimatedFeeAmount: swap.total,
      estimatedTimeSec: 10,
      explanation: { model: 'demo', kind: 'internal_swap', components: { swapSpreadPct } },
    });
  }

  return candidates;
}

export async function decideAndPersistRoute(input: RoutingInput): Promise<RoutingDecisionResult> {
  const candidates = buildRoutingCandidates(input).sort((a, b) => scoreCandidate(a) - scoreCandidate(b));
  const chosen = candidates[0];
  const explanation: Prisma.InputJsonValue = {
    chosen: chosen.explanation,
    candidates: candidates.map((c) => ({ rail: c.rail, ...c.explanation })),
  };
  const row = await prisma.routingDecision.create({
    data: {
      userId: input.userId,
      transferId: input.transferId || null,
      originCountry: input.originCountry || null,
      destinationCountry: input.destinationCountry || null,
      amount: input.amount,
      currencySource: input.currencySource.toUpperCase(),
      currencyTarget: input.currencyTarget.toUpperCase(),
      rail: chosen.rail,
      estimatedFeePct: chosen.estimatedFeePct,
      estimatedFeeAmount: chosen.estimatedFeeAmount,
      estimatedTimeSec: chosen.estimatedTimeSec,
      explanation,
    },
    select: { id: true },
  });

  return { id: row.id, chosen, candidates };
}
