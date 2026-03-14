import { prisma } from '@/lib/db';
import { Prisma, RoutingRail, TransferStatus } from '@prisma/client';

export type MoneyPathStageStatus = 'DONE' | 'CURRENT' | 'UPCOMING';

export type MoneyPathStageKind =
  | 'ORIGIN'
  | 'SECURITY'
  | 'FX'
  | 'RAIL'
  | 'PARTNER'
  | 'DESTINATION';

export type MoneyPathTimelineStage = {
  kind: MoneyPathStageKind;
  status: MoneyPathStageStatus;
  at: string | null;
  data: Record<string, unknown>;
};

export type MoneyPathTimeline = {
  transfer: {
    id: string;
    status: TransferStatus;
    createdAt: string;
    completedAt: string | null;
    senderId: string;
    recipientId: string | null;
    recipientEmail: string;
    amountSent: string;
    currencySent: string;
    amountReceived: string;
    currencyReceived: string;
    exchangeRate: string;
    fee: string;
    feePercentage: string;
  };
  header: {
    transferCode: string;
    corridor: { originCountry: string | null; destinationCountry: string | null };
  };
  routing: {
    rail: RoutingRail | null;
    estimatedFeePct: string | null;
    estimatedFeeAmount: string | null;
    estimatedTimeSec: number | null;
    comparisons: Array<{ rail: RoutingRail; feePct: string; timeSec: number }>;
  };
  stages: MoneyPathTimelineStage[];
};

function transferCode(id: string) {
  return `GSS-${id.slice(0, 8).toUpperCase()}`;
}

function stageStatusForIndex(idx: number, currentIdx: number) {
  if (idx < currentIdx) return 'DONE' as const;
  if (idx === currentIdx) return 'CURRENT' as const;
  return 'UPCOMING' as const;
}

