import { applyFiatMovement } from '@/lib/services/fiat-ledger';
import { getFxRate } from '@/lib/services/fx-engine';

type FiatBalanceRow = { currency: string; amount: { toNumber: () => number } };

export async function coverFiatSpend(
  tx: any,
  userId: string,
  spendCurrency: string,
  amount: number,
  baseCurrency: string,
) {
  let remaining = amount;
  const fxSteps: Array<{
    from: string;
    to: string;
    rateMid: number;
    rateApplied: number;
    spreadBps: number;
    quoteAmount: number;
    baseAmount: number;
  }> = [];

  try {
    await applyFiatMovement(tx, userId, spendCurrency, -remaining);
    return { remaining: 0, fxSteps };
  } catch (e: any) {
    if (e?.message === 'INSUFFICIENT_FUNDS') {
      const bal = await tx.fiatBalance.findUnique({
        where: { userId_currency: { userId, currency: spendCurrency } },
      });
      const availableSpend = bal ? bal.amount.toNumber() : 0;
      const spendTaken = Math.max(Math.floor(availableSpend * 100) / 100, 0);
      if (spendTaken > 0) {
        await applyFiatMovement(tx, userId, spendCurrency, -spendTaken);
        remaining = remaining - spendTaken;
      }
    } else if (e?.message === 'BALANCE_NOT_FOUND') {
    } else {
      throw e;
    }
  }

  if (remaining <= 0) return { remaining: 0, fxSteps };

  const balances: FiatBalanceRow[] = await tx.fiatBalance.findMany({
    where: { userId, currency: { not: spendCurrency } },
    select: { currency: true, amount: true },
  });

  const candidates = await Promise.all(
    balances
      .map(async (b) => {
        const baseAvailable = Math.floor((b.amount?.toNumber?.() || 0) * 100) / 100;
        if (baseAvailable <= 0) return null;
        const fx = await getFxRate(b.currency, spendCurrency);
        const value = baseAvailable * fx.rateApplied;
        if (!Number.isFinite(value) || value <= 0) return null;
        return {
          currency: b.currency,
          baseAvailable,
          fx,
          value,
          baseFirst: b.currency.toUpperCase() === baseCurrency.toUpperCase(),
        };
      })
      .filter(Boolean) as any,
  );

  candidates.sort((a: any, b: any) => {
    if (a.baseFirst !== b.baseFirst) return a.baseFirst ? -1 : 1;
    return b.value - a.value;
  });

  for (const c of candidates) {
    if (remaining <= 0) break;

    const quoteTarget = Math.min(remaining, c.value);
    const baseNeededRaw = quoteTarget / c.fx.rateApplied;
    const baseNeededCeil = Math.ceil(baseNeededRaw * 100) / 100;
    const baseToUse = Math.min(c.baseAvailable, baseNeededCeil);
    if (baseToUse <= 0) continue;

    const quoteCovered = baseToUse * c.fx.rateApplied;

    try {
      await applyFiatMovement(tx, userId, c.currency, -baseToUse);
    } catch (e: any) {
      continue;
    }

    remaining = Math.max(remaining - quoteCovered, 0);

    fxSteps.push({
      from: c.currency,
      to: spendCurrency,
      rateMid: c.fx.rateMid,
      rateApplied: c.fx.rateApplied,
      spreadBps: c.fx.spreadBps,
      quoteAmount: quoteCovered,
      baseAmount: baseToUse,
    });
  }

  return { remaining, fxSteps };
}

