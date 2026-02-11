"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface TransferActivity {
  id: string;
  recipientName?: string;
  recipientEmail?: string;
  amountSent: number;
  currencySent: string;
  amountReceived: number;
  currencyReceived: string;
  status: string;
  createdAt: string;
}

export default function ActivityPage() {
  const [transfers, setTransfers] = useState<TransferActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/transfers')
      .then(res => res.json())
      .then(data => setTransfers(data.transfers || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Histórico de Atividades</h2>
      
      <div className="space-y-4">
        {transfers.length === 0 ? (
          <div className="text-center p-8 text-gray-500">Nenhuma atividade recente.</div>
        ) : (
          transfers.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                   <div className="font-semibold text-gray-900 dark:text-white">
                      Envio para {t.recipientName || t.recipientEmail || 'Destinatário'}
                   </div>
                   <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(t.createdAt)}
                   </div>
                   <div className="mt-2">
                     <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                       t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                       t.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                       'bg-gray-100 text-gray-700'
                     }`}>
                       {t.status === 'COMPLETED' ? 'Concluído' : 
                        t.status === 'PENDING' ? 'Pendente' : t.status}
                     </span>
                   </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-gray-900 dark:text-white">
                    -{formatCurrency(Number(t.amountSent), t.currencySent)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Recebido: {formatCurrency(Number(t.amountReceived), t.currencyReceived)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
