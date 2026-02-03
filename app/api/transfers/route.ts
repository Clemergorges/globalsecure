import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const transfers = await prisma.transfer.findMany({
      where: {
        OR: [
          // @ts-ignore
          { senderId: session.userId },
          // @ts-ignore
          { receiverId: session.userId }
        ]
      },
      include: {
        sender: { select: { fullName: true, email: true } },
        receiver: { select: { fullName: true, email: true } },
        virtualCards: { select: { last4: true, status: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ transfers });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 });
  }
}
