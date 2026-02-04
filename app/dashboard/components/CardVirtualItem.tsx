import { CreditCard, MoreVertical, Copy } from 'lucide-react';

interface Card {
  id: string;
  last4: string;
  brand: string;
  expiry: string;
  status: string;
  alias: string;
}

export function CardVirtualItem({ card }: { card: Card }) {
  const isActive = card.status === 'ACTIVE';
  
  return (
    <div className="card-premium p-5 bg-white border border-gray-100 hover:border-gray-300 transition-all group relative">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-7 rounded bg-gradient-to-br ${isActive ? 'from-gray-800 to-black' : 'from-gray-300 to-gray-400'} flex items-center justify-center shadow-sm`}>
          <div className="w-6 h-4 bg-white/10 rounded-sm"></div>
        </div>
        <div className={`px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase ${isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
          {card.status}
        </div>
      </div>
      
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">{card.alias}</p>
        <div className="flex items-center gap-2">
          <p className="text-lg font-mono font-bold text-gray-900 tracking-widest">
            •••• {card.last4}
          </p>
          <button className="text-gray-400 hover:text-[var(--color-primary)] transition-colors">
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      <div className="flex justify-between items-end border-t border-gray-50 pt-3 mt-2">
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Expira</p>
          <p className="text-xs font-medium text-gray-700">{card.expiry}</p>
        </div>
        <p className="text-xs font-bold text-gray-900 italic">{card.brand}</p>
      </div>
    </div>
  );
}
