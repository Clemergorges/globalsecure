import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Find card and verify ownership (sender)
    const card = await prisma.virtualCard.findUnique({
        where: { id },
        include: { transfer: true }
    });

    if (!card) {
        return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Check if user is the sender of the transfer linked to the card
    if (card.transfer.senderId !== session.userId) {
         return NextResponse.json({ error: 'Forbidden: Only sender can unlock' }, { status: 403 });
    }

    if (card.unlockStatus === 'UNLOCKED') {
        return NextResponse.json({ message: 'Card already unlocked' });
    }

    // Update status
    await prisma.virtualCard.update({
        where: { id },
        data: {
            unlockStatus: 'UNLOCKED',
            unlockedAt: new Date()
        }
    });

    return NextResponse.json({ success: true, status: 'UNLOCKED' });

  } catch (error) {
    console.error('Error unlocking card:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
