'use server';

import { cookies, headers } from 'next/headers';
import { logAudit } from '@/lib/logger';
import { getSession } from '@/lib/auth';

export async function setUserLocale(locale: string) {
  const cookieStore = await cookies();
  const prev = cookieStore.get('NEXT_LOCALE')?.value || null;
  cookieStore.set('NEXT_LOCALE', locale, { path: '/' });

  try {
    const h = await headers();
    const ipAddress = h.get('x-forwarded-for') || h.get('x-real-ip') || 'unknown';
    const userAgent = h.get('user-agent') || 'unknown';
    const session = await getSession().catch(() => null);

    await logAudit({
      userId: session?.userId,
      action: 'LOCALE_CHANGED',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      method: 'ACTION',
      path: '/actions/set-language',
      metadata: { from: prev, to: locale }
    });
  } catch {
    // no-op
  }
}
