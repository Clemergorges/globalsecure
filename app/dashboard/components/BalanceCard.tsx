'use client';

import { Button } from '@/components/ui/button';
import { Plus, ArrowUpRight, Loader2, Wallet, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';

interface BalanceCardProps {
  balance: number;
  currency: string;
}

export function BalanceCard({ balance, currency }: BalanceCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  
  // Crypto Data
  const [cryptoData, setCryptoData] = useState<{ address: string; qrCode: string; network: string } | null>(null);
  
  // Withdraw State
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Swap State
  const [swapFrom, setSwapFrom] = useState('USDT');
  const [swapTo, setSwapTo] = useState('EUR');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapResult, setSwapResult] = useState<any>(null);
  const [swapStatus, setSwapStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleTopUp = async () => {
    // ... existing logic
  };

  const handleCryptoDeposit = async () => {
    // ... existing logic
  };

  const handleWithdraw = async () => {
    setWithdrawStatus('loading');
    try {
      const res = await fetch('/api/crypto/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          toAddress: withdrawAddress
        })
      });
      const data = await res.json();
      if (res.ok) {
        setWithdrawStatus('success');
        setWithdrawAmount('');
        setWithdrawAddress('');
      } else {
        alert(data.error);
        setWithdrawStatus('error');
      }
    } catch (e) {
      setWithdrawStatus('error');
    }
  };

  const handleSwap = async () => {
    setSwapStatus('loading');
    try {
      const res = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAsset: swapFrom,
          toAsset: swapTo,
          amount: parseFloat(swapAmount)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSwapResult(data);
        setSwapStatus('success');
        setSwapAmount('');
        router.refresh(); // Refresh balance
      } else {
        alert(data.error);
        setSwapStatus('error');
      }
    } catch (e) {
      setSwapStatus('error');
    }
  };

  return (
    <>
      <div className="card-premium relative overflow-hidden h-full bg-gradient-to-br from-[var(--color-primary)] to-[#2563eb] text-white shadow-xl group">
        
        {/* Abstract Shapes Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

        <div className="relative z-10 p-8 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <span className="text-sm font-medium">Saldo Total Disponível</span>
              <div className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold backdrop-blur-sm">
                MAIN
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-mono mb-2">
              {formatCurrency(balance, currency)}
            </h1>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 text-sm">
              <ArrowUpRight className="w-4 h-4 text-emerald-300" /> 
              <span className="font-medium">+€125.00</span> 
              <span className="opacity-70 text-xs">este mês</span>
            </div>
          </div>

          <div className="flex gap-3 mt-8 flex-wrap">
            <Button onClick={() => setShowSwapModal(true)} className="bg-white text-[var(--color-primary)] hover:bg-gray-100 hover:shadow-lg font-bold h-11 px-6 rounded-xl border-0 transition-all">
               Swap / Converter
            </Button>
            
            <Button onClick={handleCryptoDeposit} className="bg-indigo-500 hover:bg-indigo-600 text-white border-0 font-bold h-11 px-6 rounded-xl transition-all shadow-md">
               <Wallet className="w-5 h-5 mr-2" /> Depositar
            </Button>

            <Button onClick={() => setShowWithdrawModal(true)} className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-md border border-white/40 font-semibold h-11 px-6 rounded-xl transition-all shadow-sm">
              Sacar Cripto
            </Button>
          </div>
        </div>
      </div>

      {/* Crypto Deposit Modal */}
      <Dialog open={showDepositModal} onOpenChange={setShowDepositModal}>
        <DialogContent className="bg-white sm:max-w-md">
           {/* ... existing deposit content ... */}
           <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-gray-900">Depósito via Crypto</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center p-6 space-y-6">
            {!cryptoData ? (
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            ) : (
              <>
                <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 shadow-sm">
                  <QRCodeSVG value={cryptoData.qrCode} size={200} />
                </div>
                
                <div className="text-center space-y-2 w-full">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Endereço Polygon (USDT)</p>
                  <div className="flex items-center justify-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <code className="text-xs md:text-sm font-mono text-gray-800 break-all">
                      {cryptoData.address}
                    </code>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ Envie apenas USDT na rede <strong>Polygon Amoy</strong>.
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sacar USDT (Polygon)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            {withdrawStatus === 'success' ? (
              <div className="text-center text-green-600">
                <p>Saque solicitado com sucesso!</p>
                <Button onClick={() => setShowWithdrawModal(false)} className="mt-4">Fechar</Button>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium">Endereço de Destino (0x...)</label>
                  <input 
                    className="w-full p-2 border rounded mt-1" 
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder="0x..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Valor (USDT)</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border rounded mt-1" 
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <Button onClick={handleWithdraw} disabled={withdrawStatus === 'loading'} className="w-full">
                  {withdrawStatus === 'loading' ? 'Processando...' : 'Confirmar Saque'}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Swap Modal */}
      <Dialog open={showSwapModal} onOpenChange={setShowSwapModal}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Converter Moedas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            {swapStatus === 'success' ? (
              <div className="text-center text-green-600">
                <p>{swapResult?.message}</p>
                <Button onClick={() => setShowSwapModal(false)} className="mt-4">Fechar</Button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-sm font-medium">De</label>
                    <select 
                      className="w-full p-2 border rounded mt-1"
                      value={swapFrom}
                      onChange={(e) => setSwapFrom(e.target.value)}
                    >
                      <option value="USDT">USDT</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium">Para</label>
                    <select 
                      className="w-full p-2 border rounded mt-1"
                      value={swapTo}
                      onChange={(e) => setSwapTo(e.target.value)}
                    >
                      <option value="EUR">EUR</option>
                      <option value="USDT">USDT</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Valor a Converter</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border rounded mt-1"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <p>Taxa de Câmbio: Base + 0.8% Spread</p>
                </div>

                <Button onClick={handleSwap} disabled={swapStatus === 'loading'} className="w-full">
                  {swapStatus === 'loading' ? 'Calculando...' : 'Converter Agora'}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
