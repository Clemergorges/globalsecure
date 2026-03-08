'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, CreditCard, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFeeConfigWithOptions } from '@/hooks/useFeeConfig';

export function CardEmailDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const tc = useTranslations('Common');
  const t = useTranslations('Cards.EmailCard');
  const tf = useTranslations('Transfers.Create');
  const feeCfg = useFeeConfigWithOptions({ enabled: props.open });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ transferId?: string; recipientEmail?: string } | null>(null);
  const [sca, setSca] = useState<{ required: boolean; otpSent: boolean; otp: string; sending: boolean; verifying: boolean }>(
    { required: false, otpSent: false, otp: '', sending: false, verifying: false }
  );

  const [formData, setFormData] = useState({
    recipientName: '',
    recipientEmail: '',
    amount: '',
    currency: 'EUR',
    personalMessage: '',
  });
  // GSS-MVP-FIX: Claim links are DEMO-only for MVP; keep only CARD_EMAIL visible in this dialog.

  const close = (open: boolean) => {
    props.onOpenChange(open);
    if (!open) {
      setTimeout(() => {
        setLoading(false);
        setError(null);
        setSuccess(null);
        setFormData({ recipientName: '', recipientEmail: '', amount: '', currency: 'EUR', personalMessage: '' });
      }, 250);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!formData.recipientEmail || !formData.amount) {
        setError(t('errors.missingEmailAmount'));
        return;
      }

      const amount = Number(formData.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError(t('errors.invalidAmount'));
        return;
      }

      const msg = formData.personalMessage.trim();
      if (msg.length > 240) {
        setError(t('errors.messageTooLong'));
        return;
      }

      const res: Response = await fetch('/api/transfers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'CARD_EMAIL',
          amountSource: amount,
          currencySource: formData.currency,
          currencyTarget: formData.currency,
          receiverEmail: formData.recipientEmail,
          receiverName: formData.recipientName || undefined,
          personalMessage: msg ? msg : undefined,
        }),
      });

      const body = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        if (body?.code === 'PERSONAL_MESSAGE_TOO_LONG') {
          setError(t('errors.messageTooLong'));
          return;
        }
        if (res.status === 401) {
          setError(t('errors.sessionExpired'));
          return;
        }
        if (res.status === 403 && (body?.code === 'SCA_REQUIRED' || body?.code === 'SENSITIVE_OTP_REQUIRED')) {
          setSca((s) => ({ ...s, required: true }));
          setError(body?.message || t('sca.required'));
          return;
        }
        setError(body?.error || t('errors.submitFailed'));
        return;
      }

      setSuccess({ transferId: body.transferId, recipientEmail: formData.recipientEmail });
      props.onSuccess();
    } catch {
      setError(t('errors.submitFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Dialog open={props.open} onOpenChange={close}>
        <DialogContent className="bg-[#0A0A0F] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-cyan-500" />
            </div>
            <DialogTitle className="text-center text-xl">{t('success.title')}</DialogTitle>
            <DialogDescription className="text-center text-slate-400">
              {t('success.description', { email: success.recipientEmail || '' })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t('success.transferId')}</div>
              <div className="font-mono text-slate-200">{success.transferId}</div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => close(false)} className="w-full bg-cyan-500 text-black hover:bg-cyan-600 font-semibold">
              {tc('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const requestOtp = async () => {
    try {
      setSca((s) => ({ ...s, sending: true }));
      const r = await fetch('/api/auth/sensitive/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'SENSITIVE_HIGH_VALUE_TRANSFER' }),
      });
      const b = await r.json().catch(() => ({} as any));
      if (!r.ok) {
        setError(b?.error || t('sca.requestFailed'));
        return;
      }
      setSca((s) => ({ ...s, otpSent: true }));
      setError(t('sca.codeSent'));
    } catch {
      setError(t('sca.requestFailed'));
    } finally {
      setSca((s) => ({ ...s, sending: false }));
    }
  };

  const confirmOtpAndRetry = async () => {
    try {
      if (!sca.otp || !/^\d{6}$/.test(sca.otp)) {
        setError(t('sca.invalidFormat'));
        return;
      }
      setSca((s) => ({ ...s, verifying: true }));
      const r = await fetch('/api/auth/sensitive/otp/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'SENSITIVE_HIGH_VALUE_TRANSFER', otpCode: sca.otp }),
      });
      const b = await r.json().catch(() => ({} as any));
      if (!r.ok) {
        setError(b?.error || t('sca.confirmFailed'));
        return;
      }
      // SCA ok: tentar novamente a submissão
      setSca({ required: false, otpSent: false, otp: '', sending: false, verifying: false });
      await handleSubmit();
    } catch {
      setError(t('sca.confirmFailed'));
    } finally {
      setSca((s) => ({ ...s, verifying: false }));
    }
  };

  const amountNumber = Number(formData.amount);
  const amountValid = Number.isFinite(amountNumber) && amountNumber > 0;
  const feePct = feeCfg.data.remittance_fee_percent / 100;
  const feeSourceLabel = tc(`feeConfig.source.${feeCfg.data.source}` as any);
  const fee = amountValid ? amountNumber * feePct : 0;
  const totalPay = amountValid ? amountNumber + fee : 0;

  return (
    <Dialog open={props.open} onOpenChange={close}>
      <DialogContent className="bg-[#0A0A0F] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-cyan-500" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-950/20 text-red-400 p-3 rounded-lg text-sm border border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {sca.required && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
              <div className="text-sm text-yellow-300">{t('sca.required')}</div>
              {!sca.otpSent ? (
                <Button onClick={requestOtp} disabled={sca.sending} className="bg-yellow-400 text-black hover:bg-yellow-300">
                  {sca.sending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('sca.requestCode')}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="otp">{t('sca.codeLabel')}</Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    placeholder="000000"
                    value={sca.otp}
                    onChange={(e) => setSca((s) => ({ ...s, otp: e.target.value.replace(/\\D/g, '').slice(0, 6) }))}
                    className="bg-white/5 border-white/10 text-white"
                    disabled={sca.verifying}
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setSca({ required: false, otpSent: false, otp: '', sending: false, verifying: false })} className="text-slate-400">
                      {tc('cancel')}
                    </Button>
                    <Button onClick={confirmOtpAndRetry} disabled={sca.verifying} className="bg-cyan-500 text-black hover:bg-cyan-600">
                      {sca.verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : t('sca.confirm')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{t('amount')}</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData((s) => ({ ...s, amount: e.target.value }))}
                className="bg-white/5 border-white/10 text-white font-mono text-lg"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('currency')}</Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData((s) => ({ ...s, currency: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientEmail">{t('recipientEmail')}</Label>
            <Input
              id="recipientEmail"
              type="email"
              placeholder="recipient@example.com"
              value={formData.recipientEmail}
              onChange={(e) => setFormData((s) => ({ ...s, recipientEmail: e.target.value }))}
              className="bg-white/5 border-white/10 text-white"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientName">{t('recipientName')}</Label>
            <Input
              id="recipientName"
              placeholder={t('recipientNamePlaceholder')}
              value={formData.recipientName}
              onChange={(e) => setFormData((s) => ({ ...s, recipientName: e.target.value }))}
              className="bg-white/5 border-white/10 text-white"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="personalMessage">{t('message')}</Label>
              <div className="text-xs text-slate-500">{formData.personalMessage.length}/240</div>
            </div>
            <Textarea
              id="personalMessage"
              value={formData.personalMessage}
              onChange={(e) => setFormData((s) => ({ ...s, personalMessage: e.target.value.slice(0, 240) }))}
              className="bg-white/5 border-white/10 text-white min-h-24"
              disabled={loading}
              maxLength={240}
              placeholder={t('messagePlaceholder')}
            />
          </div>
        </div>

        <div className="bg-cyan-950/10 p-4 rounded-lg border border-cyan-500/10">
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-slate-400">{t('breakdown.youPay')}</span>
            <span className="text-slate-300 font-mono">
              {totalPay.toFixed(2)} {formData.currency}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-slate-400">{tf('serviceFee', { percent: (feePct * 100).toFixed(2) })}</span>
            <span className="text-slate-300 font-mono">
              {fee.toFixed(2)} {formData.currency}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
            <span>
              {feeSourceLabel}
              {feeCfg.isFallback ? (
                <span className="ml-2 inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                  {tc('feeConfig.estimate')}
                </span>
              ) : null}
            </span>
            {feeCfg.error ? <span>{tc('feeConfig.fallbackNotice')}</span> : null}
          </div>
          <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-cyan-500/10">
            <span className="text-cyan-400">{t('breakdown.cardValue')}</span>
            <span className="text-white font-mono">
              {amountValid ? amountNumber.toFixed(2) : '0.00'} {formData.currency}
            </span>
          </div>
        </div>
        {feeCfg.loading ? <div className="text-xs text-slate-500">{tc('feeConfig.loading')}</div> : null}
        <div className="text-xs text-slate-500">
          {tc('disclaimer.tax')}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)} className="text-slate-400 hover:text-white" disabled={loading}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || feeCfg.loading} className="bg-cyan-500 text-black hover:bg-cyan-600">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
