import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getConsentState, updateConsentState } from '@/lib/services/privacy-consent';

const updateSchema = z.object({
  gdprConsent: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
  cookieConsent: z.boolean().optional(),
  locale: z.string().min(2).max(10).optional(),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const locale = url.searchParams.get('locale') || undefined;
  const state = await getConsentState({ userId: session.userId, locale });

  return NextResponse.json(state);
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const result = await updateConsentState({
      userId: session.userId,
      locale: parsed.data.locale,
      ip,
      userAgent,
      next: {
        gdprConsent: parsed.data.gdprConsent,
        marketingConsent: parsed.data.marketingConsent,
        cookieConsent: parsed.data.cookieConsent,
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    const message = typeof e?.message === 'string' ? e.message : 'UNKNOWN_ERROR';
    if (message === 'GDPR_TERMS_REQUIRED') {
      return NextResponse.json({ error: 'Consentimento GDPR é obrigatório' }, { status: 400 });
    }
    if (message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}

