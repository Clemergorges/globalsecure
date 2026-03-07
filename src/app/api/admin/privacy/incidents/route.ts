import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createPrivacyIncident } from '@/lib/services/privacy-incident';

const createSchema = z.object({
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().min(5),
  affectedUserCount: z.number().int().min(0).optional(),
});

export async function GET() {
  try {
    await checkAdmin();

    const incidents = await prisma.privacyIncident.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ incidents });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  try {
    const session = await checkAdmin();
    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const incident = await createPrivacyIncident({
      severity: parsed.data.severity,
      description: parsed.data.description,
      affectedUserCount: parsed.data.affectedUserCount,
      createdByUserId: session.userId,
      ip,
      userAgent,
    });

    return NextResponse.json({ incident }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