export async function buildMoneyPathTimeline(params: { userId: string; transferId: string }): Promise<MoneyPathTimeline> {
  const transfer = await prisma.transfer.findUnique({
    where: { id: params.transferId },
    include: { sender: { select: { country: true } }, recipient: { select: { country: true } }, logs: { orderBy: { createdAt: 'asc' } } },
  });

  if (!transfer) throw new Error('TRANSFER_NOT_FOUND');

  const canSee =
    transfer.senderId === params.userId ||
    transfer.recipientId === params.userId;
  if (!canSee) throw new Error('FORBIDDEN');

  const decision = await prisma.routingDecision.findFirst({
    where: { transferId: transfer.id },
    orderBy: { createdAt: 'desc' },
    select: { rail: true, estimatedFeePct: true, estimatedFeeAmount: true, estimatedTimeSec: true },
  });

  const comparisonsRaw = await prisma.routingDecision.findMany({
    where: { transferId: transfer.id },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { rail: true, estimatedFeePct: true, estimatedTimeSec: true },
  });

  const comparisons = comparisonsRaw
    .map((c) => ({ rail: c.rail, feePct: c.estimatedFeePct.toFixed(3), timeSec: c.estimatedTimeSec }))
    .filter((c, i, arr) => arr.findIndex((x) => x.rail === c.rail) === i);

  const originCountry = transfer.sender?.country || null;
  const destinationCountry = transfer.recipient?.country || null;
  const isFx = transfer.currencySent.toUpperCase() !== transfer.currencyReceived.toUpperCase();

  const baseStages: MoneyPathStageKind[] = ['ORIGIN', 'SECURITY', ...(isFx ? (['FX'] as const) : []), 'RAIL', 'PARTNER', 'DESTINATION'];

  const currentIdx = transfer.status === TransferStatus.COMPLETED ? baseStages.length : Math.min(baseStages.length - 1, 3);

  const createdAtIso = transfer.createdAt.toISOString();
  const completedAtIso = transfer.completedAt ? transfer.completedAt.toISOString() : null;

  const stageTimes: Array<string | null> = baseStages.map((_, idx) => {
    if (transfer.status === TransferStatus.COMPLETED) {
      if (idx === 0) return createdAtIso;
      if (idx === baseStages.length - 1) return completedAtIso;
      return null;
    }
    if (idx === 0) return createdAtIso;
    return null;
  });

  const stages: MoneyPathTimelineStage[] = baseStages.map((kind, idx) => {
    const status = transfer.status === TransferStatus.COMPLETED ? 'DONE' : stageStatusForIndex(idx, currentIdx);
    const at = stageTimes[idx] || null;

    if (kind === 'ORIGIN') {
      return {
        kind,
        status,
        at,
        data: {
          originCountry,
          source: { currency: transfer.currencySent, amount: transfer.amountSent.toFixed(2) },
          entryFee: { amount: '0.00', currency: transfer.currencySent, mode: 'DEMO' },
        },
      };
    }

    if (kind === 'SECURITY') {
      return {
        kind,
        status,
        at,
        data: {
          kyc: { tier: null, status: null },
          aml: { passed: transfer.amlCheckPassed, rulesEvaluated: 37, mode: 'DEMO' },
        },
      };
    }

    if (kind === 'FX') {
      return {
        kind,
        status,
        at,
        data: {
          pair: { from: transfer.currencySent, to: transfer.currencyReceived },
          rate: transfer.exchangeRate.toFixed(6),
          gssFeePct: transfer.feePercentage.toFixed(2),
          gssFeeAmount: transfer.fee.toFixed(2),
          after: { amount: transfer.amountReceived.toFixed(2), currency: transfer.currencyReceived },
        },
      };
    }

    if (kind === 'RAIL') {
      return {
        kind,
        status,
        at,
        data: {
          rail: decision?.rail || null,
          estimated: decision
            ? {
                feePct: decision.estimatedFeePct.toFixed(3),
                feeAmount: decision.estimatedFeeAmount.toFixed(6),
                timeSec: decision.estimatedTimeSec,
              }
            : null,
          badge: { kind: 'AI_DEMO' },
        },
      };
    }

    if (kind === 'PARTNER') {
      const rail = decision?.rail || null;
      const partner =
        rail === RoutingRail.CRYPTO_POLYGON ? { kind: 'POLYGON', name: 'Polygon' } :
        rail === RoutingRail.FIAT_STUB ? { kind: 'FIAT_NETWORK', name: 'SEPA/PIX' } :
        { kind: 'LEDGER', name: 'GSS' };
      return {
        kind,
        status,
        at,
        data: {
          partner,
          destinationCountry,
        },
      };
    }

    return {
      kind: 'DESTINATION',
      status,
      at,
      data: {
        destinationCountry,
        final: { currency: transfer.currencyReceived, amount: transfer.amountReceived.toFixed(2) },
        summary: {
          sent: { currency: transfer.currencySent, amount: transfer.amountSent.toFixed(2) },
          fee: { currency: transfer.currencySent, amount: transfer.fee.toFixed(2), pct: transfer.feePercentage.toFixed(2) },
        },
      },
    };
  });

  return {
    transfer: {
      id: transfer.id,
      status: transfer.status,
      createdAt: createdAtIso,
      completedAt: completedAtIso,
      senderId: transfer.senderId,
      recipientId: transfer.recipientId,
      recipientEmail: transfer.recipientEmail,
      amountSent: transfer.amountSent.toFixed(2),
      currencySent: transfer.currencySent,
      amountReceived: transfer.amountReceived.toFixed(2),
      currencyReceived: transfer.currencyReceived,
      exchangeRate: transfer.exchangeRate.toFixed(6),
      fee: transfer.fee.toFixed(2),
      feePercentage: transfer.feePercentage.toFixed(2),
    },
    header: {
      transferCode: transferCode(transfer.id),
      corridor: { originCountry, destinationCountry },
    },
    routing: {
      rail: decision?.rail || null,
      estimatedFeePct: decision ? decision.estimatedFeePct.toFixed(3) : null,
      estimatedFeeAmount: decision ? decision.estimatedFeeAmount.toFixed(6) : null,
      estimatedTimeSec: decision ? decision.estimatedTimeSec : null,
      comparisons,
    },
    stages,
  };
}

