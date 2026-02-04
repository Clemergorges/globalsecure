import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Public endpoint to claim/view transfer via link
// In production this should be protected by a unique token or partial auth
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: { 
        sender: { select: { firstName: true, lastName: true } },
        card: true // Updated relation name from schema
      }
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // Check if card is already created
    if (transfer.card) {
      return NextResponse.json({ 
        transfer,
        cardCreated: true,
        cardId: transfer.card.id 
      });
    }

    return NextResponse.json({ transfer });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
