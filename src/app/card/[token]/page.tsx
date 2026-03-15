'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';
import { formatCurrencyLocale } from '@/lib/utils';

type CardEmailPublic =
  | { ok: false; code?: string }
  | {
      ok: true;
      cardMasked: { last4: string | null; brand: string | null; expMonth: number | null; expYear: number | null };
      amountInitial: number;
      currency: string;
      amountUsed: number;
      amountAvailable: number;
      transactions: Array<{ merchant: string | null; amount: number; currency: string; date: string }>;
    };

type ClaimUnlock =
  | { ok: false; error?: string; attemptsRemaining?: number }
  | { ok: true };

function normalizeError(code?: string) {
  if (!code) return 'GENERIC';
  return String(code).toUpperCase();
}

export default function CardEmailViewPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || '';
  const t = useTranslations('CardEmail.View');
  const tc = useTranslations('Common');
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CardEmailPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [stepUpOtp, setStepUpOtp] = useState('');
  const [stepUpSubmitting, setStepUpSubmitting] = useState(false);

  const cardLabel = useMemo(() => {
    if (!data || !data.ok) return null;
    const last4 = data.cardMasked?.last4 || '••••';
    const brand = data.cardMasked?.brand || '';
    const expMonth = data.cardMasked?.expMonth ? String(data.cardMasked.expMonth).padStart(2, '0') : '••';
    const expYear = data.cardMasked?.expYear ? String(data.cardMasked.expYear).slice(-2) : '••';
    const exp = `${expMonth}/${expYear}`;
    const brandPart = brand ? ` • ${brand}` : '';
    return `•••• ${last4}${brandPart} • ${exp}`;
  }, [data]);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    setRequiresOtp(false);
    setStepUpRequired(false);
    try {
      const res = await fetch(`/api/card/email/${encodeURIComponent(token)}`, { method: 'GET' });
      const body = (await res.json().catch(() => ({}))) as CardEmailPublic;
      setData(body);

      if (res.status === 401 && normalizeError((body as any)?.code) === 'CARD_OTP_REQUIRED') {
        setRequiresOtp(true);
        return;
      }

      if (!res.ok || !body || (body as any).ok === false) {
        const code = normalizeError((body as any)?.code);
        if (code === 'CARD_LINK_INVALID') setError(t('error.invalidOrExpired'));
        else setError(t('error.generic'));
        return;
      }
    } catch {
      setError(t('error.generic'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  async function submitOtp() {
    if (otpSubmitting) return;
    if (!/^[a-zA-Z0-9]{6}$/.test(otp)) {
      setError(t('otp.invalid'));
      return;
    }
    setOtpSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/claim/${encodeURIComponent(token)}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlockCode: otp }),
      });
      const body = (await res.json().catch(() => ({}))) as ClaimUnlock;
      if (!res.ok || (body as any)?.ok === false) {
        const err = String((body as any)?.error || '').toUpperCase();
        if (err === 'CLAIM_STEPUP_REQUIRED') {
          setStepUpRequired(true);
          setError(null);
          return;
        }
        setError(t('otp.failed'));
        return;
      }
      setOtp('');
      await load();
    } catch {
      setError(t('otp.failed'));
    } finally {
      setOtpSubmitting(false);
    }
  }

  async function confirmStepUp() {
    if (stepUpSubmitting) return;
    if (!/^[0-9]{6}$/.test(stepUpOtp)) {
      setError(t('otp.invalid'));
      return;
    }
    setStepUpSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/claim/${encodeURIComponent(token)}/step-up/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: stepUpOtp }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || (body as any)?.ok === false) {
        setError(t('otp.failed'));
        return;
      }
      setStepUpOtp('');
      setStepUpRequired(false);
      await load();
    } catch {
      setError(t('otp.failed'));
    } finally {
      setStepUpSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050509] text-white px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">
        <Card className="bg-[#111116] border-white/10">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">{t('title')}</CardTitle>
            <CardDescription className="text-slate-400">{t('subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-950/20 text-red-300 p-3 rounded-xl border border-red-500/20 flex gap-2 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {requiresOtp && !stepUpRequired && (
              <div className="space-y-3">
                <div className="bg-cyan-950/20 text-cyan-200 p-4 rounded-xl border border-cyan-500/20">
                  <div className="font-semibold">{t('otp.title')}</div>
                  <div className="text-sm text-cyan-200/80">{t('otp.description')}</div>
                </div>

                <div className="space-y-2">
                  <Label>{t('otp.label')}</Label>
                  <Input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder={t('otp.placeholder')}
                    className="bg-black/20 border-white/10 text-white placeholder:text-slate-500"
                    disabled={otpSubmitting}
                    inputMode="text"
                    autoComplete="one-time-code"
                  />
                </div>

                <Button
                  onClick={submitOtp}
                  disabled={otpSubmitting || otp.length !== 6}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold h-12"
                >
                  {otpSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> {t('otp.submitting')}
                    </span>
                  ) : (
                    t('otp.submit')
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-white/10 text-slate-200 hover:bg-white/5"
                  onClick={() => setOtp('')}
                  disabled={otpSubmitting}
                >
                  {tc('cancel')}
                </Button>
              </div>
            )}

            {requiresOtp && stepUpRequired && (
              <div className="space-y-3">
                <div className="bg-cyan-950/20 text-cyan-200 p-4 rounded-xl border border-cyan-500/20">
                  <div className="font-semibold">{t('stepUp.title')}</div>
                  <div className="text-sm text-cyan-200/80">{t('stepUp.description')}</div>
                </div>

                <div className="space-y-2">
                  <Label>{t('stepUp.label')}</Label>
                  <Input
                    value={stepUpOtp}
                    onChange={(e) => setStepUpOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="bg-black/20 border-white/10 text-white placeholder:text-slate-500"
                    disabled={stepUpSubmitting}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </div>

                <Button
                  onClick={confirmStepUp}
                  disabled={stepUpSubmitting || stepUpOtp.length !== 6}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold h-12"
                >
                  {stepUpSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> {t('stepUp.submitting')}
                    </span>
                  ) : (
                    t('stepUp.submit')
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-white/10 text-slate-200 hover:bg-white/5"
                  onClick={() => {
                    setStepUpRequired(false);
                    setStepUpOtp('');
                  }}
                  disabled={stepUpSubmitting}
                >
                  {tc('cancel')}
                </Button>
              </div>
            )}

            {!requiresOtp && loading && (
              <div className="py-8 text-center text-slate-400">{tc('loading')}</div>
            )}

            {!requiresOtp && !loading && data && data.ok && (
              <div className="space-y-4">
                {cardLabel && (
                  <div className="text-sm text-slate-400 border border-white/10 rounded-xl bg-black/20 px-3 py-2">
                    {cardLabel}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/20 rounded-xl p-3 border border-white/10">
                    <div className="text-xs text-slate-400">{t('balanceInitial')}</div>
                    <div className="text-lg font-bold">
                      {formatCurrencyLocale(data.amountInitial, data.currency, locale)}
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3 border border-white/10">
                    <div className="text-xs text-slate-400">{t('balanceAvailable')}</div>
                    <div className="text-lg font-bold">
                      {formatCurrencyLocale(data.amountAvailable, data.currency, locale)}
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 rounded-xl p-3 border border-white/10 text-sm text-slate-300">
                  {t('note')}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">{t('transactionsTitle')}</div>
                  {data.transactions.length === 0 ? (
                    <div className="text-sm text-slate-400">{t('emptyTransactions')}</div>
                  ) : (
                    <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
                      {data.transactions.map((tx, idx) => {
                        const dt = new Date(tx.date);
                        const dateLabel = Number.isFinite(dt.getTime()) ? dt.toLocaleDateString(locale) : tx.date;
                        return (
                          <div key={`${idx}-${tx.date}`} className="flex items-center justify-between gap-4 px-3 py-3 bg-black/10">
                            <div className="min-w-0">
                              <div className="text-sm text-slate-100 truncate">{tx.merchant || t('merchantUnknown')}</div>
                              <div className="text-xs text-slate-500">{dateLabel}</div>
                            </div>
                            <div className="text-sm font-semibold text-slate-100">
                              {formatCurrencyLocale(tx.amount, tx.currency, locale)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

