import { prisma } from '@/lib/db';
import { stripe } from '@/lib/services/stripe';

export async function getCardData(cardId: string) {
  const card = await prisma.virtualCard.findUnique({ where: { id: cardId } });
  if (!card) throw new Error('Card not found');

  if (card.stripeCardId.startsWith('ic_mock_') || !process.env.STRIPE_SECRET_KEY) {
    return {
      pan: `4242 4242 4242 ${card.last4}`,
      cvv: '123',
      expMonth: card.expMonth,
      expYear: card.expYear,
    };
  }

  try {
    const stripeCard = await stripe.issuing.cards.retrieve(
      card.stripeCardId,
      { expand: ['number', 'cvc'] }
    );

    return {
      pan: (stripeCard as any).number || `**** **** **** ${card.last4}`,
      cvv: (stripeCard as any).cvc || '***',
      expMonth: stripeCard.exp_month,
      expYear: stripeCard.exp_year,
    };
  } catch {
    return {
      pan: `**** **** **** ${card.last4}`,
      cvv: '***',
      expMonth: card.expMonth,
      expYear: card.expYear,
    };
  }
}

