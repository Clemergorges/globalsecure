import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Public endpoint to claim/view transfer via link
// In production this should be protected by a unique token or partial auth
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: { 
        sender: { select: { fullName: true } },
        virtualCards: true 
      }
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    return NextResponse.json({ transfer });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
