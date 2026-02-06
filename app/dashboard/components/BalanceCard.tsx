'use client';

import { Button } from '@/components/ui/button';
import { Plus, ArrowUpRight, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BalanceCardProps {
  balance: number;
  currency: string;
}

export function BalanceCard({ balance, currency }: BalanceCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleTopUp = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 100, // Default demo amount (could be a modal later)
          currency: currency || 'EUR'
        })
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Erro ao iniciar recarga');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao conectar com pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
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

        <div className="flex gap-3 mt-8">
          <Button onClick={handleTopUp} disabled={loading} className="bg-white text-[var(--color-primary)] hover:bg-gray-100 hover:shadow-lg font-bold h-11 px-6 rounded-xl border-0 transition-all">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5 mr-2" /> Recarregar</>}
          </Button>
          <Button onClick={() => router.push('/dashboard/send')} className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-md border border-white/40 font-semibold h-11 px-6 rounded-xl transition-all shadow-sm">
            Enviar Dinheiro
          </Button>
        </div>
      </div>
    </div>
  );
}
