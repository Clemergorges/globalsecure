import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createHandler } from '@/lib/api-handler';
import { z } from 'zod';

// Schema for query params (optional currency override)
const balanceQuerySchema = z.object({
  currency: z.enum(['EUR', 'USD', 'GBP']).optional()
});

export const GET = createHandler(
  z.any(), // GET request has no body
  async (req) => {
    const userId = req.userId!; // Guaranteed by requireAuth

    // Optional: Parse query params manually if needed, or use a helper
    // const { currency: requestedCurrency } = validateQuery(req, balanceQuerySchema);
    
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: { balances: true }
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Transform balances into a clean map
    const balances = wallet.balances.reduce((acc, curr) => {
        acc[curr.currency] = Number(curr.amount);
        return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      userId,
      primaryCurrency: wallet.primaryCurrency,
      balances: balances,
      // Backward compatibility for single balance view
      balance: balances[wallet.primaryCurrency] || 0,
      currency: wallet.primaryCurrency
    });
  },
  {
    rateLimit: { key: 'balance', limit: 20, window: 60 }, // High limit for dashboard polling
    requireAuth: true
  }
);
