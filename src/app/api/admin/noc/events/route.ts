import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdmin } from '@/lib/auth';

const DEFAULT_ACTIONS = [
  'MARKET_CIRCUIT_BREAKER',
  'MARKET_ORACLE_DEGRADED',
  'TRAVEL_MODE_UPDATED',
  'TRAVEL_MODE_RELAXED',
  'TRAVEL_MODE_BLOCKED',
  'BUSINESS_ERROR',
];

export async function GET(req: Request) {
  try {
    await checkAdmin();

    const url = new URL(req.url);
    const takeRaw = url.searchParams.get('take');
    const take = Math.min(Math.max(Number(takeRaw || 50) || 50, 1), 200);

    const actionsRaw = url.searchParams.get('actions');
    const actions = actionsRaw
      ? actionsRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : DEFAULT_ACTIONS;

    const [audit, amlCases] = await Promise.all([
      prisma.auditLog.findMany({
        where: { action: { in: actions } },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      prisma.amlReviewCase.findMany({
        where: { status: { in: ['PENDING', 'IN_REVIEW'] }, riskLevel: { in: ['HIGH', 'CRITICAL'] } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, userId: true, reason: true, status: true, riskLevel: true, riskScore: true, slaDueAt: true, createdAt: true },
      }),
    ]);

    return NextResponse.json({
      audit,
      aml: {
        openHighOrCritical: amlCases,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

