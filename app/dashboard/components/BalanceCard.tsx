import { Button } from '@/components/ui/button';
import { Plus, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface BalanceCardProps {
  balance: number;
  currency: string;
}

export function BalanceCard({ balance, currency }: BalanceCardProps) {
  return (
    <div className="card-premium p-8 flex flex-col justify-between h-full bg-white relative overflow-hidden group">
      <div className="relative z-10">
        <p className="text-gray-500 font-medium text-sm mb-2">Saldo Total Disponível</p>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-1 font-mono">
          {formatCurrency(balance, currency)}
        </h1>
        <p className="text-emerald-500 text-sm font-medium flex items-center gap-1 mb-8">
          <ArrowUpRight className="w-4 h-4" /> +€125.00 este mês
        </p>

        <div className="flex gap-3">
          <Button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold h-11 px-6 rounded-lg shadow-sm transition-all hover:shadow-md">
            <Plus className="w-5 h-5 mr-2" /> Recarregar
          </Button>
          <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 font-medium h-11 px-6 rounded-lg">
            Enviar Dinheiro
          </Button>
        </div>
      </div>
      
      {/* Decorative subtle background graphic */}
      <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[var(--color-primary)] opacity-5 rounded-full blur-3xl pointer-events-none group-hover:opacity-10 transition-opacity duration-700"></div>
    </div>
  );
}
