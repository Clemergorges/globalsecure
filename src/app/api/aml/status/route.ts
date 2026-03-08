import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

type AmlUiStatus = 'VERIFIED' | 'REVIEW' | 'ACTION_REQUIRED' | 'BLOCKED';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { kycStatus: true, riskTier: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const latestCase = await prisma.amlReviewCase.findFirst({
    where: { userId: session.userId },
    select: { status: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  const openCase = await prisma.amlReviewCase.findFirst({
    where: { userId: session.userId, status: { in: ['PENDING', 'IN_REVIEW'] } },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  const blockedCase = await prisma.amlReviewCase.findFirst({
    where: { userId: session.userId, status: 'BLOCKED' },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  let status: AmlUiStatus = 'VERIFIED';
  if (blockedCase) status = 'BLOCKED';
  else if (openCase) status = 'REVIEW';
  else if (user.riskTier === 'HIGH') status = 'ACTION_REQUIRED';
  else if (user.kycStatus !== 'APPROVED') status = user.kycStatus === 'REVIEW' ? 'REVIEW' : 'ACTION_REQUIRED';

  const last_update = (blockedCase?.updatedAt || openCase?.updatedAt || latestCase?.updatedAt || new Date()).toISOString();
  const has_open_case = Boolean(openCase);

  return NextResponse.json({ status, has_open_case, last_update });
}

