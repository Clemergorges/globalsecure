import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import YieldClient from './YieldClient';
import { cookies, headers } from 'next/headers';

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
  const session = await getSession();
  if (!session) redirect('/auth/login');
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
    initialError = 'Não foi possível carregar rendimento';
  }
  return <YieldClient initialPower={initialPower} initialSummary={initialSummary} initialError={initialError} />;
}
