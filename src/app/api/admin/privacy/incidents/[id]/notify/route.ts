import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkAdmin } from '@/lib/auth';
import { notifyPrivacyIncident } from '@/lib/services/privacy-incident';

const notifySchema = z.object({
  notifyAuthority: z.boolean().optional(),
  notifyUsers: z.boolean().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  try {
    const session = await checkAdmin();
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const parsed = notifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const notifyAuthority = parsed.data.notifyAuthority ?? true;
    const notifyUsers = parsed.data.notifyUsers ?? true;

    const incident = await notifyPrivacyIncident({
      incidentId: id,
      notifyAuthority,
      notifyUsers,
      actorUserId: session.userId,
      ip,
      userAgent,
    });

    return NextResponse.json({ incident });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

