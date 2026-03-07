import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || '30d'; // 30d, 90d, 1y

  const startDate = new Date();
  if (period === '30d') startDate.setDate(startDate.getDate() - 30);
  if (period === '90d') startDate.setDate(startDate.getDate() - 90);
  if (period === '1y') startDate.setFullYear(startDate.getFullYear() - 1);

  try {
    const transactions = await prisma.userTransaction.findMany({
      where: {
        userId: session.userId,
        createdAt: { gte: startDate },
        type: { in: ['CARD_OUT', 'TRANSFER', 'PIX_IN', 'SEPA_IN', 'CRYPTO_OUT'] }, // Filter relevant types
        status: 'COMPLETED'
      },
      select: {
        amount: true,
        category: true,
        type: true,
        createdAt: true
      }
    });

    // Group by Category
    const categoryMap: Record<string, number> = {};
    const dailyMap: Record<string, number> = {};

    transactions.forEach(tx => {
      const amount = Number(tx.amount);
      const cat = tx.category || 'OTHER';
      
      // Category Breakdown
      if (!categoryMap[cat]) categoryMap[cat] = 0;
      categoryMap[cat] += amount;

      // Daily Trend
      const dateKey = tx.createdAt.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) dailyMap[dateKey] = 0;
      dailyMap[dateKey] += amount;
    });

    return NextResponse.json({
      byCategory: Object.entries(categoryMap).map(([name, value]) => ({ name, value })),
      byDate: Object.entries(dailyMap).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date))
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}