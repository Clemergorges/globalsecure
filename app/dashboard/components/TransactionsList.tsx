import { ArrowUpRight, ArrowDownLeft, MoreHorizontal } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Transaction {
  id: string;
  recipientName?: string | null;
  amountSent: number | any;
  currencySent: string;
  status: string;
  createdAt: string | Date;
  senderId: string;
}

interface TransactionsListProps {
  transactions: Transaction[];
  currentUserId: string;
}

export function TransactionsList({ transactions, currentUserId }: TransactionsListProps) {
  return (
    <div className="card-premium overflow-hidden bg-white">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Transações Recentes</h3>
        <button className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium">Ver todas</button>
      </div>
      
      <div className="divide-y divide-gray-50">
        {transactions.map((t) => {
          const isDebit = t.senderId === currentUserId;
          return (
            <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDebit ? 'bg-gray-100' : 'bg-emerald-50'}`}>
                  {isDebit ? 
                    <ArrowUpRight className="w-5 h-5 text-gray-500" /> : 
                    <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.recipientName || 'Desconhecido'}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(t.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • 
                    {new Date(t.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`text-sm font-bold font-mono ${isDebit ? 'text-gray-900' : 'text-emerald-600'}`}>
                  {isDebit ? '-' : '+'}{formatCurrency(Number(t.amountSent), t.currencySent)}
                </p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                  t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                  t.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {t.status === 'COMPLETED' ? 'Sucesso' : t.status === 'PENDING' ? 'Pendente' : t.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
