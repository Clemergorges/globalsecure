import { prisma } from '@/lib/db';
import { getIssuerConnector } from '@/lib/services/issuer-connector';

export async function getCardData(cardId: string) {
  const card = await prisma.virtualCard.findUnique({ where: { id: cardId } });
  if (!card) throw new Error('Card not found');

  const issuer = getIssuerConnector();
  return issuer.revealCard(card.stripeCardId, { last4: card.last4, expMonth: card.expMonth, expYear: card.expYear });
}
