import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/logger';

const profileSchema = z.object({
  firstName: z.string().min(1).max(80).optional().nullable(),
  lastName: z.string().min(1).max(80).optional().nullable(),
  phone: z.string().min(6).max(32).optional().nullable(),
  address: z.string().min(1).max(200).optional().nullable(),
  city: z.string().min(1).max(120).optional().nullable(),
  postalCode: z.string().min(1).max(24).optional().nullable(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  const body = await req.json().catch(() => ({}));
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        firstName: parsed.data.firstName ?? undefined,
        lastName: parsed.data.lastName ?? undefined,
        phone: parsed.data.phone ?? undefined,
        address: parsed.data.address ?? undefined,
        city: parsed.data.city ?? undefined,
        postalCode: parsed.data.postalCode ?? undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        city: true,
        postalCode: true,
        updatedAt: true,
      }
    });

    await logAudit({
      userId: session.userId,
      action: 'USER_PROFILE_UPDATED',
      status: '200',
      ipAddress: ip,
      userAgent,
      path: '/api/user/profile',
    });

    return NextResponse.json({ user: updated });
  } catch (e: any) {
    const message = String(e?.message || 'UNKNOWN');
    if (message.includes('Unique constraint') || message.includes('unique')) {
      return NextResponse.json({ error: 'Conflito de dados (ex.: telefone já em uso)' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}

