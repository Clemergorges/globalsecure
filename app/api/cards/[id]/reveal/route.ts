import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getCardDetails } from '@/lib/services/stripe';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const card = await prisma.virtualCard.findUnique({
      where: { id },
      include: { 
        transfer: true,
        user: true // Check relation to User (card holder)
      }
    });

    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

    // Verify ownership (Receiver or Account Holder)
    // @ts-ignore
    const isReceiver = card.transfer?.recipientId === session.userId;
    // @ts-ignore
    const isAccountHolder = card.userId === session.userId;

    if (!isReceiver && !isAccountHolder) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch sensitive details from Stripe Issuing
    const stripeDetails = await getCardDetails(card.stripeCardId);

    return NextResponse.json({
      pan: '**** **** **** ' + stripeDetails.last4, // Masked for safety in logs, but UI might need full PAN. 
      // ACTUALLY: The UI expects full PAN to display when revealed. 
      // Stripe returns full number in 'number' field when expanded.
      // Let's return the real number if available, otherwise fallback.
      fullPan: stripeDetails.number, 
      cvc: stripeDetails.cvc,
      exp: `${String(stripeDetails.exp_month).padStart(2, '0')}/${String(stripeDetails.exp_year).slice(-2)}`,
      cardholderName: card.user?.firstName ? `${card.user.firstName} ${card.user.lastName}`.toUpperCase() : 'VALUED CUSTOMER'
    });

  } catch (error) {
    console.error('Card reveal error:', error);
    return NextResponse.json({ error: 'Failed to reveal card details' }, { status: 500 });
  }
}
