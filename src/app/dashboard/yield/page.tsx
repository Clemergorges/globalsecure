import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import YieldClient from './YieldClient';
import { cookies, headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type YieldPowerResponse = {
  yieldEnabled: boolean;
  usd: {
    powerUsd: number;
    debtUsd: number;
    reservedUsd: number;
    availableUsd: number;
  };
};

type YieldPositionItem = {
  transferId: string;
  createdAt: string;
  amount: number;
  currency: string;
  recipientEmail: string;
  transferStatus: string;
  transferType: string;
  yieldPositionId: string;
};

type YieldSummary = {
  totalPrincipalEur: number;
  positionsCount: number;
  positions: YieldPositionItem[];
};

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') || 'http';
  const host = h.get('x-forwarded-host') || h.get('host');
  return `${proto}://${host}`;
}

async function getCookieHeader() {
  const c = (await cookies()).getAll();
  return c.map((ck) => `${ck.name}=${ck.value}`).join('; ');
}

async function serverFetchJson<T>(path: string): Promise<T> {
  const h = await headers();
  const headerUserId = h.get('x-user-id');
  const headerRole = h.get('x-user-role');
  const headerEmail = h.get('x-user-email');
  const headerUserAgent = h.get('user-agent');

  const forwardHeaders: Record<string, string> = {
    cookie: await getCookieHeader(),
  };
  if (headerUserId) forwardHeaders['x-user-id'] = headerUserId;
  if (headerRole) forwardHeaders['x-user-role'] = headerRole;
  if (headerEmail) forwardHeaders['x-user-email'] = headerEmail;
  if (headerUserAgent) forwardHeaders['user-agent'] = headerUserAgent;

  const res = await fetch(`${await getBaseUrl()}${path}`, {
    method: 'GET',
    headers: {
      ...forwardHeaders,
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`FETCH_${path}_${res.status}`);
  return (await res.json()) as T;
}

export default async function YieldPage() {
  const t = await getTranslations('Yield');
  const session = await getSession();
  if (!session) redirect('/auth/login');

  if (process.env.NEXT_PUBLIC_YIELD_UI_ENABLED !== 'true') {
    return (
      <div className="space-y-6 max-w-[960px] mx-auto pb-20 p-6 md:p-8">
        <Card className="bg-[#111116] border-white/5">
          <CardHeader>
            <CardTitle className="text-white">{t('disabled.title')}</CardTitle>
            <CardDescription className="text-slate-400">{t('disabled.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5">
                {t('disabled.back')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  let initialPower: YieldPowerResponse | null = null;
  let initialSummary: YieldSummary | null = null;
  let initialError: string | null = null;
  try {
    const [power, summary] = await Promise.all([
      serverFetchJson<YieldPowerResponse>('/api/yield/power'),
      serverFetchJson<YieldSummary>('/api/yield/summary'),
    ]);
    initialPower = power;
    initialSummary = summary;
  } catch {
    initialError = t('errors.loadFailed');
  }
  return <YieldClient initialPower={initialPower} initialSummary={initialSummary} initialError={initialError} />;
}
