type ConsolidatedPriceResult = {
  price: number | null;
  divergence: boolean;
  sources: Record<string, number | null>;
};

function getTimeoutMs() {
  const raw = process.env.ORACLE_TIMEOUT_MS;
  const n = raw ? Number(raw) : 1500;
  const ms = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1500;
  return Math.min(ms, 5000);
}

function getMaxDivergenceBps() {
  const raw = process.env.ORACLE_MAX_DIVERGENCE_BPS;
  const n = raw ? Number(raw) : 500;
  const bps = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 500;
  return Math.min(bps, 10000);
}

function getSingleSourceHaircutBps() {
  const raw = process.env.ORACLE_SINGLE_SOURCE_HAIRCUT_BPS;
  const n = raw ? Number(raw) : 500;
  const bps = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 500;
  return Math.min(bps, 5000);
}

function applyHaircut(price: number, haircutBps: number) {
  return price * (1 - haircutBps / 10000);
}

function parseFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<any | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function normalizeAssetSymbol(assetSymbol: string) {
  return assetSymbol.trim().toUpperCase();
}

function getCoinGeckoIdForAsset(assetSymbol: string) {
  const sym = normalizeAssetSymbol(assetSymbol);
  const envKey = `ORACLE_COINGECKO_ID_${sym}`;
  const override = (process.env as any)[envKey] as string | undefined;
  if (override && override.trim()) return override.trim().toLowerCase();
  if (sym === 'ETH') return 'ethereum';
  return sym.toLowerCase();
}

function getBinanceSymbolForAsset(assetSymbol: string) {
  const sym = normalizeAssetSymbol(assetSymbol);
  const envKey = `ORACLE_BINANCE_SYMBOL_${sym}`;
  const override = (process.env as any)[envKey] as string | undefined;
  if (override && override.trim()) return override.trim().toUpperCase();
  if (sym.endsWith('USDT')) return sym;
  return `${sym}USDT`;
}

export async function getPriceFromCoinGecko(assetSymbol: string): Promise<number | null> {
  const id = getCoinGeckoIdForAsset(assetSymbol);
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`;
  const data = await fetchJsonWithTimeout(url, getTimeoutMs());
  const price = data?.[id]?.usd;
  return parseFiniteNumber(price);
}

export async function getPriceFromBinance(assetSymbol: string): Promise<number | null> {
  const symbol = getBinanceSymbolForAsset(assetSymbol);
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`;
  const data = await fetchJsonWithTimeout(url, getTimeoutMs());
  return parseFiniteNumber(data?.price);
}

export async function getConsolidatedPrice(assetSymbol: string): Promise<ConsolidatedPriceResult> {
  const [cg, bn] = await Promise.all([getPriceFromCoinGecko(assetSymbol), getPriceFromBinance(assetSymbol)]);

  const sources = { coingecko: cg, binance: bn };
  const both = cg !== null && bn !== null;
  if (both) {
    const avg = (cg + bn) / 2;
    const diffBps = avg > 0 ? Math.round((Math.abs(cg - bn) / avg) * 10000) : 0;
    const divergence = diffBps > getMaxDivergenceBps();
    return { price: avg, divergence, sources };
  }

  const one = cg !== null ? cg : bn;
  if (one !== null) {
    const haircutBps = getSingleSourceHaircutBps();
    return { price: applyHaircut(one, haircutBps), divergence: false, sources };
  }

  return { price: null, divergence: false, sources };
}

