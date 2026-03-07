import { NextResponse } from 'next/server';
import { getUserBalanceUsdt, getUsdtPriceUsd, deriveUserAddress } from '@/lib/services/polygon';
import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { requireSelfOrRoles } from '@/lib/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const session = await requireSelfOrRoles(request, userId, [
      UserRole.ADMIN,
      UserRole.COMPLIANCE,
      UserRole.TREASURY,
    ]);
    if (session instanceof NextResponse) return session;

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
