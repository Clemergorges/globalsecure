"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export default function ActivityPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
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
      <h2 className="text-2xl font-bold">Activity</h2>
      
      <div className="space-y-4">
        {transfers.map((t) => (
          <Card key={t.id} className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                 <div className="font-medium">Transfer to {t.receiver?.fullName || t.receiverId || 'External'}</div>
                 <div className="text-sm text-slate-400">{formatDate(t.createdAt)}</div>
                 <div className="text-xs text-slate-500 mt-1">Status: {t.status}</div>
              </div>
              <div className="text-right">
                <div className="font-bold">
                  {formatCurrency(Number(t.amountSource), t.currencySource)}
                </div>
                <div className="text-sm text-slate-400">
                  → {formatCurrency(Number(t.amountTarget), t.currencyTarget)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
