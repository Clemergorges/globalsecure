import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createIssuingEphemeralKey } from '@/lib/services/stripe';
import { z } from 'zod';
import { PartnerTemporarilyUnavailableError } from '@/lib/services/partner-circuit-breaker';

const schema = z.object({
  cardId: z.string(),
  apiVersion: z.string().optional()
});

export async function POST(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // @ts-ignore
  const userId = session.userId;

  try {
    const body = await req.json();
    const { cardId, apiVersion } = schema.parse(body);

    const card = await prisma.virtualCard.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (card.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Default Stripe API version if not provided
    const version = apiVersion || '2024-12-18.acacia';

    const key = await createIssuingEphemeralKey(card.stripeCardId, version);

    return NextResponse.json(key);

  } catch (error: any) {
    console.error('Ephemeral Key Error:', error);
    if (error instanceof PartnerTemporarilyUnavailableError) {
      return NextResponse.json({ error: error.code, code: error.code }, { status: 503 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create ephemeral key' }, { status: 500 });
  }
}
