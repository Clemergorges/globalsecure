'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDownLeft, ArrowRightLeft, ShieldAlert, TrendingUp, Wallet } from 'lucide-react';
import { formatCurrencyLocale } from '@/lib/utils';

type UserOverview = {
  user: {
    id: string;
    email: string;
    kycStatus: string;
    kycLevel: string | null;
    riskTier: string;
    country: string | null;
  };
  balances: {
    currency: string;
    amount: string;
    type: 'FIAT_ACCOUNT' | 'FIAT_AGGREGATED' | 'CRYPTO';
  }[];
  limits:
    | {
        perTx: string | null;
        daily: string | null;
        monthly: string | null;
        currency: string;
      }
    | null;
  yield: {
    enabled: boolean;
    totalLiabilityUsd: string;
    pendingLiabilities: number;
  };
  aml: {
    openCases: number;
    highestRiskLevel: string | null;
  };
};

function formatFiat(amount: string, currency: string) {
  try {
    return formatCurrencyLocale(amount, currency, 'pt-PT');
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatCrypto(amount: string, currency: string) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return `${amount} ${currency}`;
  return `${new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 6, maximumFractionDigits: 6 }).format(num)} ${currency}`;
}

function formatMaybeFiat(amount: string, currency: string) {
  if (currency === 'USDT') return formatCrypto(amount, currency);
  return formatFiat(amount, currency);
}

export default function DashboardOverviewClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserOverview | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/overview', { method: 'GET' });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((body as any)?.code || 'FETCH_FAILED');
      }
      setData((body as any)?.data || null);
    } catch (e: any) {
      setError(e?.message || 'FETCH_FAILED');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const groups = useMemo(() => {
    const balances = data?.balances || [];
    return {
      FIAT_ACCOUNT: balances.filter((b) => b.type === 'FIAT_ACCOUNT'),
      FIAT_AGGREGATED: balances.filter((b) => b.type === 'FIAT_AGGREGATED'),
      CRYPTO: balances.filter((b) => b.type === 'CRYPTO'),
    };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-[#111116] border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Saldos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-7 bg-white/5 rounded" />
              <div className="h-7 bg-white/5 rounded" />
              <div className="h-7 bg-white/5 rounded" />
            </CardContent>
          </Card>
          <Card className="bg-[#111116] border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">KYC & Risco</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-7 bg-white/5 rounded" />
              <div className="h-7 bg-white/5 rounded" />
              <div className="h-7 bg-white/5 rounded" />
            </CardContent>
          </Card>
          <Card className="bg-[#111116] border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Rendimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-7 bg-white/5 rounded" />
              <div className="h-7 bg-white/5 rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-red-950/20 border-red-500/20">
        <CardHeader>
          <CardTitle className="text-white">Não foi possível carregar a visão geral</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-sm text-red-300/80">Tente novamente.</div>
          <div className="flex gap-3">
            <Button onClick={fetchOverview} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
              Recarregar
            </Button>
            <Link href="/dashboard/wallet/deposit">
              <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5">
                Depositar
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const limits = data.limits;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-[#111116] border-white/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Saldos</CardTitle>
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Wallet className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Conta principal</div>
              {groups.FIAT_ACCOUNT.length === 0 ? (
                <div className="text-sm text-slate-400">Sem saldos</div>
              ) : (
                <div className="space-y-1">
                  {groups.FIAT_ACCOUNT.map((b) => (
                    <div key={`fa-${b.currency}`} className="flex items-center justify-between">
                      <div className="text-sm text-slate-300">{b.currency}</div>
                      <div className="text-sm font-mono text-white">{formatMaybeFiat(b.amount, b.currency)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {groups.FIAT_AGGREGATED.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Outros saldos fiat</div>
                <div className="space-y-1">
                  {groups.FIAT_AGGREGATED.map((b) => (
                    <div key={`fg-${b.currency}`} className="flex items-center justify-between">
                      <div className="text-sm text-slate-300">{b.currency}</div>
                      <div className="text-sm font-mono text-white">{formatMaybeFiat(b.amount, b.currency)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {groups.CRYPTO.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Cripto (USDT Polygon)</div>
                <div className="space-y-1">
                  {groups.CRYPTO.map((b, idx) => (
                    <div key={`c-${b.currency}-${idx}`} className="flex items-center justify-between">
                      <div className="text-sm text-slate-300">{b.currency}</div>
                      <div className="text-sm font-mono text-white">{formatCrypto(b.amount, b.currency)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#111116] border-white/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">KYC & Risco</CardTitle>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">Nível KYC</div>
                <div className="text-sm font-mono text-white">{data.user.kycLevel || 'não definido'}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">Status</div>
                <div className="text-sm font-mono text-white">{data.user.kycStatus}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">Risk tier</div>
                <div className="text-sm font-mono text-white">{data.user.riskTier}</div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Limites</div>
              {limits ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-300">Por transação</div>
                    <div className="text-sm font-mono text-white">{limits.perTx ? formatFiat(limits.perTx, limits.currency) : '—'}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-300">Por dia</div>
                    <div className="text-sm font-mono text-white">{limits.daily ? formatFiat(limits.daily, limits.currency) : '—'}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-300">Por mês</div>
                    <div className="text-sm font-mono text-white">{limits.monthly ? formatFiat(limits.monthly, limits.currency) : '—'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400">Limites indisponíveis</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111116] border-white/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Rendimento</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">Ativo</div>
                <div className="text-sm font-mono text-white">{data.yield.enabled ? 'sim' : 'não'}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">Rendimento total (USD)</div>
                <div className="text-sm font-mono text-white">{formatFiat(data.yield.totalLiabilityUsd, 'USD')}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">Pendências</div>
                <div className="text-sm font-mono text-white">{data.yield.pendingLiabilities}</div>
              </div>
            </div>
            <div className="flex justify-end">
              <Link href="/dashboard/yield" className="text-sm text-emerald-400 hover:text-emerald-300 font-medium">
                Ver detalhes
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-[#111116] border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">AML & Segurança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">Casos em análise</div>
              <div className="text-sm font-mono text-white">{data.aml.openCases}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">Risco mais alto</div>
              <div className="text-sm font-mono text-white">{data.aml.highestRiskLevel || '—'}</div>
            </div>
            <div className="pt-3">
              <Link href="/dashboard/settings/security">
                <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 w-full">
                  Ver segurança
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111116] border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Ações</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link href="/dashboard/wallet/deposit">
              <Button className="w-full gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
                <ArrowDownLeft className="w-4 h-4" /> Depositar
              </Button>
            </Link>
            <Link href="/dashboard/fx">
              <Button variant="outline" className="w-full gap-2 border-cyan-500/20 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10">
                <ArrowRightLeft className="w-4 h-4" /> Converter moedas
              </Button>
            </Link>
            <Link href="/dashboard/wallet/crypto">
              <Button variant="outline" className="w-full gap-2 border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                <Wallet className="w-4 h-4" /> Carteira cripto (USDT Polygon)
              </Button>
            </Link>
            <Link href="/dashboard/yield">
              <Button variant="outline" className="w-full gap-2 border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                <TrendingUp className="w-4 h-4" /> Ver rendimento
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

