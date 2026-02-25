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

export function CardEmailDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const tc = useTranslations('Common');
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
        setError('Preencha email e valor.');
        return;
      }

      const amount = Number(formData.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError('Valor inválido.');
        return;
      }

      const msg = formData.personalMessage.trim();
      if (msg.length > 240) {
        setError('Mensagem muito longa (máximo 240 caracteres).');
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
          setError('Mensagem muito longa (máximo 240 caracteres).');
          return;
        }
        if (res.status === 401) {
          setError('Sua sessão expirou. Faça login novamente.');
          return;
        }
        if (res.status === 403 && (body?.code === 'SCA_REQUIRED' || body?.code === 'SENSITIVE_OTP_REQUIRED')) {
          setSca((s) => ({ ...s, required: true }));
          setError(body?.message || 'Autenticação forte (SCA) necessária para concluir esta operação.');
          return;
        }
        setError(body?.error || 'Falha ao enviar o cartão. Tente novamente.');
        return;
      }

      setSuccess({ transferId: body.transferId, recipientEmail: formData.recipientEmail });
      props.onSuccess();
    } catch {
      setError('Falha ao enviar o cartão. Tente novamente.');
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
            <DialogTitle className="text-center text-xl">Cartão enviado</DialogTitle>
            <DialogDescription className="text-center text-slate-400">
              <>Um cartão virtual foi enviado para <strong className="text-slate-200">{success.recipientEmail}</strong>.</>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Transfer ID</div>
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
        setError(b?.error || 'Falha ao solicitar código de verificação.');
        return;
      }
      setSca((s) => ({ ...s, otpSent: true }));
      setError('Enviamos um código de verificação para o seu e-mail.');
    } catch {
      setError('Falha ao solicitar código de verificação.');
    } finally {
      setSca((s) => ({ ...s, sending: false }));
    }
  };

  const confirmOtpAndRetry = async () => {
    try {
      if (!sca.otp || !/^\d{6}$/.test(sca.otp)) {
        setError('Informe o código de 6 dígitos.');
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
        setError(b?.error || 'Código inválido ou expirado.');
        return;
      }
      // SCA ok: tentar novamente a submissão
      setSca({ required: false, otpSent: false, otp: '', sending: false, verifying: false });
      await handleSubmit();
    } catch {
      setError('Falha ao confirmar o código. Tente novamente.');
    } finally {
      setSca((s) => ({ ...s, verifying: false }));
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={close}>
      <DialogContent className="bg-[#0A0A0F] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-cyan-500" />
            Cartão por e-mail
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Envie um cartão virtual para um destinatário via e-mail.
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
              <div className="text-sm text-yellow-300">Autenticação forte (SCA) necessária para concluir esta transferência.</div>
              {!sca.otpSent ? (
                <Button onClick={requestOtp} disabled={sca.sending} className="bg-yellow-400 text-black hover:bg-yellow-300">
                  {sca.sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar código por e-mail'}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="otp">Código de verificação (6 dígitos)</Label>
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
                      Cancelar
                    </Button>
                    <Button onClick={confirmOtpAndRetry} disabled={sca.verifying} className="bg-cyan-500 text-black hover:bg-cyan-600">
                      {sca.verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar e concluir'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
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
              <Label>Moeda</Label>
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
            <Label htmlFor="recipientEmail">Email do destinatário</Label>
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
            <Label htmlFor="recipientName">Nome do destinatário (opcional)</Label>
            <Input
              id="recipientName"
              placeholder="Nome"
              value={formData.recipientName}
              onChange={(e) => setFormData((s) => ({ ...s, recipientName: e.target.value }))}
              className="bg-white/5 border-white/10 text-white"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="personalMessage">Mensagem para o destinatário (opcional)</Label>
              <div className="text-xs text-slate-500">{formData.personalMessage.length}/240</div>
            </div>
            <Textarea
              id="personalMessage"
              value={formData.personalMessage}
              onChange={(e) => setFormData((s) => ({ ...s, personalMessage: e.target.value.slice(0, 240) }))}
              className="bg-white/5 border-white/10 text-white min-h-24"
              disabled={loading}
              maxLength={240}
              placeholder="Escreva uma mensagem curta para o destinatário."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)} className="text-slate-400 hover:text-white" disabled={loading}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-cyan-500 text-black hover:bg-cyan-600">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
