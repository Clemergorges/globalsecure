import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: { card: true }
    });

    if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    
    // Check if sender is the one approving
    // @ts-ignore
    if (transfer.senderId !== session.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Deduct from sender's wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: transfer.senderId },
      include: { balances: true }
    });

    // Determine which balance to deduct based on transfer currency
    // For MVP we assume EUR or USD, defaulting to EUR logic if complex
    const currency = transfer.currencySent === 'USD' ? 'USD' : 'EUR';
    // @ts-ignore
    const balanceRecord = wallet?.balances.find(b => b.currency === currency);
    const available = balanceRecord ? Number(balanceRecord.amount) : 0;

    // @ts-ignore
    if (!wallet || available < Number(transfer.amountSent)) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.balance.update({
        where: { id: balanceRecord!.id },
        data: { amount: { decrement: transfer.amountSent } }
      }),
      prisma.transfer.update({
        where: { id },
        data: { status: 'COMPLETED' } // Assuming approval completes it for now
      }),
      prisma.virtualCard.update({
        where: { transferId: id },
        data: { status: 'ACTIVE' }
      }),
      prisma.transactionLog.create({
        data: {
          transferId: id,
          type: 'SENDER_APPROVED',
          metadata: { approvedAt: new Date() }
        }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Approval failed' }, { status: 500 });
  }
}
