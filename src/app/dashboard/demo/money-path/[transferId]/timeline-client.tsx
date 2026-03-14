'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  ShieldCheck,
  ArrowLeftRight,
  Network,
  Building2,
  UserRound,
  Sparkles,
  BadgeCheck,
} from 'lucide-react';
import { cn, formatCurrencyLocale } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type MoneyPathStageStatus = 'DONE' | 'CURRENT' | 'UPCOMING';
type MoneyPathStageKind = 'ORIGIN' | 'SECURITY' | 'FX' | 'RAIL' | 'PARTNER' | 'DESTINATION';

type TimelineStage = {
  kind: MoneyPathStageKind;
  status: MoneyPathStageStatus;
  at: string | null;
  data: Record<string, any>;
};

type TimelineData = {
  transfer: {
    id: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
    recipientEmail: string;
    amountSent: string;
    currencySent: string;
    amountReceived: string;
    currencyReceived: string;
    exchangeRate: string;
    fee: string;
    feePercentage: string;
  };
  header: {
    transferCode: string;
    corridor: { originCountry: string | null; destinationCountry: string | null };
  };
  routing: {
    rail: string | null;
    estimatedFeePct: string | null;
    estimatedFeeAmount: string | null;
    estimatedTimeSec: number | null;
    comparisons: Array<{ rail: string; feePct: string; timeSec: number }>;
  };
  stages: TimelineStage[];
};

function iconForStage(kind: MoneyPathStageKind) {
  switch (kind) {
    case 'ORIGIN':
      return CreditCard;
    case 'SECURITY':
      return ShieldCheck;
    case 'FX':
      return ArrowLeftRight;
    case 'RAIL':
      return Network;
    case 'PARTNER':
      return Building2;
    case 'DESTINATION':
      return UserRound;
  }
}

function statusToPct(stages: TimelineStage[]) {
  const idx = stages.findIndex((s) => s.status === 'CURRENT');
  if (idx === -1) return 1;
  if (stages.length <= 1) return 0;
  return idx / (stages.length - 1);
}

function formatTimeEstimate(t: ReturnType<typeof useTranslations>, seconds: number | null) {
  if (!seconds || seconds <= 0) return t('common.unknown');
  if (seconds < 60) return t('common.seconds', { n: seconds });
  if (seconds < 60 * 60) return t('common.minutes', { n: Math.round(seconds / 60) });
  const hours = Math.round(seconds / 3600);
  if (hours < 24) return t('common.hours', { n: hours });
  return t('common.days', { n: Math.round(hours / 24) });
}

