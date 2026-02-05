
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      // @ts-ignore
      where: { id: session.userId },
      select: {
        kycStatus: true,
        kycLevel: true,
        kycDocuments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            rejectionReason: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const latestDoc = user.kycDocuments[0];

    return NextResponse.json({
      status: user.kycStatus,
      level: user.kycLevel,
      lastSubmission: latestDoc ? {
        date: latestDoc.createdAt,
        rejectionReason: latestDoc.rejectionReason
      } : null
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch KYC status' }, { status: 500 });
  }
}
