import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getYieldPower } from '@/lib/services/yield-credit';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { yieldEnabled: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const power = await getYieldPower(session.userId);

  return NextResponse.json({
    yieldEnabled: user.yieldEnabled,
    usd: {
      powerUsd: power.powerUsd,
      debtUsd: power.debtUsd,
      reservedUsd: power.reservedUsd,
      availableUsd: power.availableUsd,
    },
  });
}
