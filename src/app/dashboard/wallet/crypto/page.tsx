'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Copy, ExternalLink, Loader2, Wallet } from 'lucide-react';

type CryptoWallet = {
  network: string;
  token: string;
  balance: string;
  deposits: { txHash: string; amount: string; status: string; detectedAt: string }[];
  withdrawals: { txHash: string | null; amount: string; status: string; createdAt: string }[];
};

function fmtCrypto(amount: string, currency: string) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return `${amount} ${currency}`;
  return `${new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 6, maximumFractionDigits: 6 }).format(num)} ${currency}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-PT', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function statusColor(status: string) {
  if (status === 'CONFIRMED' || status === 'CREDITED') return 'text-emerald-400';
  if (status === 'PENDING' || status === 'BROADCASTED') return 'text-amber-400';
  if (status === 'FAILED' || status === 'CANCELLED') return 'text-red-400';
  return 'text-slate-300';
}

export default function CryptoWalletPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<CryptoWallet | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCopyMsg(null);
    try {
      const [walletRes, addrRes] = await Promise.all([
        fetch('/api/wallet/crypto', { method: 'GET' }),
        fetch('/api/crypto/address', { method: 'GET' }),
      ]);

      const walletBody = await walletRes.json().catch(() => ({} as any));
      const addrBody = await addrRes.json().catch(() => ({} as any));

      if (!walletRes.ok) {
        throw new Error((walletBody as any)?.code || 'FETCH_FAILED');
      }

      setWallet(walletBody.data);
      setAddress((addrBody as any)?.address || null);
    } catch {
      setWallet(null);
      setAddress(null);
      setError('Não foi possível carregar a carteira cripto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const polyscanUrl = useMemo(() => {
    if (!address) return null;
    return `https://polygonscan.com/address/${address}`;
  }, [address]);

  const onCopy = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopyMsg('Endereço copiado.');
      setTimeout(() => setCopyMsg(null), 1500);
    } catch {
      setCopyMsg('Não foi possível copiar.');
      setTimeout(() => setCopyMsg(null), 1500);
    }
  }, [address]);

  const truncated = useMemo(() => {
    if (!address) return null;
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }, [address]);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Carteira Cripto</h1>
          <p className="text-slate-400">USDT na Polygon, simples e claro.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard">
            <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5">
              Voltar
            </Button>
          </Link>
          <Button onClick={fetchAll} variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5">
            Recarregar
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="bg-[#111116] border-white/5">
          <CardContent className="py-10 flex items-center justify-center text-slate-300 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="bg-red-950/20 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-white">Erro</CardTitle>
            <CardDescription className="text-red-300/80">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchAll} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-[#111116] border-white/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Saldo</CardTitle>
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Wallet className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold text-white font-mono">{fmtCrypto(wallet!.balance, wallet!.token)}</div>
                <div className="text-xs text-slate-500">Rede: {wallet!.network}</div>
              </CardContent>
            </Card>

            <Card className="bg-[#111116] border-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Endereço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {address ? (
                  <>
                    <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 flex items-center justify-between gap-3">
                      <div className="text-white font-mono text-sm break-all">{truncated}</div>
                      <div className="flex items-center gap-2">
                        <Button onClick={onCopy} variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 h-9 px-3">
                          <Copy className="w-4 h-4" />
                        </Button>
                        {polyscanUrl && (
                          <a href={polyscanUrl} target="_blank" rel="noreferrer" className="inline-flex">
                            <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 h-9 px-3">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                    {copyMsg && <div className="text-xs text-slate-400">{copyMsg}</div>}
                    <div className="text-xs text-slate-500">Deposite somente USDT (Polygon) neste endereço.</div>
                  </>
                ) : (
                  <div className="text-sm text-slate-400">Endereço indisponível no momento.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-[#111116] border-white/5">
              <CardHeader>
                <CardTitle className="text-white">Depósitos recentes</CardTitle>
                <CardDescription className="text-slate-400">Entradas de USDT detectadas na rede.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {wallet!.deposits.length === 0 ? (
                  <div className="text-sm text-slate-400">Nenhum depósito recente.</div>
                ) : (
                  <div className="divide-y divide-white/10 rounded-lg border border-white/10 bg-black/20">
                    {wallet!.deposits.map((d) => (
                      <div key={d.txHash} className="p-4 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-sm text-slate-200 font-mono">{fmtCrypto(d.amount, wallet!.token)}</div>
                          <div className="text-xs text-slate-500">{fmtDate(d.detectedAt)}</div>
                          <a
                            href={`https://polygonscan.com/tx/${d.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                          >
                            Ver no explorador <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className={`text-sm font-mono ${statusColor(d.status)}`}>{d.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#111116] border-white/5">
              <CardHeader>
                <CardTitle className="text-white">Saques recentes</CardTitle>
                <CardDescription className="text-slate-400">Saídas solicitadas de USDT.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {wallet!.withdrawals.length === 0 ? (
                  <div className="text-sm text-slate-400">Nenhum saque recente.</div>
                ) : (
                  <div className="divide-y divide-white/10 rounded-lg border border-white/10 bg-black/20">
                    {wallet!.withdrawals.map((w, idx) => (
                      <div key={`${w.txHash || 'nohash'}-${idx}`} className="p-4 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-sm text-slate-200 font-mono">{fmtCrypto(w.amount, wallet!.token)}</div>
                          <div className="text-xs text-slate-500">{fmtDate(w.createdAt)}</div>
                          {w.txHash && (
                            <a
                              href={`https://polygonscan.com/tx/${w.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                            >
                              Ver no explorador <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className={`text-sm font-mono ${statusColor(w.status)}`}>{w.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-[#111116] border-white/5">
            <CardHeader>
              <CardTitle className="text-white">Ajuda</CardTitle>
              <CardDescription className="text-slate-400">Passo a passo para depositar USDT na Polygon.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
                    Ver instruções para depositar USDT na Polygon
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0b0b0f] border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle>Como depositar USDT na Polygon</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-sm text-slate-300">
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Copie o endereço desta carteira.</li>
                      <li>Na sua exchange/carteira externa, escolha retirar/enviar USDT.</li>
                      <li>Selecione a rede Polygon (MATIC).</li>
                      <li>Cole o endereço e confirme o envio.</li>
                      <li>Acompanhe o status em “Depósitos recentes”.</li>
                    </ol>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3 text-amber-200">
                      Sempre confira a rede. Enviar em rede diferente pode resultar em perda de fundos.
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Link href="/dashboard/wallet/deposit">
                <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5">
                  Ir para depósitos
                </Button>
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
