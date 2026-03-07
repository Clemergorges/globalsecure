'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Copy, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

type ClaimPublic =
  | { ok: false; error: string }
  | {
      ok: true;
      amount: any;
      currency: string;
      last4: string;
      brand: string;
      expMonth: number;
      expYear: number;
      expiresAt: string;
      locked: boolean;
      message: string | null;
    };

type ClaimUnlock =
  | { ok: false; error: string; attemptsRemaining?: number }
  | { ok: true; cardNumber: string; cvc: string; expMonth: number; expYear: number; brand: string };

function formatCurrency(amount: any, currency: string, locale: string) {
  const num = typeof amount === 'number' ? amount : Number(amount);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(num);
  } catch {
    return `${num} ${currency}`;
  }
}

export default function ClaimPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || '';
  const t = useTranslations('Claim');
  const tc = useTranslations('Common');
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<ClaimPublic | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState<ClaimUnlock | null>(null);
  const [showDetails, setShowDetails] = useState(true);

  const isExpired = useMemo(() => {
    if (!claim || !claim.ok) return false;
    return new Date(claim.expiresAt).getTime() <= Date.now();
  }, [claim]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/claim/${encodeURIComponent(token)}`, { method: 'GET' });
        const data = (await res.json().catch(() => ({}))) as ClaimPublic;
        if (cancelled) return;
        setClaim(data);
        if (!res.ok || !data || (data as any).ok === false) {
          setError((data as any)?.error || t('errors.loadFailed'));
        }
      } catch {
        if (cancelled) return;
        setError(t('errors.loadFailedRetry'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function unlock() {
    if (!token) return;
    if (unlocking) return;
    setUnlocking(true);
    setError(null);
    try {
      const res = await fetch(`/api/claim/${encodeURIComponent(token)}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlockCode: code }),
      });
      const data = (await res.json().catch(() => ({}))) as ClaimUnlock;
      if (!res.ok || (data as any).ok === false) {
        const errCode = (data as any)?.error || 'Erro ao desbloquear.';
        if (errCode === 'INVALID_UNLOCK_CODE') {
          setError(t('errors.invalidUnlockCode', { remaining: (data as any)?.attemptsRemaining ?? 0 }));
        } else if (errCode === 'TOO_MANY_ATTEMPTS') {
          setError(t('errors.tooManyAttempts'));
        } else if (errCode === 'CLAIM_EXPIRED') {
          setError(t('errors.claimExpired'));
        } else if (errCode === 'CLAIM_ALREADY_CLAIMED') {
          setError(t('errors.claimAlreadyClaimed'));
        } else if (errCode === 'CLAIM_NOT_FOUND') {
          setError(t('errors.claimNotFound'));
        } else {
          setError(t('errors.generic'));
        }
        return;
      }
      setUnlocked(data);
      setShowDetails(true);
    } catch {
      setError(t('errors.generic'));
    } finally {
      setUnlocking(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="min-h-screen bg-[#050509] text-white px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">
        <Card className="bg-[#111116] border-white/10">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">{t('title')}</CardTitle>
            <CardDescription className="text-slate-400">
              {t('subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                {tc('loading')}
              </div>
            ) : null}

            {!loading && claim?.ok ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/20 rounded-xl p-3 border border-white/10">
                  <div className="text-xs text-slate-400">{t('availableAmount')}</div>
                  <div className="text-lg font-bold">{formatCurrency(claim.amount, claim.currency, locale)}</div>
                </div>
                <div className="bg-black/20 rounded-xl p-3 border border-white/10">
                  <div className="text-xs text-slate-400">{t('card')}</div>
                  <div className="text-lg font-bold">{claim.brand} •••• {claim.last4}</div>
                </div>
              </div>
            ) : null}

            {!loading && claim?.ok && isExpired ? (
              <div className="bg-red-950/20 text-red-300 p-4 rounded-xl border border-red-500/20 flex gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <div>
                  <div className="font-bold">{t('expired.title')}</div>
                  <div className="text-sm text-red-200/80">{t('expired.subtitle')}</div>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="bg-red-950/20 text-red-300 p-3 rounded-xl border border-red-500/20 flex gap-2 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <div>{error}</div>
              </div>
            ) : null}

            {!loading && !unlocked && claim?.ok && !isExpired ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>{t('unlockCodeLabel')}</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6))}
                    placeholder="A1B2C3"
                    className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 font-mono tracking-widest text-center"
                    disabled={unlocking}
                  />
                </div>
                <Button
                  onClick={unlock}
                  disabled={code.length !== 6 || unlocking}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold h-12"
                >
                  {unlocking ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> {t('unlocking')}
                    </span>
                  ) : (
                    t('unlock')
                  )}
                </Button>
              </div>
            ) : null}

            {unlocked?.ok ? (
              <div className="space-y-4">
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 flex gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div>
                    <div className="font-bold text-emerald-300">{t('unlocked.title')}</div>
                    <div className="text-sm text-emerald-200/80">{t('unlocked.subtitle')}</div>
                  </div>
                </div>

                <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{t('cardDetailsTitle')}</div>
                    <Button
                      variant="outline"
                      className="border-white/10 text-slate-200 hover:bg-white/5"
                      onClick={() => setShowDetails((v) => !v)}
                    >
                      {showDetails ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                      {showDetails ? t('hide') : t('show')}
                    </Button>
                  </div>

                  <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">{t('number')}</div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <div className="font-mono text-lg tracking-wider">
                        {showDetails ? unlocked.cardNumber : '•••• •••• •••• ••••'}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-slate-300 hover:bg-white/5"
                        onClick={() => copy(unlocked.cardNumber)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest">{t('expires')}</div>
                      <div className="mt-1 font-mono text-lg">
                        {showDetails ? `${String(unlocked.expMonth).padStart(2, '0')}/${String(unlocked.expYear).slice(-2)}` : '••/••'}
                      </div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest">{t('cvc')}</div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <div className="font-mono text-lg">{showDetails ? unlocked.cvc : '•••'}</div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-slate-300 hover:bg-white/5"
                          onClick={() => copy(unlocked.cvc)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
