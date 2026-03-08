'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ShieldCheck, ShieldAlert, ShieldX, Clock3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type AmlStatus = 'VERIFIED' | 'REVIEW' | 'ACTION_REQUIRED' | 'BLOCKED';

type AmlStatusResponse = {
  status: AmlStatus;
  has_open_case: boolean;
  last_update: string;
};

function logDevError(message: string, err: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.error(message, err);
  }
}

function normalize(raw: any): AmlStatusResponse | null {
  const status = raw?.status;
  const hasOpen = raw?.has_open_case;
  const last = raw?.last_update;
  if (status !== 'VERIFIED' && status !== 'REVIEW' && status !== 'ACTION_REQUIRED' && status !== 'BLOCKED') return null;
  if (typeof hasOpen !== 'boolean') return null;
  if (typeof last !== 'string') return null;
  return { status, has_open_case: hasOpen, last_update: last };
}

export function AmlStatusCard() {
  const t = useTranslations('Limits.AmlStatus');

  const [state, setState] = useState<AmlStatusResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/aml/status', { method: 'GET' })
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        const parsed = normalize(j);
        if (!parsed) {
          setFailed(true);
          return;
        }
        setState(parsed);
      })
      .catch((e) => {
        if (!mounted) return;
        setFailed(true);
        logDevError('Failed to fetch AML status', e);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const badge = useMemo(() => {
    if (!state) return null;
    if (state.status === 'VERIFIED') {
      return {
        icon: ShieldCheck,
        label: t('status.verified'),
        className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      };
    }
    if (state.status === 'REVIEW') {
      return {
        icon: Clock3,
        label: t('status.review'),
        className: 'bg-amber-500/10 text-amber-200 border-amber-500/20',
      };
    }
    if (state.status === 'ACTION_REQUIRED') {
      return {
        icon: ShieldAlert,
        label: t('status.actionRequired'),
        className: 'bg-yellow-500/10 text-yellow-200 border-yellow-500/20',
      };
    }
    return {
      icon: ShieldX,
      label: t('status.blocked'),
      className: 'bg-red-500/10 text-red-200 border-red-500/20',
    };
  }, [state, t]);

  if (failed) return null;
  if (!state) return null;

  const BadgeIcon = badge?.icon || ShieldAlert;

  return (
    <Card className="bg-[#111116] border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-white font-semibold">{t('title')}</CardTitle>
        <CardDescription className="text-slate-400">{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-300">{t('label')}</div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider inline-flex items-center gap-1 ${badge?.className || ''}`}>
            <BadgeIcon className="w-3.5 h-3.5" aria-hidden="true" />
            {badge?.label}
          </span>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-slate-300">
          {state.status === 'VERIFIED' && t('help.verified')}
          {state.status === 'REVIEW' && t('help.review')}
          {state.status === 'ACTION_REQUIRED' && t('help.actionRequired')}
          {state.status === 'BLOCKED' && t('help.blocked')}
        </div>
        {(state.status === 'ACTION_REQUIRED' || state.status === 'BLOCKED') && (
          <div className="flex gap-3">
            {state.status === 'ACTION_REQUIRED' && (
              <Link href="/dashboard/settings/kyc" className="flex-1">
                <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">{t('cta.sendDocs')}</Button>
              </Link>
            )}
            <Link href="/dashboard/support" className="flex-1">
              <Button variant="outline" className="w-full border-white/10 text-slate-300 hover:bg-white/5">
                {t('cta.contactSupport')}
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