export default function MoneyPathTimelineClient({ transferId }: { transferId: string }) {
  const t = useTranslations('MoneyPath');
  const locale = useLocale();
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MoneyPathStageKind | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function load() {
    setErrorCode(null);
    try {
      const res = await fetch(`/api/demo/money-path/${transferId}`, { method: 'GET' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorCode(String(json?.code || 'ERROR'));
        return;
      }
      setData(json?.data as TimelineData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = window.setInterval(() => {
      load();
    }, 6000);
    return () => window.clearInterval(interval);
  }, [transferId]);

  const stages = data?.stages || [];
  const progress = useMemo(() => statusToPct(stages), [stages]);
  const selectedStage = useMemo(() => {
    const kind = selected || stages.find((s) => s.status === 'CURRENT')?.kind || null;
    return kind ? stages.find((s) => s.kind === kind) || null : null;
  }, [selected, stages]);

  const money = useMemo(() => {
    if (!data) return null;
    const sent = formatCurrencyLocale(data.transfer.amountSent, data.transfer.currencySent, locale);
    const received = formatCurrencyLocale(data.transfer.amountReceived, data.transfer.currencyReceived, locale);
    const fee = formatCurrencyLocale(data.transfer.fee, data.transfer.currencySent, locale);
    return { sent, received, fee };
  }, [data, locale]);

  return (
    <div className="min-h-[calc(100vh-64px)] px-6 md:px-10 py-8">
      <div className="flex items-start justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-cyan-300" />
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t('timeline.title')}</h1>
          </div>
          <p className="text-muted-foreground mt-2">{t('timeline.tagline')}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{t('timeline.transferIdLabel')}</div>
          <div className="font-mono text-sm text-white/90">{data?.header.transferCode || '...'}</div>
          <div className="mt-2 flex justify-end">
            <Badge variant="secondary" className="bg-white/10 border-white/10">
              {data ? t(`status.${data.transfer.status}` as any) : t('status.LOADING')}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-6">
        <Card className="p-6 bg-white/5 border-white/10 backdrop-blur overflow-hidden">
          <div className="relative">
            <div className="absolute -top-20 -left-10 w-72 h-72 bg-cyan-500/10 blur-[90px] rounded-full" />
            <div className="absolute -bottom-24 -right-10 w-72 h-72 bg-fuchsia-500/10 blur-[90px] rounded-full" />
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">{t('timeline.liveHint')}</div>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-300" />
                  <div className="text-xs text-white/70">{t('timeline.demoDisclaimer')}</div>
                </div>
              </div>

              <div className="mt-8">
                {loading ? (
                  <div className="space-y-6">
                    <Skeleton className="h-10 w-2/3 bg-white/10" />
                    <Skeleton className="h-36 w-full bg-white/10" />
                  </div>
                ) : errorCode ? (
                  <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200">
                    {t('errors.timelineLoad', { code: errorCode })}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-fuchsia-400"
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.round(progress * 100)}%` }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      />
                      <motion.div
                        className="absolute inset-0 opacity-70"
                        animate={{ backgroundPositionX: ['0%', '100%'] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
                        style={{
                          backgroundImage:
                            'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0) 100%)',
                          backgroundSize: '200% 100%',
                        }}
                      />
                    </div>

                    <div className="mt-8 overflow-x-auto">
                      <div className="min-w-[760px] grid grid-cols-6 gap-4">
                        {stages.map((s) => {
                          const Icon = iconForStage(s.kind);
                          const isSelected = selectedStage?.kind === s.kind;
                          const glow =
                            s.status === 'DONE'
                              ? 'shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_0_40px_rgba(34,211,238,0.10)]'
                              : s.status === 'CURRENT'
                                ? 'shadow-[0_0_0_1px_rgba(167,139,250,0.25),0_0_60px_rgba(167,139,250,0.18)]'
                                : 'shadow-[0_0_0_1px_rgba(255,255,255,0.06)]';

                          return (
                            <motion.button
                              key={s.kind}
                              type="button"
                              onClick={() => setSelected(s.kind)}
                              className={cn(
                                'relative text-left rounded-2xl border bg-black/20 border-white/10 p-4 transition',
                                'hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cyan-400/40',
                                isSelected && 'border-cyan-300/40',
                                glow,
                              )}
                              initial={false}
                              whileHover={{ y: -2 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={cn(
                                      'w-10 h-10 rounded-xl flex items-center justify-center',
                                      s.status === 'DONE' && 'bg-cyan-500/15 text-cyan-200',
                                      s.status === 'CURRENT' && 'bg-fuchsia-500/15 text-fuchsia-200',
                                      s.status === 'UPCOMING' && 'bg-white/5 text-white/70',
                                    )}
                                  >
                                    <Icon className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-white/90">{t(`stages.${s.kind}.title` as any)}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{t(`stages.${s.kind}.subtitle` as any)}</div>
                                  </div>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'bg-white/10 border-white/10',
                                    s.status === 'CURRENT' && 'bg-fuchsia-500/15 border-fuchsia-400/20 text-fuchsia-100',
                                    s.status === 'DONE' && 'bg-cyan-500/10 border-cyan-400/15 text-cyan-100',
                                  )}
                                >
                                  {t(`stageStatus.${s.status}` as any)}
                                </Badge>
                              </div>

                              <div className="mt-4 space-y-1">
                                {s.kind === 'ORIGIN' && money ? (
                                  <>
                                    <div className="text-xs text-white/80">{t('timeline.originAmount', { amount: money.sent })}</div>
                                    <div className="text-xs text-muted-foreground">{t('timeline.entryFeeDemo')}</div>
                                  </>
                                ) : null}

                                {s.kind === 'FX' && data ? (
                                  <>
                                    <div className="text-xs text-white/80">
                                      {t('timeline.fxPair', { from: data.transfer.currencySent, to: data.transfer.currencyReceived })}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {t('timeline.fxFees', { feePct: data.transfer.feePercentage })}
                                    </div>
                                  </>
                                ) : null}

                                {s.kind === 'RAIL' && data?.routing ? (
                                  <>
                                    <div className="text-xs text-white/80">{t('timeline.railChosen', { rail: data.routing.rail || t('common.unknown') })}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {t('timeline.railEstimate', { time: formatTimeEstimate(t, data.routing.estimatedTimeSec) })}
                                    </div>
                                  </>
                                ) : null}

                                {s.kind === 'DESTINATION' && money ? (
                                  <>
                                    <div className="text-xs text-white/80">{t('timeline.finalAmount', { amount: money.received })}</div>
                                    <div className="text-xs text-muted-foreground">{t('timeline.totalFees', { fee: money.fee, pct: data?.transfer.feePercentage || '0' })}</div>
                                  </>
                                ) : null}
                              </div>

                              {s.status === 'CURRENT' ? (
                                <motion.div
                                  className="absolute -inset-px rounded-2xl pointer-events-none"
                                  animate={{ opacity: [0.35, 0.9, 0.35] }}
                                  transition={{ duration: 2.2, repeat: Infinity }}
                                  style={{
                                    background:
                                      'linear-gradient(135deg, rgba(34,211,238,0.35) 0%, rgba(59,130,246,0.25) 45%, rgba(217,70,239,0.25) 100%)',
                                    filter: 'blur(10px)',
                                  }}
                                />
                              ) : null}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white/5 border-white/10 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white/90">{t('side.title')}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('side.subtitle')}</div>
            </div>
            <Button variant="secondary" className="bg-white/10 border-white/10" onClick={() => setSelected(null)}>
              {t('side.reset')}
            </Button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-black/20 border border-white/10 p-4">
              <div className="text-xs text-muted-foreground">{t('side.routeSummary')}</div>
              <div className="mt-1 text-sm text-white/90">
                {data?.routing?.rail ? t(`railSummary.${data.routing.rail}` as any) : t('common.unknown')}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <div className="text-xs text-muted-foreground">{t('side.estimatedCost')}</div>
                  <div className="mt-1 text-sm text-white/90">
                    {data?.routing?.estimatedFeePct ? `${data.routing.estimatedFeePct}%` : t('common.unknown')}
                  </div>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <div className="text-xs text-muted-foreground">{t('side.estimatedTime')}</div>
                  <div className="mt-1 text-sm text-white/90">{formatTimeEstimate(t, data?.routing?.estimatedTimeSec || null)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-black/20 border border-white/10 p-4">
              <div className="text-xs text-muted-foreground">{t('side.selectedStage')}</div>
              <div className="mt-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedStage?.kind || 'none'}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {selectedStage ? (
                      <div>
                        <div className="text-sm font-medium text-white/90">{t(`stages.${selectedStage.kind}.title` as any)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{t(`stages.${selectedStage.kind}.details` as any)}</div>
                        {selectedStage.at ? (
                          <div className="text-xs text-white/70 mt-3">{t('side.at', { at: selectedStage.at })}</div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">{t('side.none')}</div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="rounded-xl bg-black/20 border border-white/10 p-4">
              <div className="text-xs text-muted-foreground">{t('side.comparisonTitle')}</div>
              <div className="mt-3 space-y-2">
                {(data?.routing?.comparisons || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t('side.comparisonEmpty')}</div>
                ) : (
                  data!.routing.comparisons.map((c) => (
                    <div key={c.rail} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 border border-white/10 p-3">
                      <div className="text-sm text-white/85">{t(`rails.${c.rail}` as any)}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('side.comparisonRow', { feePct: c.feePct, time: formatTimeEstimate(t, c.timeSec) })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

