
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Search, ChevronLeft, ChevronRight, Activity, ArrowUpRight, ArrowDownLeft, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { TransactionItem } from '../components/TransactionsList'; // Reuse type
import { SkeletonTable } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Define fetchTransactions inside or use useCallback (moving inside useEffect for simplicity here to avoid circular dep)
  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '15',
          type,
          search: debouncedSearch
        });

        const res = await fetch(`/api/wallet/transactions?${params}`);
        const data = await res.json();

        setTransactions(data.transactions || []);
        setPagination(data.pagination || { total: 0, totalPages: 1 });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [page, debouncedSearch, type]);

  function handleExport() {
    window.location.href = '/api/wallet/transactions/export';
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-20 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Extrato Detalhado</h1>
          <p className="text-slate-400">Visualize e filtre todo o seu histórico financeiro.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2 border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#111116] backdrop-blur-md p-4 rounded-xl border border-white/5 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, email ou descrição..."
            className="pl-9 bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full md:w-[200px] bg-black/20 border-white/10 text-white focus:ring-cyan-500/50">
            <SelectValue placeholder="Tipo de Transação" />
          </SelectTrigger>
          <SelectContent className="bg-[#111116] border-white/10 text-white">
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="TRANSFER">Transferências</SelectItem>
            <SelectItem value="CARD">Cartão</SelectItem>
            <SelectItem value="FEE">Taxas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-[#111116] rounded-xl border border-white/5 shadow-sm overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="hover:bg-transparent border-white/5">
              <TableHead className="text-slate-400">Data</TableHead>
              <TableHead className="text-slate-400">Descrição</TableHead>
              <TableHead className="text-slate-400">Tipo</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-right text-slate-400">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <div className="p-8 space-y-4">
                    <div className="h-8 bg-white/5 rounded w-full animate-pulse" />
                    <div className="h-8 bg-white/5 rounded w-full animate-pulse" />
                    <div className="h-8 bg-white/5 rounded w-full animate-pulse" />
                  </div>
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-slate-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Nenhuma transação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => {
                const isCredit = t.type === 'TRANSFER_RECEIVED' || t.type === 'DEPOSIT';
                const isDebit = !isCredit;
                
                return (
                  <TableRow key={t.id} className="hover:bg-white/[0.02] cursor-pointer border-white/5 transition-colors group">
                    <TableCell className="text-slate-300">
                      {new Date(t.date).toLocaleDateString('pt-BR')} <br />
                      <span className="text-xs text-slate-500">{new Date(t.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </TableCell>
                    <TableCell className="font-medium text-white group-hover:text-cyan-50 transition-colors">{t.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {t.type.includes('CARD') ? <CreditCard className="w-3 h-3 text-purple-400" /> : 
                         isCredit ? <ArrowDownLeft className="w-3 h-3 text-emerald-400" /> :
                         <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        }
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                            {t.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider",
                        (t.status === 'COMPLETED' || t.status === 'approved' || t.status === 'succeeded') 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : t.status === 'PENDING' 
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                        )}>
                        {t.status}
                      </span>
                    </TableCell>
                    <TableCell className={cn(
                        "text-right font-mono font-bold tracking-tight",
                        isCredit ? 'text-emerald-400' : 'text-slate-300'
                    )}>
                      {isCredit ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Página {page} de {pagination.totalPages} ({pagination.total} registros)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
