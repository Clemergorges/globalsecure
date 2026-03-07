import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';

const schema = z.object({
  enabled: z.boolean(),
  travelRegion: z
    .string()
    .trim()
    .toUpperCase()
    .max(12)
    .regex(/^[A-Z0-9_-]{2,12}$/)
    .optional()
    .nullable(),
});

function summarize(travelModeEnabled: boolean, travelRegion: string | null, habitualCountry: string | null) {
  if (!travelModeEnabled) return 'Travel Mode desativado';
  const region = travelRegion ? `na região ${travelRegion}` : 'sem região definida';
  const home = habitualCountry ? ` (país habitual: ${habitualCountry})` : '';
  return `Travel Mode ativado ${region}${home}`;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { travelModeEnabled: true, travelRegion: true, country: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({
    travelModeEnabled: user.travelModeEnabled,
    travelRegion: user.travelRegion,
    summary: summarize(user.travelModeEnabled, user.travelRegion || null, user.country || null),
  });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }

  const { enabled, travelRegion } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { travelModeEnabled: true, travelRegion: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: {
      travelModeEnabled: enabled,
      travelRegion: enabled ? (travelRegion || null) : null,
    },
    select: { travelModeEnabled: true, travelRegion: true, country: true },
  });

  const forwardedFor = req.headers.get('x-forwarded-for') || '';
  const ipAddress = forwardedFor.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
  const userAgent = req.headers.get('user-agent') || null;

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'TRAVEL_MODE_UPDATED',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      method: 'PATCH',
      path: '/api/user/travel-mode',
      metadata: {
        previous: { travelModeEnabled: user.travelModeEnabled, travelRegion: user.travelRegion || null },
        next: { travelModeEnabled: updated.travelModeEnabled, travelRegion: updated.travelRegion || null },
      },
    },
  });
  logger.info(
    { userId: session.userId, travelModeEnabled: updated.travelModeEnabled, travelRegion: updated.travelRegion || null },
    'Travel mode updated',
  );

  return NextResponse.json({
    success: true,
    travelModeEnabled: updated.travelModeEnabled,
    travelRegion: updated.travelRegion,
    summary: summarize(updated.travelModeEnabled, updated.travelRegion || null, updated.country || null),
  });
}
