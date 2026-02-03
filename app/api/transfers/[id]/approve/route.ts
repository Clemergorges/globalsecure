import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = params;
    
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: { virtualCards: true }
    });

    if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    
    // Check if sender is the one approving
    // @ts-ignore
    if (transfer.senderId !== session.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Deduct from sender's account
    const senderAccount = await prisma.account.findFirst({
      where: { userId: transfer.senderId, currency: transfer.currencySource }
    });

    if (!senderAccount || senderAccount.balance.lessThan(transfer.amountSource)) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.account.update({
        where: { id: senderAccount.id },
        data: { balance: { decrement: transfer.amountSource } }
      }),
      prisma.transfer.update({
        where: { id },
        data: { status: 'READY_TO_SPEND' }
      }),
      prisma.virtualCard.updateMany({
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
