import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { stripe } from '@/lib/services/stripe';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const cardId = id;

  try {
    const card = await prisma.virtualCard.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (card.userId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // If it's a mock card (created without Stripe key or explicitly mock)
    if (card.stripeCardId.startsWith('ic_mock_') || !process.env.STRIPE_SECRET_KEY) {
        // Return deterministic mock data based on card ID
        return NextResponse.json({
            pan: '4242 4242 4242 ' + card.last4,
            cvv: '123',
            expMonth: card.expMonth,
            expYear: card.expYear
        });
    }

    // Real Stripe Implementation
    // Note: Retrieving clear text PAN/CVC requires PCI permissions on Stripe account.
    // If this fails, it means the account is not authorized to see clear text numbers.
    try {
        const stripeCard = await stripe.issuing.cards.retrieve(
            card.stripeCardId,
            { expand: ['number', 'cvc'] }
        );

        return NextResponse.json({
            pan: (stripeCard as any).number || '**** **** **** ' + card.last4,
            cvv: (stripeCard as any).cvc || '***',
            expMonth: stripeCard.exp_month,
            expYear: stripeCard.exp_year
        });
    } catch (stripeError: any) {
        console.error('Stripe reveal error:', stripeError);
        // Fallback for demo/dev if real stripe fails (e.g. permission error)
        return NextResponse.json({
            pan: '**** **** **** ' + card.last4,
            cvv: '***',
            error: 'Could not retrieve details from Stripe (Permission denied)'
        });
    }

  } catch (error: any) {
    console.error('Reveal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
