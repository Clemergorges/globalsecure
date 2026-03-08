'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, SlidersHorizontal, UserCheck } from 'lucide-react';
import { formatCurrencyLocale } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';
import { AmlStatusCard } from '@/components/compliance/AmlStatusCard';

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

export default function LimitsClient(props: { initialOverview?: UserOverview | null; initialError?: string | null }) {
  const locale = useLocale();
  const t = useTranslations('Limits');
  const [loading, setLoading] = useState(!props.initialError && !props.initialOverview);
  const [error, setError] = useState<string | null>(props.initialError || null);
  const [overview, setOverview] = useState<UserOverview | null>(props.initialOverview || null);

  const kycNextStep = useCallback((level: string | null) => {
    if (!level) return t('kycNextStep.none');
    if (level === 'BASIC') return t('kycNextStep.basic');
    if (level === 'ADVANCED') return t('kycNextStep.advanced');
    if (level === 'PREMIUM') return t('kycNextStep.premium');
    return t('kycNextStep.generic');
  }, [t]);

  const riskExplanation = useCallback((tier: string) => {
    if (tier === 'LOW') return t('riskExplanation.low');
    if (tier === 'MEDIUM') return t('riskExplanation.medium');
    if (tier === 'HIGH') return t('riskExplanation.high');
    return t('riskExplanation.generic');
  }, [t]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/overview', { method: 'GET' });
      const body = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setError('LOAD_FAILED');
        setOverview(null);
        return;
      }
      setOverview(body.data as UserOverview);
    } catch {
      setError('LOAD_FAILED');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!overview && !error) reload();
  }, [overview, error, reload]);

  const limits = overview?.limits || null;
  const kycLevelLabel = overview?.user.kycLevel || 'não definido';

  const perTx = useMemo(() => {
    if (!limits?.perTx) return null;
    return formatCurrencyLocale(limits.perTx, limits.currency, locale);
  }, [limits?.perTx, limits?.currency, locale]);

  const daily = useMemo(() => {
    if (!limits?.daily) return null;
    return formatCurrencyLocale(limits.daily, limits.currency, locale);
  }, [limits?.daily, limits?.currency, locale]);

  const monthly = useMemo(() => {
    if (!limits?.monthly) return null;
    return formatCurrencyLocale(limits.monthly, limits.currency, locale);
  }, [limits?.monthly, limits?.currency, locale]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
          <p className="text-slate-400">{t('subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard">
            <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5">
              {t('backToDashboard')}
            </Button>
          </Link>
          <Button onClick={reload} variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5" disabled={loading}>
            {loading ? t('loading') : t('reload')}
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="bg-red-950/20 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-white">{t('error.loadFailedTitle')}</CardTitle>
            <CardDescription className="text-red-300/80">{t('error.loadFailedDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={reload} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
              {t('error.retryButton')}
            </Button>
            <Link href="/dashboard/settings/kyc">
              <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5">
                {t('completeKyc')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-[#111116] border-white/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">{t('kycTitle')}</CardTitle>
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <UserCheck className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-300">{t('level')}</div>
                  <div className="text-sm font-mono text-white">{loading ? '—' : kycLevelLabel}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-300">{t('status')}</div>
                  <div className="text-sm font-mono text-white">{loading ? '—' : overview?.user.kycStatus || '—'}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-300">{t('country')}</div>
                  <div className="text-sm font-mono text-white">{loading ? '—' : overview?.user.country || '—'}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-slate-300">
                  {loading ? '—' : kycNextStep(overview?.user.kycLevel || null)}
                </div>
                <Link href="/dashboard/settings/kyc">
                  <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
                    {t('completeKyc')}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-[#111116] border-white/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">{t('riskTitle')}</CardTitle>
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-300">{t('riskTierLabel')}</div>
                  <div className="text-sm font-mono text-white">{loading ? '—' : overview?.user.riskTier || '—'}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-slate-300">
                  {loading ? '—' : riskExplanation(overview?.user.riskTier || '')}
                </div>
                <div className="text-xs text-slate-500">
                  {t('riskNote')}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-[#111116] border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-white font-semibold">{t('limitsTitle')}</CardTitle>
              <CardDescription className="text-slate-400">{t('limitsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!limits ? (
                <div className="text-sm text-slate-400">{t('limitsUnavailable')}</div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                    <div className="text-xs text-slate-500 uppercase mb-1">{t('perTx')}</div>
                    <div className="text-white font-mono">{loading ? '—' : perTx || '—'}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                    <div className="text-xs text-slate-500 uppercase mb-1">{t('perDay')}</div>
                    <div className="text-white font-mono">{loading ? '—' : daily || '—'}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                    <div className="text-xs text-slate-500 uppercase mb-1">{t('perMonth')}</div>
                    <div className="text-white font-mono">{loading ? '—' : monthly || '—'}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#111116] border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-white font-semibold">{t('amlTitle')}</CardTitle>
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">{t('openCases')}</div>
                <div className="text-sm font-mono text-white">{loading ? '—' : overview?.aml.openCases ?? 0}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">{t('highestRisk')}</div>
                <div className="text-sm font-mono text-white">{loading ? '—' : overview?.aml.highestRiskLevel || '—'}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-slate-300">
                {t('amlNote')}
              </div>
              <div className="flex gap-3">
                <Link href="/dashboard/settings/security" className="flex-1">
                  <Button variant="outline" className="w-full border-white/10 text-slate-300 hover:bg-white/5">
                    {t('viewSecurity')}
                  </Button>
                </Link>
                <Link href="/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full border-white/10 text-slate-300 hover:bg-white/5">
                    {t('backToDashboard')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <AmlStatusCard />
        </>
      )}
    </div>
  );
}
