
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { TransactionItem } from '../components/TransactionsList'; // Reuse type
import { SkeletonTable } from '@/components/ui/skeleton';

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
    <div className="space-y-6 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Detailed Statement</h1>
          <p className="text-gray-500">View and filter your complete financial history.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, email or description..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Transaction Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Transactions</SelectItem>
            <SelectItem value="TRANSFER">Transfers</SelectItem>
            <SelectItem value="CARD">Card</SelectItem>
            <SelectItem value="FEE">Fees</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <SkeletonTable />
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-gray-500">
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => {
                const isCredit = t.type === 'TRANSFER_RECEIVED';
                return (
                  <TableRow key={t.id} className="hover:bg-gray-50/50 cursor-pointer">
                    <TableCell className="text-gray-600">
                      {new Date(t.date).toLocaleDateString('pt-BR')} <br />
                      <span className="text-xs text-gray-400">{new Date(t.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">{t.description}</TableCell>
                    <TableCell>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600 uppercase tracking-wide">
                        {t.type.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.status === 'COMPLETED' || t.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          t.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {t.status}
                      </span>
                    </TableCell>
                    <TableCell className={`text-right font-mono font-bold ${isCredit ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {isCredit ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {pagination.totalPages} ({pagination.total} records)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
