import { ArrowUpRight, ArrowDownLeft, ShoppingBag, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface TransactionItem {
  id: string;
  type: 'TRANSFER_SENT' | 'TRANSFER_RECEIVED' | 'CARD_PURCHASE' | 'FEE';
  amount: number;
  currency: string;
  description: string;
  status: string;
  date: string | Date;
}

interface TransactionsListProps {
  transactions: TransactionItem[];
  currentUserId?: string; // Optional now as type handles direction
}

export function TransactionsList({ transactions }: TransactionsListProps) {
  return (
    <div className="card-premium overflow-hidden bg-white">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Transações Recentes</h3>
        <button className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium">Ver todas</button>
      </div>
      
      <div className="divide-y divide-gray-50">
        {transactions.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">Nenhuma transação recente</div>
        )}
        {transactions.map((t) => {
          const isCredit = t.type === 'TRANSFER_RECEIVED';
          const isFee = t.type === 'FEE';
          
          let Icon = ArrowUpRight;
          let bgClass = 'bg-gray-100';
          let textClass = 'text-gray-500';

          if (isCredit) {
            Icon = ArrowDownLeft;
            bgClass = 'bg-emerald-50';
            textClass = 'text-emerald-600';
          } else if (t.type === 'CARD_PURCHASE') {
            Icon = ShoppingBag;
            bgClass = 'bg-blue-50';
            textClass = 'text-blue-600';
          } else if (isFee) {
            Icon = Receipt;
            bgClass = 'bg-orange-50';
            textClass = 'text-orange-600';
          }

          return (
            <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgClass}`}>
                  <Icon className={`w-5 h-5 ${textClass}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • 
                    {new Date(t.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`text-sm font-bold font-mono ${isCredit ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {isCredit ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
                </p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                  t.status === 'COMPLETED' || t.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                  t.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {t.status === 'COMPLETED' || t.status === 'approved' ? 'Sucesso' : t.status === 'PENDING' ? 'Pendente' : t.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
