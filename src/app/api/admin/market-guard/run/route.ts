import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth';
import { updateMarketGuardForAsset, applyCircuitBreaker } from '@/lib/services/market-guard';

function getDefaultAssets() {
  const raw = process.env.ORACLE_ASSETS || 'EETH';
  return raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export async function GET(req: Request) {
  try {
    await checkAdmin();

    const url = new URL(req.url);
    const raw = url.searchParams.get('assets');
    const assets = raw
      ? raw
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      : getDefaultAssets();

    const out: any[] = [];
    for (const assetSymbol of assets) {
      const update = await updateMarketGuardForAsset(assetSymbol);
      const circuitBreaker = await applyCircuitBreaker(assetSymbol);
      out.push({
        assetSymbol,
        priceUsed: update.priceUsed,
        divergence: update.consolidated.divergence,
        sources: update.consolidated.sources,
        dropBps: update.dropBps,
        isInAlert: update.marketGuard.isInAlert,
        isYieldPaused: update.marketGuard.isYieldPaused,
        lastAlertReason: update.marketGuard.lastAlertReason,
        circuitBreaker,
      });
    }

    return NextResponse.json({ assets: out });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

