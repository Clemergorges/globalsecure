import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth';
import { runTreasuryReconciliation } from '@/lib/services/treasury-reconciliation';

export async function GET(req: Request) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const maxAgeMin = searchParams.get('maxAgeMin');
  const snapshotMaxAgeMinutes = maxAgeMin ? Number(maxAgeMin) : undefined;

  const r = await runTreasuryReconciliation({ emitAudit: false, snapshotMaxAgeMinutes });

  const csvHeader = 'RunAt,Currency,InternalTotal,ExternalTotal,Delta,DivergencePct,Providers,SnapshotCutoff\n';
  const csvRows = r.rows
    .map((row) => {
      const providers = `"${row.providers.join('|').replace(/"/g, '""')}"`;
      return [
        r.nowIso,
        row.currency,
        row.internalTotal,
        row.externalTotal ?? '',
        row.delta ?? '',
        row.divergencePct ?? '',
        providers,
        row.snapshotCutoffIso,
      ].join(',');
    })
    .join('\n');

  const csvContent = csvHeader + csvRows;
  const date = new Date(r.nowIso).toISOString().split('T')[0];

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="treasury-reconciliation-${date}.csv"`,
    },
  });
}

