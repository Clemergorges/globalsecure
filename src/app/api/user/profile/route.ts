import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/logger';

function getCallingCode(country: string | null | undefined) {
  switch ((country || '').toUpperCase()) {
    case 'BR': return '+55';
    case 'US': return '+1';
    case 'PT': return '+351';
    case 'FR': return '+33';
    case 'DE': return '+49';
    case 'LU': return '+352';
    case 'GB': return '+44';
    case 'ES': return '+34';
    default: return null;
  }
}

function validatePostalCode(country: string | null | undefined, postalCode: string) {
  const c = (country || '').toUpperCase();
  if (c === 'BR') return /^\d{5}-\d{3}$/.test(postalCode);
  if (c === 'LU') return /^L-\d{4}$/.test(postalCode);
  if (c === 'PT') return /^\d{4}-\d{3}$/.test(postalCode);
  if (c === 'FR') return /^\d{5}$/.test(postalCode);
  if (c === 'DE') return /^\d{5}$/.test(postalCode);
  if (c === 'US') return /^\d{5}(-\d{4})?$/.test(postalCode);
  return true;
}

function normalizePostalCode(country: string | null | undefined, postalCode: string) {
  const c = (country || '').toUpperCase();
  if (c === 'BR') {
    const digits = postalCode.replaceAll(/\D/g, '').slice(0, 8);
    if (digits.length === 8) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return postalCode;
  }
  if (c === 'LU') {
    const digits = postalCode.replaceAll(/\D/g, '').slice(0, 4);
    if (digits.length === 4) return `L-${digits}`;
    return postalCode;
  }
  if (c === 'PT') {
    const digits = postalCode.replaceAll(/\D/g, '').slice(0, 7);
    if (digits.length === 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return postalCode;
  }
  if (c === 'FR' || c === 'DE') {
    const digits = postalCode.replaceAll(/\D/g, '').slice(0, 5);
    if (digits.length === 5) return digits;
    return postalCode;
  }
  if (c === 'US') {
    const digits = postalCode.replaceAll(/\D/g, '').slice(0, 9);
    if (digits.length === 9) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    if (digits.length === 5) return digits;
    return postalCode;
  }
  return postalCode;
}

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
    const existing = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { country: true },
    });
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (parsed.data.phone !== undefined) {
      const phone = parsed.data.phone;
      if (phone !== null) {
        const normalized = phone.replaceAll(/\s+/g, '');
        if (!normalized.startsWith('+') || !/^\+\d{6,31}$/.test(normalized)) {
          return NextResponse.json({ error: 'Telefone inválido. Use formato E.164 (ex.: +352123456).' }, { status: 400 });
        }

        const cc = getCallingCode(existing.country);
        if (cc && !normalized.startsWith(cc)) {
          return NextResponse.json({ error: `Telefone deve começar com ${cc} para o país ${existing.country}.` }, { status: 400 });
        }
      }
    }

    const phoneToSave =
      parsed.data.phone === undefined
        ? undefined
        : parsed.data.phone === null
          ? null
          : parsed.data.phone.replaceAll(/\s+/g, '');

    if (parsed.data.postalCode !== undefined) {
      const postal = parsed.data.postalCode;
      if (postal !== null) {
        const normalizedPostal = normalizePostalCode(existing.country, postal);
        if (!validatePostalCode(existing.country, normalizedPostal)) {
          const c = (existing.country || '').toUpperCase();
          if (c === 'BR') return NextResponse.json({ error: 'CEP inválido. Use 00000-000.' }, { status: 400 });
          if (c === 'LU') return NextResponse.json({ error: 'Código postal inválido. Use L-0000.' }, { status: 400 });
          if (c === 'PT') return NextResponse.json({ error: 'Código postal inválido. Use 0000-000.' }, { status: 400 });
          if (c === 'FR') return NextResponse.json({ error: 'Code postal invalide. Utilisez 00000.' }, { status: 400 });
          if (c === 'DE') return NextResponse.json({ error: 'Postleitzahl ungültig. Verwenden Sie 00000.' }, { status: 400 });
          if (c === 'US') return NextResponse.json({ error: 'ZIP inválido. Use 00000 ou 00000-0000.' }, { status: 400 });
          return NextResponse.json({ error: 'Código postal inválido.' }, { status: 400 });
        }
      }
    }

    const postalToSave =
      parsed.data.postalCode === undefined
        ? undefined
        : parsed.data.postalCode === null
          ? undefined
          : normalizePostalCode(existing.country, parsed.data.postalCode);

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        firstName: parsed.data.firstName ?? undefined,
        lastName: parsed.data.lastName ?? undefined,
        phone: phoneToSave,
        address: parsed.data.address ?? undefined,
        city: parsed.data.city ?? undefined,
        postalCode: postalToSave,
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
