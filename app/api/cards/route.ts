import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const cards = await prisma.virtualCard.findMany({
      where: {
        OR: [
          // Cards linked to user's transfers (as recipient)
          // @ts-ignore
          { transfer: { recipientId: session.userId } },
          // Cards linked to user's account directly
          // @ts-ignore
          { userId: session.userId }
        ]
      },
      include: {
        transfer: true
      },
      orderBy: { id: 'desc' }
    });

    return NextResponse.json({ cards });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}
