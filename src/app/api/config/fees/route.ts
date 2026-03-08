import { NextResponse } from 'next/server';

function parseNumber(raw: string | undefined) {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function readPercentFromEnv(name: string, fallback: number) {
  const pct = parseNumber(process.env[name]);
  if (pct === null) return { value: fallback, usedEnv: false };
  return { value: clamp(pct, 0, 100), usedEnv: true };
}

function resolveConfig() {
  const rem = readPercentFromEnv('REM_FEE_PERCENT_DEFAULT', 1.8);
  const fx = readPercentFromEnv('FX_SPREAD_PERCENT_DEFAULT', 0.75);
  const y = readPercentFromEnv('YIELD_APY_PERCENT_DEFAULT', 6.5);

  const source: 'env' | 'db' | 'default' = rem.usedEnv || fx.usedEnv || y.usedEnv ? 'env' : 'default';
  const last_updated = new Date().toISOString();

  return {
    remittance_fee_percent: rem.value,
    fx_spread_percent: fx.value,
    yield_apy_percent: y.value,
    last_updated,
    source,
  } as const;
}

export async function GET() {
  const cfg = resolveConfig();
  const transferFeePct = clamp(cfg.remittance_fee_percent / 100, 0, 1);
  return NextResponse.json({
    ...cfg,
    transferFeePct,
    transferFeeBps: Math.round(transferFeePct * 10000),
    fxSpreadBps: Math.round(clamp(cfg.fx_spread_percent, 0, 100) * 100),
    yieldUiApyPct: cfg.yield_apy_percent,
  });
}
