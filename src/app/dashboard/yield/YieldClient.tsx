"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Activity, ArrowLeft, TrendingUp } from 'lucide-react';
import { cn, formatCurrencyLocale } from '@/lib/utils';

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

function shortId(id: string) {
  if (!id) return '';
  if (id.length <= 10) return id;
  return `${id.slice(0, 8)}…${id.slice(-2)}`;
}

export default function YieldClient() {
  const t = useTranslations('Yield');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<YieldSummary | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      try {
        const res = await fetch('/api/yield/summary');
        const data = (await res.json()) as YieldSummary;
        setSummary(data);
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  const positions = summary?.positions ?? [];

  const displayTotalEur = useMemo(() => {
    const value = summary?.totalPrincipalEur;
    if (typeof value !== 'number' || Number.isNaN(value)) return null;
    return formatCurrencyLocale(value, 'EUR', locale);
  }, [summary?.totalPrincipalEur, locale]);

  function getUiStatus(p: YieldPositionItem) {
    if (p.transferStatus === 'CANCELED' || p.transferStatus === 'FAILED' || p.transferStatus === 'REFUNDED') {
      return 'CLOSED';
    }
    return 'OPEN';
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-20 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
          <p className="text-slate-400">{t('subtitle')}</p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" className="gap-2 border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
            <ArrowLeft className="w-4 h-4" />
            {tc('back')}
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-[#111116] border-white/5 backdrop-blur-sm relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">{t('summary.title')}</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">{t('summary.totalPrincipalLabel')}</div>
                <div className="text-3xl font-bold text-white tracking-tight">
                  {loading ? '—' : displayTotalEur ?? '—'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">{t('summary.positionsLabel')}</div>
                <div className="text-2xl font-bold text-white">{loading ? '—' : summary?.positionsCount ?? 0}</div>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {t('summary.note')}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111116] border-white/5 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">{t('disclaimer.title')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300 space-y-2">
            <div>{t('disclaimer.paragraph1')}</div>
            <div className="text-slate-500">{t('disclaimer.paragraph2')}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#111116] rounded-xl border border-white/5 shadow-sm overflow-hidden backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-white font-semibold">{t('list.title')}</CardTitle>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider bg-purple-500/10 text-purple-300 border-purple-500/20">
            {t('beta')}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="text-slate-400">{t('list.table.date')}</TableHead>
                <TableHead className="text-slate-400">{t('list.table.recipient')}</TableHead>
                <TableHead className="text-slate-400">{t('list.table.position')}</TableHead>
                <TableHead className="text-slate-400">{t('list.table.status')}</TableHead>
                <TableHead className="text-right text-slate-400">{t('list.table.amount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <div className="p-8 space-y-4">
                      <div className="h-8 bg-white/5 rounded w-full animate-pulse" />
                      <div className="h-8 bg-white/5 rounded w-full animate-pulse" />
                      <div className="h-8 bg-white/5 rounded w-full animate-pulse" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-slate-500">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    {t('list.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((p) => {
                  const uiStatus = getUiStatus(p);
                  return (
                    <TableRow key={p.transferId} className="hover:bg-white/[0.02] border-white/5 transition-colors">
                      <TableCell className="text-slate-300">
                        {new Date(p.createdAt).toLocaleDateString(locale)}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        <div className="min-w-0 truncate">{p.recipientEmail}</div>
                        <div className="text-xs text-slate-500 truncate">{shortId(p.transferId)}</div>
                      </TableCell>
                      <TableCell className="text-slate-300 font-mono">{shortId(p.yieldPositionId)}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider",
                          uiStatus === 'OPEN'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                        )}>
                          {uiStatus === 'OPEN' ? t('status.open') : t('status.closed')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold tracking-tight text-slate-300">
                        {formatCurrencyLocale(p.amount, p.currency, locale)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
