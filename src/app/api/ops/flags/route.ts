import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isOperationalFlagEnabled } from '@/lib/services/operational-flags';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || typeof session === 'string') {
    return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const [treasuryHalt, yieldPaused] = await Promise.all([
    isOperationalFlagEnabled('TREASURY_HALT_DEPOSITS_WITHDRAWS'),
    isOperationalFlagEnabled('YIELD_ALLOCATIONS_PAUSED'),
  ]);

  let partnerOutage = false;
  try {
    const open = await (prisma as any).partnerCircuitState?.findFirst?.({ where: { state: 'OPEN' }, select: { partner: true } });
    partnerOutage = Boolean(open);
  } catch {}

  return NextResponse.json({
    ok: true,
    flags: {
      TREASURY_HALT_DEPOSITS_WITHDRAWS: treasuryHalt,
      YIELD_ALLOCATIONS_PAUSED: yieldPaused,
      PARTNER_OUTAGE: partnerOutage,
    },
  });
}
