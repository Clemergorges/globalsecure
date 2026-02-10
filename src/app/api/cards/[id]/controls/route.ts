import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { updateCardControls } from '@/lib/services/stripe';
import { z } from 'zod';

const schema = z.object({
  spendingLimit: z.object({
    amount: z.number().positive(),
    interval: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'all_time'])
  }).optional(),
  blockedCategories: z.array(z.string()).optional()
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  // @ts-ignore
  if (!session || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // @ts-ignore
  const userId = session.userId;
  const { id } = await params;
  const cardId = id;

  try {
    const body = await req.json();
    const { spendingLimit, blockedCategories } = schema.parse(body);

    const card = await prisma.virtualCard.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (card.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Call Stripe
    await updateCardControls(card.stripeCardId, {
        spending_limits: spendingLimit ? [spendingLimit] : undefined,
        blocked_categories: blockedCategories
    });

    // Update DB (We might want to store these controls in DB too for faster read, but skipping for MVP)
    // Wait, the `amount` field in VirtualCard is "Limit". We should update it if interval is 'all_time'.
    if (spendingLimit && spendingLimit.interval === 'all_time') {
        await prisma.virtualCard.update({
            where: { id: cardId },
            data: { amount: spendingLimit.amount }
        });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Update controls error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update controls' }, { status: 500 });
  }
}
