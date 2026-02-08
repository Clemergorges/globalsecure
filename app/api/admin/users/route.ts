import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      include: {
        wallet: {
            include: {
                balances: true
            }
        },
        kycDocuments: {
            orderBy: { createdAt: 'desc' },
            take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Sanitize sensitive data & Normalize Balances
    const sanitizedUsers = users.map(user => {
      // Normalize balances: Combine explicit Balance table with Wallet columns
      // For MVP, we prioritize Columns as they are used by the main App
      const balances = [];
      if (user.wallet) {
        if (Number(user.wallet.balanceEUR) > 0) balances.push({ currency: 'EUR', amount: user.wallet.balanceEUR });
        if (Number(user.wallet.balanceUSD) > 0) balances.push({ currency: 'USD', amount: user.wallet.balanceUSD });
        if (Number(user.wallet.balanceGBP) > 0) balances.push({ currency: 'GBP', amount: user.wallet.balanceGBP });
        
        // Add others from Balance table if not already added
        user.wallet.balances.forEach(b => {
            if (!['EUR', 'USD', 'GBP'].includes(b.currency)) {
                balances.push({ currency: b.currency, amount: b.amount });
            }
        });
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        kycStatus: user.kycStatus,
        kycLevel: user.kycLevel,
        wallet: {
            ...user.wallet,
            balances: balances
        },
        lastKycDoc: user.kycDocuments[0] || null,
        createdAt: user.createdAt
      };
    });

    return NextResponse.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Admin Users Error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}