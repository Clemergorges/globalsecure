import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({} as any));
    const code = body?.code ?? body?.unlockCode;

    if (!code) {
      return NextResponse.json({ error: 'Code required' }, { status: 400 });
    }

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: { card: true }
    });

    if (!transfer || !transfer.card) {
      return NextResponse.json({ error: 'Transfer or Card not found' }, { status: 404 });
    }

    const card = transfer.card;

    if (card.unlockedAt) {
      return NextResponse.json({ success: true, message: 'Already unlocked' });
    }

    if (card.unlockCode !== code) {
      return NextResponse.json({ error: 'Invalid unlock code' }, { status: 400 });
    }

    await prisma.virtualCard.update({
      where: { id: card.id },
      data: { unlockedAt: new Date() }
    });

    return NextResponse.json({ success: true, status: 'UNLOCKED' });
  } catch (error) {
    console.error('Error unlocking claim:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
