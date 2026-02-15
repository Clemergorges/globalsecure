'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription as DialogDesc, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, CheckCircle, Copy, Eye, EyeOff, Loader2, Smartphone } from 'lucide-react';

type ClaimClientProps = {
  transferId: string;
  cardLast4: string;
  expMonth: number;
  expYear: number;
  isUnlocked: boolean;
  amount: number;
  currency: string;
  recipientEmail?: string | null;
  expiresAtISO: string;
  claimStatus: 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED' | string;
};

function formatTimeLeft(expiresAtISO: string, nowMs: number) {
  const expiresAt = new Date(expiresAtISO).getTime();
  const diffMs = Math.max(0, expiresAt - nowMs);
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} min`;
  return `${hours}h ${minutes}min`;
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export default function ClaimClient(props: ClaimClientProps) {
  const [nowMs, setNowMs] = useState(0);
  const timeLeft = useMemo(() => formatTimeLeft(props.expiresAtISO, nowMs), [props.expiresAtISO, nowMs]);
  const isExpired = useMemo(() => {
    const expiresAt = new Date(props.expiresAtISO).getTime();
    if (props.claimStatus === 'EXPIRED' || props.claimStatus === 'CANCELLED') return true;
    if (!nowMs) return false;
    return expiresAt <= nowMs;
  }, [props.claimStatus, props.expiresAtISO, nowMs]);

  useEffect(() => {
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(props.isUnlocked);
  const [showDetails, setShowDetails] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const fakePan = useMemo(() => {
    const tail = props.cardLast4?.padStart(4, '0') || '0000';
    return `4242 4242 4242 ${tail}`;
  }, [props.cardLast4]);

  const fakeCvc = '123';
  const cardExpiry = `${String(props.expMonth).padStart(2, '0')}/${String(props.expYear).slice(-2)}`;

  async function handleUnlock() {
    if (isExpired) return;
    if (blocked) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/claim/${props.transferId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = (data as any)?.error || 'Código inválido. Tente novamente.';
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          setBlocked(true);
          setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        } else {
          setError(msg);
        }
        return;
      }

      setUnlocked(true);
      setShowDetails(true);
    } catch {
      setError('Falha de rede. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-[#050509] text-white px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">
        <Card className="bg-[#111116] border-white/10">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Você recebeu um cartão pré-pago GlobalSecureSend</CardTitle>
            <CardDescription className="text-slate-400">
              Use agora, sem precisar criar conta bancária.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/20 rounded-xl p-3 border border-white/10">
                <div className="text-xs text-slate-400">Valor disponível</div>
                <div className="text-lg font-bold">{formatCurrency(props.amount, props.currency)}</div>
              </div>
              <div className="bg-black/20 rounded-xl p-3 border border-white/10">
                <div className="text-xs text-slate-400">Expira em</div>
                <div className="text-lg font-bold">{isExpired ? 'Expirado' : timeLeft}</div>
              </div>
            </div>

            {isExpired ? (
              <div className="bg-red-950/20 text-red-300 p-4 rounded-xl border border-red-500/20 flex gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <div>
                  <div className="font-bold">Este cartão expirou</div>
                  <div className="text-sm text-red-200/80">Peça para quem enviou gerar um novo link.</div>
                </div>
              </div>
            ) : (
              <div className="bg-cyan-950/20 text-cyan-200 p-4 rounded-xl border border-cyan-500/20">
                <div className="font-semibold">Passo 1 de 3</div>
                <div className="text-sm text-cyan-200/80">
                  Digite o código que você recebeu do remetente e desbloqueie seu cartão.
                </div>
              </div>
            )}

            {!isExpired && !unlocked && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Código de desbloqueio</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Digite o código"
                    className="bg-black/20 border-white/10 text-white placeholder:text-slate-500"
                    disabled={submitting || blocked}
                  />
                  <p className="text-xs text-slate-500">Dica: o remetente envia esse código por um canal seguro.</p>
                </div>
                <Button
                  onClick={handleUnlock}
                  disabled={!code || submitting || blocked}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold h-12"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Desbloqueando...
                    </span>
                  ) : (
                    'Desbloquear cartão'
                  )}
                </Button>
              </div>
            )}

            {error && (
              <div className="bg-red-950/20 text-red-300 p-3 rounded-xl border border-red-500/20 flex gap-2 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {unlocked && (
              <div className="space-y-4">
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 flex gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div>
                    <div className="font-bold text-emerald-300">Cartão desbloqueado</div>
                    <div className="text-sm text-emerald-200/80">Passo 2 de 3: use os dados abaixo para comprar online.</div>
                  </div>
                </div>

                <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Dados do cartão (demonstração)</div>
                    <Button
                      variant="outline"
                      className="border-white/10 text-slate-200 hover:bg-white/5"
                      onClick={() => setShowDetails((v) => !v)}
                    >
                      {showDetails ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                      {showDetails ? 'Ocultar' : 'Mostrar'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest">Número</div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <div className="font-mono text-lg tracking-wider">
                          {showDetails ? fakePan : '•••• •••• •••• ••••'}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-slate-300 hover:bg-white/5"
                          onClick={() => copy(fakePan, 'Número')}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">Validade</div>
                        <div className="mt-1 font-mono text-lg">{showDetails ? cardExpiry : '••/••'}</div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">CVC</div>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <div className="font-mono text-lg">{showDetails ? fakeCvc : '•••'}</div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-slate-300 hover:bg-white/5"
                            onClick={() => copy(fakeCvc, 'CVC')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    Integração para mostrar PAN/CVC reais será conectada ao emissor/TSP. 
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-4">
                    <div className="font-semibold">Passo 3 de 3</div>
                    <div className="text-sm text-cyan-200/80">
                      Adicione ao seu telemóvel ou use para compras online.
                    </div>
                  </div>

                  <Button
                    className="w-full h-14 bg-white text-black hover:bg-slate-100 font-bold text-base"
                    onClick={() => setShowComingSoon(true)}
                  >
                    <Smartphone className="w-5 h-5 mr-2" />
                    Adicionar ao Apple Pay
                  </Button>
                  <Button
                    className="w-full h-14 bg-white text-black hover:bg-slate-100 font-bold text-base"
                    onClick={() => setShowComingSoon(true)}
                  >
                    <Smartphone className="w-5 h-5 mr-2" />
                    Adicionar ao Google Pay
                  </Button>
                </div>

                <Card className="bg-[#111116] border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Onde posso usar?</CardTitle>
                    <CardDescription className="text-slate-400">
                      Você pode usar este cartão como um cartão Visa normal.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-200/90">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Lojas físicas que aceitam contactless</li>
                      <li>Compras online</li>
                      <li>Apps que aceitam cartões Visa</li>
                    </ul>

                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="advanced" className="border-white/10">
                        <AccordionTrigger className="text-slate-300 hover:text-white">
                          Ver detalhes avançados
                        </AccordionTrigger>
                        <AccordionContent className="text-slate-400">
                          <div className="space-y-2">
                            <div>Moeda: {props.currency}</div>
                            <div>Últimos 4 dígitos: {props.cardLast4}</div>
                            <div>Expira em: {timeLeft}</div>
                            {props.recipientEmail ? <div>Email do destinatário: {props.recipientEmail}</div> : null}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <DialogContent className="bg-[#0A0A0F] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Em breve</DialogTitle>
            <DialogDesc className="text-slate-400">
              A integração com Apple Pay / Google Pay está em desenvolvimento.
            </DialogDesc>
          </DialogHeader>
          <DialogFooter>
            <Button className="w-full bg-cyan-500 text-black hover:bg-cyan-600" onClick={() => setShowComingSoon(false)}>
              Ok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
