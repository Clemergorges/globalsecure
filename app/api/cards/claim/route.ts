import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/logger';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { token } = await req.json();

    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    // 1. Validate Token (Replay Protection)
    const activationToken = await prisma.cardActivationToken.findUnique({
      where: { token },
      include: { card: true }
    });

    if (!activationToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    if (activationToken.used) {
      await logAudit(session.userId, 'CARD_CLAIM_REPLAY_ATTEMPT', { tokenId: activationToken.id });
      return NextResponse.json({ error: 'Token already used' }, { status: 400 });
    }

    if (new Date() > activationToken.expiresAt) {
      return NextResponse.json({ error: 'Token expired' }, { status: 400 });
    }

    // 2. Mark as Used (Atomic Replay Protection)
    // We update 'used' first to prevent race conditions if possible, 
    // though Prisma transactions are better.
    await prisma.$transaction(async (tx) => {
        await tx.cardActivationToken.update({
            where: { id: activationToken.id },
            data: { 
                used: true, 
                usedAt: new Date(),
                ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
                userAgent: req.headers.get('user-agent') || 'unknown'
            }
        });

        // 3. Activate Card
        await tx.virtualCard.update({
            where: { id: activationToken.cardId },
            data: { 
                status: 'ACTIVE',
                userId: session.userId // Assign card to the user claiming it
            }
        });
    });

    // 4. Audit Log
    await logAudit(session.userId, 'CARD_CLAIMED', { cardId: activationToken.cardId, tokenId: activationToken.id });

    return NextResponse.json({ success: true, message: 'Card claimed successfully' });

  } catch (error) {
    console.error('Card Claim Error:', error);
    return NextResponse.json({ error: 'Claim failed' }, { status: 500 });
  }
}