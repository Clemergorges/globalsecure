import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type FxPair = { base: string; quote: string };

const FALLBACK_RATES: Record<string, number> = {
  'EUR:USD': 1.05,
  'USD:EUR': 0.95,
  'EUR:BRL': 6.0,
  'BRL:EUR': 0.16,
  'EUR:GBP': 0.85,
  'GBP:EUR': 1.18,
  'USD:GBP': 0.8,
  'GBP:USD': 1.25,
  'USD:BRL': 5.5,
  'BRL:USD': 0.18,
};

function norm(c: string) {
  return c.trim().toUpperCase();
}

function getDefaultSpreadBps() {
  const raw = process.env.FX_SPREAD_BPS;
  const n = raw ? Number(raw) : 75;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 75;
}

function getMaxAgeMs() {
  const raw = process.env.FX_MAX_AGE_SECONDS;
  const n = raw ? Number(raw) : 900;
  const s = Number.isFinite(n) && n > 0 ? n : 900;
  return s * 1000;
}

export function getDefaultFxPairs(): FxPair[] {
  return [{ base: 'USD', quote: 'EUR' }, { base: 'EUR', quote: 'USD' }];
}

export function getConfiguredFxPairs(): FxPair[] {
  const raw = process.env.FX_PAIRS || '';
  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [base, quote] = pair.split(':').map((p) => (p || '').trim());
      return { base: norm(base), quote: norm(quote) };
    })
    .filter((p) => p.base && p.quote && p.base !== p.quote);

  if (parsed.length > 0) return parsed;
  return getDefaultFxPairs();
}

export async function enqueueFxRefreshIfNeeded() {
  const recent = await prisma.job.findFirst({
    where: {
      type: 'REFRESH_FX_RATES',
      status: { in: ['PENDING', 'PROCESSING'] },
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
    },
    select: { id: true },
  });
  if (recent) return;

  await prisma.job.create({
    data: {
      type: 'REFRESH_FX_RATES',
      payload: { pairs: getConfiguredFxPairs() },
      status: 'PENDING',
      runAt: new Date(),
    },
  });
}

export async function getFxRate(base: string, quote: string) {
  const b = norm(base);
  const q = norm(quote);
  if (b === q) {
    return { base: b, quote: q, rateMid: 1, rateApplied: 1, spreadBps: 0, source: 'CACHE', fetchedAt: new Date(0) };
  }

  const row = await prisma.fxRate.findUnique({
    where: { baseCurrency_quoteCurrency: { baseCurrency: b, quoteCurrency: q } },
  });

  if (!row) {
    await enqueueFxRefreshIfNeeded();
    const fallback = FALLBACK_RATES[`${b}:${q}`];
    const mid = fallback ?? 1;
    const spreadBps = getDefaultSpreadBps();
    const applied = mid * (1 - spreadBps / 10000);
    return { base: b, quote: q, rateMid: mid, rateApplied: applied, spreadBps, source: 'MANUAL_FALLBACK', fetchedAt: new Date(0) };
  }

  const mid = row.rate.toNumber();
  const spreadBps = row.spreadBps ?? 0;
  const applied = mid * (1 - spreadBps / 10000);

  const age = Date.now() - row.fetchedAt.getTime();
  if (age > getMaxAgeMs()) {
    await enqueueFxRefreshIfNeeded();
  }

  return { base: b, quote: q, rateMid: mid, rateApplied: applied, spreadBps, source: row.source, fetchedAt: row.fetchedAt };
}

async function fetchFrankfurter(base: string, quotes: string[]) {
  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(quotes.join(','))}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`FRANKFURTER_HTTP_${res.status}`);
  const data = await res.json();
  const rates: Record<string, number> = data?.rates || {};
  return rates;
}

async function fetchExchangeRateHost(base: string, quotes: string[]) {
  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(quotes.join(','))}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`EXCHANGERATE_HOST_HTTP_${res.status}`);
  const data = await res.json();
  const rates: Record<string, number> = data?.rates || {};
  return rates;
}

export async function refreshFxRates(pairs: FxPair[]) {
  const normalized: FxPair[] = pairs.map((p) => ({ base: norm(p.base), quote: norm(p.quote) })).filter((p) => p.base !== p.quote);
  const byBase = new Map<string, Set<string>>();
  for (const p of normalized) {
    const set = byBase.get(p.base) || new Set<string>();
    set.add(p.quote);
    byBase.set(p.base, set);
  }

  const spreadBps = getDefaultSpreadBps();
  const fetchedAt = new Date();

  for (const [base, quotesSet] of byBase.entries()) {
    const quotes = Array.from(quotesSet);
    let rates: Record<string, number> | null = null;
    let source = 'FRANKFURTER';

    try {
      rates = await fetchFrankfurter(base, quotes);
    } catch {
      source = 'EXCHANGERATE_HOST';
      try {
        rates = await fetchExchangeRateHost(base, quotes);
      } catch {
        rates = null;
      }
    }

    if (!rates) continue;

    for (const quote of quotes) {
      const mid = rates[quote];
      if (!mid || !Number.isFinite(mid) || mid <= 0) continue;

      await prisma.fxRate.upsert({
        where: { baseCurrency_quoteCurrency: { baseCurrency: base, quoteCurrency: quote } },
        update: {
          rate: new Prisma.Decimal(mid),
          spreadBps,
          source,
          fetchedAt,
        },
        create: {
          baseCurrency: base,
          quoteCurrency: quote,
          rate: new Prisma.Decimal(mid),
          spreadBps,
          source,
          fetchedAt,
        },
      });

      await prisma.fxRateHistory.create({
        data: {
          fromCurrency: base,
          toCurrency: quote,
          rate: new Prisma.Decimal(mid),
          source,
        },
      });
    }
  }
}
