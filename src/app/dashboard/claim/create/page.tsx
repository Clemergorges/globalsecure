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

type SuccessData = {
  claimUrl: string;
  unlockCode: string;
  recipientEmail: string;
  amount: number;
  currency: string;
};

export default function ClaimCreatePage() {
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
        setError('Email e valor são obrigatórios.');
        return;
      }

      const amount = Number(formData.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError('Informe um valor válido.');
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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any)?.error || 'Falha ao processar envio.');
      }

      const data = await res.json();
      setSuccess({
        claimUrl: data.claimUrl,
        unlockCode: data.unlockCode,
        recipientEmail: formData.recipientEmail,
        amount,
        currency: formData.currency,
      });
    } catch (e: any) {
      setError(e?.message || 'Erro inesperado.');
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
            <CardTitle className="text-center text-2xl">Cartão enviado com sucesso</CardTitle>
            <CardDescription className="text-center text-slate-400">
              Enviado para <strong className="text-slate-200">{success.recipientEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="bg-black/20 border border-white/10 rounded-xl p-3">
                <div className="text-xs text-slate-400">Valor</div>
                <div className="text-lg font-bold">{success.amount} {success.currency}</div>
              </div>
              <div className="bg-black/20 border border-white/10 rounded-xl p-3">
                <div className="text-xs text-slate-400">Expira em</div>
                <div className="text-lg font-bold">48h</div>
              </div>
              <div className="bg-black/20 border border-white/10 rounded-xl p-3">
                <div className="text-xs text-slate-400">Acompanhar</div>
                <div className="text-lg font-bold">Cartões</div>
              </div>
            </div>

            <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-500 mt-0.5" />
                <div>
                  <div className="font-bold text-cyan-300 text-sm uppercase tracking-wider">Código de segurança</div>
                  <p className="text-sm text-cyan-200/80">
                    Para segurança, este código não vai por email. Envie ao destinatário por um canal seguro.
                  </p>
                </div>
              </div>

              <div className="bg-black/40 rounded-lg p-3 flex items-center justify-between border border-cyan-500/10">
                <div>
                  <p className="text-[10px] text-cyan-500/70 uppercase tracking-widest mb-1">Código</p>
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
              <Label className="text-xs uppercase text-slate-500">Link de acesso (backup)</Label>
              <div className="flex gap-2">
                <Input readOnly value={success.claimUrl} className="bg-white/5 border-white/10 text-slate-300 font-mono text-xs" />
                <Button size="icon" variant="outline" className="border-white/10 hover:bg-white/5" onClick={() => copy(success.claimUrl)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/dashboard/cards" className="flex-1">
                <Button className="w-full bg-cyan-500 text-black hover:bg-cyan-600 font-bold">Ir para Cartões</Button>
              </Link>
              <Button
                variant="outline"
                className="flex-1 border-white/10 text-slate-200 hover:bg-white/5"
                onClick={() => {
                  setSuccess(null);
                  setFormData({ recipientName: '', recipientEmail: '', amount: '', currency: 'EUR', message: '' });
                }}
              >
                Enviar outro
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
        <h1 className="text-3xl font-bold tracking-tight text-white">Enviar Cartão por E-mail</h1>
        <p className="text-slate-400">Envie um cartão pré-pago por link seguro, sem exigir conta do destinatário.</p>
      </div>

      <Card className="bg-[#111116] border-white/10 text-white">
        <CardHeader>
          <CardTitle>Dados do envio</CardTitle>
          <CardDescription className="text-slate-400">O link expira automaticamente (atualmente 48h).</CardDescription>
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
              <Label>Valor</Label>
              <Input
                value={formData.amount}
                onChange={(e) => setFormData((s) => ({ ...s, amount: e.target.value }))}
                placeholder="Ex.: 200"
                className="bg-black/20 border-white/10 text-white placeholder:text-slate-500"
                disabled={loading}
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData((s) => ({ ...s, currency: v }))}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111116] border-white/10 text-white">
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  <SelectItem value="USD">Dólar (USD)</SelectItem>
                  <SelectItem value="GBP">Libra (GBP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Email do destinatário</Label>
              <Input
                value={formData.recipientEmail}
                onChange={(e) => setFormData((s) => ({ ...s, recipientEmail: e.target.value }))}
                placeholder="email@destinatario.com"
                className="bg-black/20 border-white/10 text-white placeholder:text-slate-500"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome (opcional)</Label>
              <Input
                value={formData.recipientName}
                onChange={(e) => setFormData((s) => ({ ...s, recipientName: e.target.value }))}
                placeholder="Ex.: Maria"
                className="bg-black/20 border-white/10 text-white placeholder:text-slate-500"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mensagem (opcional)</Label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData((s) => ({ ...s, message: e.target.value }))}
              placeholder="Escreva uma mensagem para o destinatário"
              className="bg-black/20 border-white/10 text-white placeholder:text-slate-500"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full border-white/10 text-slate-200 hover:bg-white/5" disabled={loading}>
                Voltar
              </Button>
            </Link>
            <Button className="flex-1 w-full bg-cyan-500 text-black hover:bg-cyan-600 font-bold" onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar e enviar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

