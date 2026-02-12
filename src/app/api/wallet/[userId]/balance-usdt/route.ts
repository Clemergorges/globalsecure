import { NextResponse } from 'next/server';
import { getUserBalanceUsdt, getUsdtPriceUsd, deriveUserAddress } from '@/lib/services/polygon';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // 1. Authentication Check
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Authorization Check (IDOR Protection)
    // Only allow access if the requested userId matches the logged-in user, OR if user is admin
    if (session.userId !== userId && session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const address = await deriveUserAddress(userId);
    
    // Run in parallel for speed
    const [balanceUsdt, priceUsd] = await Promise.all([
      getUserBalanceUsdt(address),
      getUsdtPriceUsd()
    ]);

    const balanceFloat = parseFloat(balanceUsdt);
    const balanceUsd = (balanceFloat * priceUsd).toFixed(2);

    return NextResponse.json({
      userId,
      address,
      balanceUsdt,
      balanceUsd,
      priceUsd
    });

  } catch (error: unknown) {
    console.error('Balance check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
