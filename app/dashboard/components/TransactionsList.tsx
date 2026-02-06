import { ArrowUpRight, ArrowDownLeft, ShoppingBag, Receipt, Clock, CheckCircle2, XCircle } from 'lucide-react';
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
  currentUserId?: string;
}

export function TransactionsList({ transactions }: TransactionsListProps) {
  return (
    <div className="card-premium overflow-hidden bg-white h-full flex flex-col">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Transações Recentes</h3>
          <p className="text-xs text-gray-500 mt-1">Últimas movimentações da sua conta</p>
        </div>
        <button className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium px-3 py-1.5 rounded-lg hover:bg-[var(--color-primary)]/10 transition-colors">
          Ver extrato completo
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto max-h-[400px]">
        {transactions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-900 font-medium">Nenhuma transação recente</p>
            <p className="text-sm text-gray-500 mt-1 max-w-[200px]">
              Suas transações aparecerão aqui assim que você começar a usar sua conta.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map((t) => {
              const isCredit = t.type === 'TRANSFER_RECEIVED';
              const isFee = t.type === 'FEE';
              
              let Icon = ArrowUpRight;
              let bgClass = 'bg-gray-100';
              let textClass = 'text-gray-600';

              if (isCredit) {
                Icon = ArrowDownLeft;
                bgClass = 'bg-emerald-100';
                textClass = 'text-emerald-700';
              } else if (t.type === 'CARD_PURCHASE') {
                Icon = ShoppingBag;
                bgClass = 'bg-blue-100';
                textClass = 'text-blue-700';
              } else if (isFee) {
                Icon = Receipt;
                bgClass = 'bg-orange-100';
                textClass = 'text-orange-700';
              }

              return (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group cursor-pointer border-l-4 border-transparent hover:border-l-[var(--color-primary)]">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bgClass} shadow-sm group-hover:scale-105 transition-transform`}>
                      <Icon className={`w-6 h-6 ${textClass}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-[var(--color-primary)] transition-colors">
                        {t.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} 
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        {new Date(t.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-base font-bold font-mono tracking-tight ${isCredit ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {isCredit ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
                    </p>
                    <div className="flex justify-end mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        t.status === 'COMPLETED' || t.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                        t.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {t.status === 'COMPLETED' || t.status === 'approved' ? (
                          <><CheckCircle2 className="w-3 h-3" /> Sucesso</>
                        ) : t.status === 'PENDING' ? (
                          <><Clock className="w-3 h-3" /> Pendente</>
                        ) : (
                          <><XCircle className="w-3 h-3" /> {t.status}</>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
