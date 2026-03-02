import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { cookies, headers } from 'next/headers';
import LimitsClient from './LimitsClient';

type UserOverview = {
  user: {
    id: string;
    email: string;
    kycStatus: string;
    kycLevel: string | null;
    riskTier: string;
    country: string | null;
  };
  balances: { currency: string; amount: string; type: 'FIAT_ACCOUNT' | 'FIAT_AGGREGATED' | 'CRYPTO' }[];
  limits:
    | {
        perTx: string | null;
        daily: string | null;
        monthly: string | null;
        currency: string;
      }
    | null;
  yield: { enabled: boolean; totalLiabilityUsd: string; pendingLiabilities: number };
  aml: { openCases: number; highestRiskLevel: string | null };
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
  const headerUserAgent = h.get('user-agent');

  const forwardHeaders: Record<string, string> = {
    cookie: await getCookieHeader(),
  };
  if (headerUserAgent) forwardHeaders['user-agent'] = headerUserAgent;

  const res = await fetch(`${await getBaseUrl()}${path}`, {
    method: 'GET',
    headers: forwardHeaders,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`FETCH_${path}_${res.status}`);
  return (await res.json()) as T;
}

export default async function LimitsPage() {
  const session = await getSession();
  if (!session) redirect('/auth/login');

  let initialOverview: UserOverview | null = null;
  let initialError: string | null = null;
  try {
    const body = await serverFetchJson<{ data: UserOverview }>('/api/dashboard/overview');
    initialOverview = body.data;
  } catch {
    initialError = 'Não foi possível carregar seus limites';
  }
  return <LimitsClient initialOverview={initialOverview} initialError={initialError} />;
}
