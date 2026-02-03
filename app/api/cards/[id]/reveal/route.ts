import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const card = await prisma.virtualCard.findUnique({
      where: { id: params.id },
      include: { transfer: true, account: true }
    });

    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

    // Verify ownership (Receiver or Account Holder)
    // @ts-ignore
    const isReceiver = card.transfer?.receiverId === session.userId;
    // @ts-ignore
    const isAccountHolder = card.account?.userId === session.userId;

    if (!isReceiver && !isAccountHolder) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // In a real app, we would fetch sensitive details from Stripe/PCI Vault here
    // For MVP/Mock, we return the stored token or a mock PAN
    return NextResponse.json({
      pan: '4242 4242 4242 ' + card.last4,
      cvc: '123',
      exp: new Date(card.expiresAt).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' }),
      cardholderName: 'VALUED CUSTOMER' // Or user name
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to reveal card' }, { status: 500 });
  }
}
