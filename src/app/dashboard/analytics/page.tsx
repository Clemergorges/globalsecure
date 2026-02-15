'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/spend?period=${period}`);
        const data = await res.json();
        setData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnalytics();
  }, [period]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  const total = data.byCategory.reduce((acc: number, curr: any) => acc + curr.value, 0);

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Analytics</h1>
          <p className="text-slate-400">Análise detalhada dos seus gastos.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 3 meses</SelectItem>
            <SelectItem value="1y">Este ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Total Spend Card */}
        <Card className="bg-[#111116] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Gasto</CardTitle>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(total)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              No período selecionado
            </p>
          </CardContent>
        </Card>

        {/* Categories Card */}
        <Card className="bg-[#111116] border-white/10 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.byCategory.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Nenhuma transação encontrada neste período.</p>
            ) : (
              data.byCategory.map((cat: any) => (
                <div key={cat.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getColorForCategory(cat.name)}`} />
                      <span className="text-sm font-medium text-slate-200 capitalize">
                        {cat.name.toLowerCase().replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-white block">
                        {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cat.value)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {((cat.value / total) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getColorForCategory(cat.name)} transition-all duration-500 ease-out`}
                      style={{ width: `${(cat.value / total) * 100}%` }} 
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getColorForCategory(category: string) {
  const map: Record<string, string> = {
    'GROCERIES': 'bg-emerald-500',
    'RESTAURANTS': 'bg-orange-500',
    'TRANSPORT': 'bg-blue-500',
    'ENTERTAINMENT': 'bg-purple-500',
    'SHOPPING': 'bg-pink-500',
    'BILLS': 'bg-red-500',
    'TRANSFERS': 'bg-slate-500',
    'OTHER': 'bg-gray-500'
  };
  return map[category] || 'bg-cyan-500';
}