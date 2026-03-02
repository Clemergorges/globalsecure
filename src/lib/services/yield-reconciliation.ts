import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getExchangeRate } from '@/lib/services/exchange';
import { getEtherFiPositionSnapshot } from '@/lib/services/etherfiService';

export async function runEtherFiReconciliation(options?: { maxPositions?: number }) {
  const now = new Date();
  const maxPositions = options?.maxPositions && options.maxPositions > 0 ? options.maxPositions : 50;

  const transfers = await prisma.transfer.findMany({
    where: { yieldPositionId: { not: null }, canceledAt: null },
    orderBy: { createdAt: 'desc' },
    take: maxPositions,
    select: { id: true, senderId: true, yieldPositionId: true, amountSent: true, currencySent: true },
  });

  const currencies = Array.from(new Set(transfers.map((t) => t.currencySent.toUpperCase())));
  const usdRates = new Map<string, number>();
  for (const c of currencies) {
    if (c === 'USD') usdRates.set(c, 1);
    else usdRates.set(c, await getExchangeRate(c, 'USD'));
  }

  let processed = 0;
  let divergences = 0;

  for (const t of transfers) {
    const positionId = t.yieldPositionId!;
    const snapshot = await getEtherFiPositionSnapshot(positionId);
    const internalUsd = Number(t.amountSent) * (usdRates.get(t.currencySent.toUpperCase()) || 1);
    const externalUsd = Number(snapshot.valueUsd);
    const divergencePct = externalUsd > 0 ? (Math.abs(internalUsd - externalUsd) / Math.max(externalUsd, 1)) * 100 : 0;

    await prisma.$transaction(async (tx) => {
      await tx.transfer.update({
        where: { id: t.id },
        data: {
          yieldLastReconciledAt: now,
          yieldInternalValueUsd: new Prisma.Decimal(internalUsd),
          yieldExternalValueUsd: new Prisma.Decimal(externalUsd),
          yieldReconcileStatus: divergencePct > 2 ? 'RECONCILE_PENDING' : 'OK',
          yieldReconcilePendingAt: divergencePct > 2 ? now : null,
        },
      });

      if (divergencePct > 2) {
        divergences += 1;
        await tx.auditLog.create({
          data: {
            action: 'YIELD_DIVERGENCE',
            userId: null,
            status: 'CRITICAL',
            metadata: {
              transferId: t.id,
              userId: t.senderId,
              yieldPositionId: positionId,
              internalUsd,
              externalUsd,
              divergencePct,
              updatedAtIso: snapshot.updatedAtIso,
              severity: 'HIGH',
            },
          },
        });
      }
    });

    processed += 1;
  }

  await prisma.auditLog.create({
    data: {
      action: 'YIELD_RECONCILIATION',
      userId: null,
      status: 'OK',
      metadata: { processed, divergences, nowIso: now.toISOString() },
    },
  });

  return { processed, divergences };
}

