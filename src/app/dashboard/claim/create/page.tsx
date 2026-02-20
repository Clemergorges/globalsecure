'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, Copy, Loader2, ShieldCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatCurrencyLocale } from '@/lib/utils';

type SuccessData = {
  claimUrl: string;
  unlockCode: string;
  recipientEmail: string;
  amount: number;
  currency: string;
};

export default function ClaimCreatePage() {
  const t = useTranslations('ClaimCreate');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessData | null>(null);

  const [formData, setFormData] = useState({
    recipientName: '',
    recipientEmail: '',
    amount: '',
    currency: 'EUR',
    message: '',
  });

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      if (!formData.recipientEmail || !formData.amount) {
        setError(t('errors.requiredEmailAmount'));
        return;
      }

      const amount = Number(formData.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError(t('errors.invalidAmount'));
        return;
      }

      const res = await fetch('/api/claim-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: formData.recipientName,
          recipientEmail: formData.recipientEmail,
          amount,
          currency: formData.currency,
          message: formData.message,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if ((data as any)?.claimUrl && (data as any)?.unlockCode) {
          setSuccess({
            claimUrl: (data as any).claimUrl,
            unlockCode: (data as any).unlockCode,
            recipientEmail: formData.recipientEmail,
            amount,
            currency: formData.currency,
          });
          setError((data as any)?.error || t('errors.linkCreatedEmailNotSent'));
          return;
        }
        throw new Error((data as any)?.error || t('errors.submitFailed'));
      }

      setSuccess({
        claimUrl: (data as any).claimUrl,
        unlockCode: (data as any).unlockCode,
        recipientEmail: formData.recipientEmail,
        amount,
        currency: formData.currency,
      });
    } catch (e: any) {
      setError(e?.message || t('errors.unexpected'));
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  if (success) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        <Card className="bg-[#111116] border-white/10 text-white">
          <CardHeader className="space-y-2">
            <div className="mx-auto w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-cyan-500" />
            </div>
            <CardTitle className="text-center text-2xl">{t('success.title')}</CardTitle>
            <CardDescription className="text-center text-slate-400">
              {t.rich('success.sentTo', { email: success.recipientEmail, strong: (chunks) => <strong className="text-slate-200">{chunks}</strong> })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="bg-black/20 border border-white/10 rounded-xl p-3">
                <div className="text-xs text-slate-400">{t('success.amount')}</div>
                <div className="text-lg font-bold">{formatCurrencyLocale(success.amount, success.currency, locale)}</div>
              </div>
              <div className="bg-black/20 border border-white/10 rounded-xl p-3">
                <div className="text-xs text-slate-400">{t('success.expiresIn')}</div>
                <div className="text-lg font-bold">{t('success.expiresInValue')}</div>
              </div>
              <div className="bg-black/20 border border-white/10 rounded-xl p-3">
                <div className="text-xs text-slate-400">{t('success.track')}</div>
                <div className="text-lg font-bold">{t('success.trackValue')}</div>
              </div>
            </div>

            <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-500 mt-0.5" />
                <div>
                  <div className="font-bold text-cyan-300 text-sm uppercase tracking-wider">{t('success.securityTitle')}</div>
                  <p className="text-sm text-cyan-200/80">
                    {t('success.securityDescription')}
                  </p>
                </div>
              </div>

              <div className="bg-black/40 rounded-lg p-3 flex items-center justify-between border border-cyan-500/10">
                <div>
                  <p className="text-[10px] text-cyan-500/70 uppercase tracking-widest mb-1">{t('success.codeLabel')}</p>
                  <p className="font-mono text-xl font-bold text-cyan-400 tracking-widest">{success.unlockCode}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10"
                  onClick={() => copy(success.unlockCode)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-slate-500">{t('success.backupLinkLabel')}</Label>
              <div className="flex gap-2">
                <Input readOnly value={success.claimUrl} className="bg-white/5 border-white/10 text-slate-300 font-mono text-xs" />
                <Button size="icon" variant="outline" className="border-white/10 hover:bg-white/5" onClick={() => copy(success.claimUrl)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/dashboard/cards" className="flex-1">
                <Button className="w-full bg-cyan-500 text-black hover:bg-cyan-600 font-bold">{t('success.goToCards')}</Button>
              </Link>
              <Button
                variant="outline"
                className="flex-1 border-white/10 text-slate-200 hover:bg-white/5"
                onClick={() => {
                  setSuccess(null);
                  setFormData({ recipientName: '', recipientEmail: '', amount: '', currency: 'EUR', message: '' });
                }}
              >
                {t('success.sendAnother')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
        <p className="text-slate-400">{t('subtitle')}</p>
      </div>

      <Card className="bg-[#111116] border-white/10 text-white">
        <CardHeader>
          <CardTitle>{t('form.title')}</CardTitle>
          <CardDescription className="text-slate-400">{t('form.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {error && (
            <div className="bg-red-950/20 text-red-300 p-3 rounded-xl border border-red-500/20 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('form.amount')}</Label>
              <Input
                value={formData.amount}
                onChange={(e) => setFormData((s) => ({ ...s, amount: e.target.value }))}
                placeholder={t('form.amountPlaceholder')}
                className="bg-black/20 border-white/10 text-white placeholder:text-slate-500"
                disabled={loading}
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('form.currency')}</Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData((s) => ({ ...s, currency: v }))}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111116] border-white/10 text-white">
                  <SelectItem value="EUR">{t('currencies.eur')}</SelectItem>
                  <SelectItem value="USD">{t('currencies.usd')}</SelectItem>
                  <SelectItem value="GBP">{t('currencies.gbp')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('form.recipientEmail')}</Label>
              <Input
                value={formData.recipientEmail}
                onChange={(e) => setFormData((s) => ({ ...s, recipientEmail: e.target.value }))}
                placeholder={t('form.recipientEmailPlaceholder')}
                className="bg-black/20 border-white/10 text-white placeholder:text-slate-500"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('form.recipientName')}</Label>
              <Input
                value={formData.recipientName}
                onChange={(e) => setFormData((s) => ({ ...s, recipientName: e.target.value }))}
                placeholder={t('form.recipientNamePlaceholder')}
                className="bg-black/20 border-white/10 text-white placeholder:text-slate-500"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('form.message')}</Label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData((s) => ({ ...s, message: e.target.value }))}
              placeholder={t('form.messagePlaceholder')}
              className="bg-black/20 border-white/10 text-white placeholder:text-slate-500"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full border-white/10 text-slate-200 hover:bg-white/5" disabled={loading}>
                {tc('back')}
              </Button>
            </Link>
            <Button className="flex-1 w-full bg-cyan-500 text-black hover:bg-cyan-600 font-bold" onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('submit')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
