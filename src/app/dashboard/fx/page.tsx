'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRightLeft, Loader2 } from 'lucide-react';
import { formatCurrencyLocale } from '@/lib/utils';

type FxQuote = {
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  rate: string;
  fee: string;
  total: string;
};

type FxConvert = {
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  rate: string;
  fee: string;
  debitTotal: string;
  credited: string;
  balances: { from: string | null; to: string | null };
  transactionId: string;
};

const CURRENCIES = ['EUR', 'USD', 'BRL'] as const;

function toAmount2(value: string) {
  const n = Number(value.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(2);
}

function fmtFiat(amount: string, currency: string) {
  try {
    return formatCurrencyLocale(amount, currency, 'pt-PT');
  } catch {
    return `${amount} ${currency}`;
  }
}

function mapError(code: string) {
  if (code === 'INSUFFICIENT_FUNDS') return 'Saldo insuficiente para converter esse valor. Ajuste o montante ou deposite.';
  if (code === 'PAIR_NOT_AVAILABLE') return 'Conversão não disponível para esse par de moedas.';
  if (code === 'VALIDATION_ERROR') return 'Revise os campos, há um erro nos dados enviados.';
  if (code === 'UNAUTHORIZED') return 'Você precisa estar logado para converter.';
  return 'Erro inesperado ao converter, tente novamente.';
}

export default function FxPage() {
  const [fromCurrency, setFromCurrency] = useState<(typeof CURRENCIES)[number]>('EUR');
  const [toCurrency, setToCurrency] = useState<(typeof CURRENCIES)[number]>('USD');
  const [amountRaw, setAmountRaw] = useState('100.00');
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingConvert, setLoadingConvert] = useState(false);
  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [convert, setConvert] = useState<FxConvert | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const amount2 = useMemo(() => toAmount2(amountRaw), [amountRaw]);
  const canQuote = useMemo(() => !!amount2 && fromCurrency !== toCurrency && !loadingQuote && !loadingConvert, [amount2, fromCurrency, toCurrency, loadingQuote, loadingConvert]);
  const canConvert = useMemo(() => !!quote && !loadingConvert && !loadingQuote, [quote, loadingConvert, loadingQuote]);

  const fetchQuote = useCallback(async () => {
    setMessage(null);
    setConvert(null);
    const amount = amount2;
    if (!amount) {
      setMessage('Revise os campos, há um erro nos dados enviados.');
      return;
    }
    setLoadingQuote(true);
    try {
      const res = await fetch('/api/fx/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fromCurrency, toCurrency, amount }),
      });
      const body = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setQuote(null);
        setMessage(mapError(body?.code || 'UNKNOWN'));
        return;
      }
      setQuote(body.data);
    } catch {
      setQuote(null);
      setMessage('Erro inesperado ao converter, tente novamente.');
    } finally {
      setLoadingQuote(false);
    }
  }, [amount2, fromCurrency, toCurrency]);

  const doConvert = useCallback(async () => {
    setMessage(null);
    const amount = amount2;
    if (!amount) {
      setMessage('Revise os campos, há um erro nos dados enviados.');
      return;
    }
    setLoadingConvert(true);
    try {
      const res = await fetch('/api/fx/convert', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fromCurrency, toCurrency, amount }),
      });
      const body = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setConvert(null);
        setMessage(mapError(body?.code || 'UNKNOWN'));
        return;
      }
      setConvert(body.data);
      setMessage(`Convertido! Debitado ${fmtFiat(body.data.debitTotal, fromCurrency)}, creditado ${fmtFiat(body.data.credited, toCurrency)}.`);
    } catch {
      setConvert(null);
      setMessage('Erro inesperado ao converter, tente novamente.');
    } finally {
      setLoadingConvert(false);
    }
  }, [amount2, fromCurrency, toCurrency]);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Trocar moedas</h1>
          <p className="text-slate-400">Fluxo simples de conversão com transparência de taxa.</p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" className="gap-2 border-white/10 text-slate-300 hover:bg-white/5">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </Link>
      </div>

      <Card className="bg-[#111116] border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-cyan-400" /> Conversão
          </CardTitle>
          <CardDescription className="text-slate-400">Taxa GSS de 1,8% já incluída no cálculo do fee.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-slate-300">De</Label>
              <Select value={fromCurrency} onValueChange={(v) => { setFromCurrency(v as any); setQuote(null); setConvert(null); setMessage(null); }}>
                <SelectTrigger className="bg-black/30 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Para</Label>
              <Select value={toCurrency} onValueChange={(v) => { setToCurrency(v as any); setQuote(null); setConvert(null); setMessage(null); }}>
                <SelectTrigger className="bg-black/30 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Valor</Label>
              <Input
                value={amountRaw}
                onChange={(e) => { setAmountRaw(e.target.value); setQuote(null); setConvert(null); setMessage(null); }}
                className="bg-black/30 border-white/10 text-white"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <Button onClick={fetchQuote} disabled={!canQuote} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
              {loadingQuote ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Obter cotação'}
            </Button>
            <Button onClick={doConvert} disabled={!canConvert} variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5">
              {loadingConvert ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar conversão'}
            </Button>
          </div>

          {message && (
            <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200">
              {message}
            </div>
          )}

          {quote && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                <div className="text-xs text-slate-500 uppercase mb-1">Taxa</div>
                <div className="text-white font-mono">{quote.rate}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                <div className="text-xs text-slate-500 uppercase mb-1">Taxa GSS (fee)</div>
                <div className="text-white font-mono">{fmtFiat(quote.fee, fromCurrency)}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                <div className="text-xs text-slate-500 uppercase mb-1">Total debitado</div>
                <div className="text-white font-mono">{fmtFiat(quote.total, fromCurrency)}</div>
              </div>
            </div>
          )}

          {convert && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-4 space-y-3">
              <div className="text-emerald-300 font-semibold">Conversão concluída</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="text-sm text-slate-200">
                  Debitado: <span className="font-mono text-white">{fmtFiat(convert.debitTotal, convert.fromCurrency)}</span>
                </div>
                <div className="text-sm text-slate-200">
                  Creditado: <span className="font-mono text-white">{fmtFiat(convert.credited, convert.toCurrency)}</span>
                </div>
                <div className="text-sm text-slate-200">
                  Novo saldo ({convert.fromCurrency}): <span className="font-mono text-white">{convert.balances.from ? fmtFiat(convert.balances.from, convert.fromCurrency) : '—'}</span>
                </div>
                <div className="text-sm text-slate-200">
                  Novo saldo ({convert.toCurrency}): <span className="font-mono text-white">{convert.balances.to ? fmtFiat(convert.balances.to, convert.toCurrency) : '—'}</span>
                </div>
              </div>
              <div className="text-xs text-slate-400">ID: {convert.transactionId}</div>
              <div className="flex gap-3 pt-2">
                <Link href="/dashboard">
                  <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5">
                    Voltar ao dashboard
                  </Button>
                </Link>
                <Link href="/dashboard/transactions">
                  <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5">
                    Ver transações
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

