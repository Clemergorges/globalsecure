import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createTreasurySnapshot } from '@/lib/services/treasury-reconciliation';

export async function GET() {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const snapshots = await prisma.treasurySnapshot.findMany({
    orderBy: { capturedAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ snapshots });
}

export async function POST(req: Request) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const list = Array.isArray(body?.snapshots) ? body.snapshots : [body];
  if (!Array.isArray(list) || list.length === 0) {
    return NextResponse.json({ error: 'No snapshots provided' }, { status: 400 });
  }

  let created = 0;
  for (const s of list) {
    if (!s?.provider || !s?.currency) continue;
    const balance = Number(s.balance);
    if (!Number.isFinite(balance)) continue;

    await createTreasurySnapshot({
      provider: String(s.provider),
      currency: String(s.currency),
      balance,
      accountRef: s.accountRef ? String(s.accountRef) : null,
      capturedAt: s.capturedAt ? new Date(s.capturedAt) : null,
      metadata: s.metadata ?? undefined,
    });
    created += 1;
  }

  return NextResponse.json({ success: true, created });
}

