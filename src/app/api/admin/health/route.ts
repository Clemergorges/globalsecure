import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdmin } from '@/lib/auth';
import { getIssuerConnector } from '@/lib/services/issuer-connector';

export async function GET() {
  try {
    await checkAdmin();

    const checks: Record<string, any> = {};

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.db = { ok: true };
    } catch (e: any) {
      checks.db = { ok: false, error: e?.message || 'DB_UNAVAILABLE' };
    }

    try {
      const rows: Array<{ applied: bigint | number }> = await prisma.$queryRaw`
        SELECT COUNT(*)::bigint AS applied
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      `;
      const applied = Number((rows as any)?.[0]?.applied || 0);
      checks.migrations = { ok: applied > 0, applied };
    } catch (e: any) {
      checks.migrations = { ok: false, error: e?.message || 'MIGRATIONS_CHECK_FAILED' };
    }

    try {
      const fxCount = await prisma.fxRate.count();
      checks.fx = { ok: fxCount > 0, count: fxCount };
    } catch (e: any) {
      checks.fx = { ok: false, error: e?.message || 'FX_CHECK_FAILED' };
    }

    try {
      const mgCount = await prisma.marketGuard.count();
      checks.marketGuard = { ok: true, count: mgCount };
    } catch (e: any) {
      checks.marketGuard = { ok: false, error: e?.message || 'MARKET_GUARD_CHECK_FAILED' };
    }

    const issuer = getIssuerConnector();
    const issuerHealth = await issuer.healthCheck();
    checks.issuer = { ok: issuerHealth.ok, kind: issuer.kind, details: issuerHealth.details || null };

    const ok = Object.values(checks).every((c: any) => c && c.ok === true);

    return NextResponse.json({ ok, checks, timestamp: new Date().toISOString() }, { status: ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

