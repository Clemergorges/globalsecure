'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ShieldAlert, TrendingUp } from 'lucide-react';
import { cn, formatCurrencyLocale } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useFeeConfig } from '@/hooks/useFeeConfig';

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

export default function YieldClient(props: {
  initialPower?: YieldPowerResponse | null;
  initialSummary?: YieldSummary | null;
  initialError?: string | null;
}) {
  const locale = useLocale();
  const t = useTranslations('Yield');
  const tc = useTranslations('Common');
  const feeCfg = useFeeConfig();
  const router = useRouter();
  const error = props.initialError || null;
  const power = props.initialPower || null;
  const summary = props.initialSummary || null;
  const loading = false;

  const displayTotalEur = useMemo(() => {
    const value = summary?.totalPrincipalEur;
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return formatCurrencyLocale(value, 'EUR', locale);
  }, [summary?.totalPrincipalEur, locale]);

  const apyPct = feeCfg.data.yield_apy_percent;

  function uiTransferStatus(p: YieldPositionItem) {
    if (p.transferStatus === 'CANCELED' || p.transferStatus === 'FAILED' || p.transferStatus === 'REFUNDED') return 'liquidada';
    return 'ativa';
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto pb-20 p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
            <p className="text-slate-400">{t('subtitle')}</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2 border-white/10 text-slate-300 hover:bg-white/5">
              <ArrowLeft className="w-4 h-4" />
              {tc('back')}
            </Button>
          </Link>
        </div>

        <Card className="bg-red-950/20 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-white">{t('errors.loadFailedTitle')}</CardTitle>
            <CardDescription className="text-red-300/80">{t('errors.loadFailedDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => router.refresh()} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
              {t('errors.retry')}
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5">
                {t('errors.backToDashboard')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const positions = summary?.positions || [];

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
          <p className="text-slate-400">{t('subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2 border-white/10 text-slate-300 hover:bg-white/5">
              <ArrowLeft className="w-4 h-4" />
              {tc('back')}
            </Button>
          </Link>
          <Button onClick={() => router.refresh()} variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5">
            {t('reload')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-[#111116] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">{t('summary.title')}</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-slate-500">{t('summary.totalPrincipalLabel')}</div>
                <div className="text-3xl font-bold text-white tracking-tight">{displayTotalEur}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">{t('summary.positionsLabel')}</div>
                <div className="text-sm font-mono text-white">{summary?.positionsCount ?? 0}</div>
            </div>
          </CardContent>
        </Card>


        <Card className="bg-[#111116] border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Poder de compra (USD)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">Poder</div>
              <div className="text-sm font-mono text-white">{formatCurrencyLocale(power?.usd.powerUsd || 0, 'USD', locale)}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">Dívida</div>
              <div className="text-sm font-mono text-white">{formatCurrencyLocale(power?.usd.debtUsd || 0, 'USD', locale)}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">Reservado</div>
              <div className="text-sm font-mono text-white">{formatCurrencyLocale(power?.usd.reservedUsd || 0, 'USD', locale)}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">Disponível</div>
              <div className="text-sm font-mono text-white">{formatCurrencyLocale(power?.usd.availableUsd || 0, 'USD', locale)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111116] border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">{t('product.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-white font-semibold">{t('title')}</div>
                <div className="text-sm text-slate-400">{t('product.apy', { percent: apyPct.toFixed(1) })}</div>
                <div className="text-[11px] text-slate-500">
                  {tc(`feeConfig.source.${feeCfg.data.source}` as any)}
                  {feeCfg.isFallback ? (
                    <span className="ml-2 inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                      {tc('feeConfig.estimate')}
                    </span>
                  ) : null}
                  {feeCfg.error ? <span className="ml-2">{tc('feeConfig.fallbackNotice')}</span> : null}
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider bg-purple-500/10 text-purple-300 border-purple-500/20">
                {t('beta')}
              </span>
            </div>
            {feeCfg.loading ? <div className="text-xs text-slate-500">{tc('feeConfig.loading')}</div> : null}
            <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-amber-300">
                <ShieldAlert className="w-4 h-4" /> {t('disclaimer.title')}
              </div>
              <div>{t('disclaimer.paragraph1')}</div>
              <div className="text-slate-500">{t('disclaimer.paragraph2')}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">{t('product.enabledLabel')}</div>
              <div className="text-sm font-mono text-white">{power?.yieldEnabled ? t('product.enabledYes') : t('product.enabledNo')}</div>
            </div>
            <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 w-full">
              {t('product.viewDetails')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#111116] border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-white font-semibold">Posições / transferências com yield</CardTitle>
          <CardDescription className="text-slate-400">Baseado em transfers com yieldPositionId.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="text-slate-400">Data</TableHead>
                <TableHead className="text-slate-400">Moeda</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-right text-slate-400">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="p-10 text-center text-slate-500">
                    Nenhuma posição encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((p) => {
                  const uiStatus = uiTransferStatus(p);
                  return (
                    <TableRow key={p.transferId} className="hover:bg-white/[0.02] border-white/5 transition-colors">
                      <TableCell className="text-slate-300">
                        {new Date(p.createdAt).toLocaleDateString(locale)}
                      </TableCell>
                      <TableCell className="text-slate-300 font-mono">{p.currency}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider',
                            uiStatus === 'ativa'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                          )}
                        >
                          {uiStatus}
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

      <Card className="bg-amber-950/10 border-amber-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-white font-semibold">Avisos de risco</CardTitle>
          <CardDescription className="text-slate-300">Leia com atenção antes de usar rendimento.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-amber-100/90">
          <ul className="list-disc pl-5 space-y-2">
            <li>Cripto é volátil e pode sofrer variações significativas.</li>
            <li>O principal pode variar e não há garantia de retorno.</li>
            <li>Você é responsável por impostos e obrigações fiscais.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
