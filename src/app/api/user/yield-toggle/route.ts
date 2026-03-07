import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createHandler } from '@/lib/api-handler';
import { recordUserConsent } from '@/lib/services/fiat-ledger';
import { getSession } from '@/lib/auth';

const schema = z.object({
  enabled: z.boolean(),
});

export const POST = createHandler(
  schema,
  async (req) => {
    const userId = req.userId!;
    const { enabled } = req.validatedBody;

    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const ip = forwardedFor.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
    const userAgent = req.headers.get('user-agent') || null;
    const termsVersion = process.env.YIELD_TERMS_VERSION || '1';

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { yieldEnabled: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          yieldEnabled: enabled,
          yieldEnabledAt: enabled ? new Date() : null,
        },
      });

      await recordUserConsent(tx, userId, enabled ? 'YIELD_TOGGLE_ON' : 'YIELD_TOGGLE_OFF', {
        ip,
        userAgent,
        termsVersion,
        previous: user.yieldEnabled,
        enabled,
      });
    });

    return NextResponse.json({ success: true, yieldEnabled: enabled });
  },
  { requireAuth: true, rateLimit: { key: 'yield-toggle', limit: 10, window: 60 } },
);

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { yieldEnabled: true, yieldEnabledAt: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({
    yieldEnabled: user.yieldEnabled,
    yieldEnabledAt: user.yieldEnabledAt,
    termsVersion: process.env.YIELD_TERMS_VERSION || '1',
  });
}
