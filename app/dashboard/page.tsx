"use client";

import { useState, useEffect } from 'react';
import { BalanceCard } from './components/BalanceCard';
import { QuickActionsGrid } from './components/QuickActionsGrid';
import { TransactionsList, TransactionItem } from './components/TransactionsList';
import { CardVirtualItem } from './components/CardVirtualItem';
import { Plus } from 'lucide-react';
import { pusherClient } from '@/lib/pusher-client';
import { SkeletonBalance, SkeletonCard, SkeletonTransaction } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState('EUR');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cards, setCards] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Setup Real-time Listeners
  useEffect(() => {
    if (!userId) return;

    const channelName = `user-${userId}`;
    const channel = pusherClient.subscribe(channelName);

    const handleDataUpdate = () => {
      fetchDashboardData();
    };

    channel.bind('transfer:received', handleDataUpdate);
    channel.bind('transfer:sent', handleDataUpdate);
    channel.bind('card-update', handleDataUpdate);

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
    };
  }, [userId]);

  async function fetchDashboardData() {
    try {
      // Parallel Fetching
      const [walletRes, transactionsRes, cardsRes] = await Promise.all([
        fetch('/api/wallet/balance'),
        fetch('/api/wallet/transactions'),
        fetch('/api/cards')
      ]);

      const walletData = await walletRes.json();
      const transactionsData = await transactionsRes.json();
      const cardsData = await cardsRes.json();

      setBalance(Number(walletData.balance) || 0);
      setCurrency(walletData.currency || 'EUR');
      setTransactions(transactionsData.transactions || []);
      setCards(cardsData.cards ? cardsData.cards.slice(0, 3) : []); // Show max 3 cards
      setUserId(walletData.userId);

    } catch (error) {
      console.error('Dashboard load failed:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkeletonCard />
          </div>
          <div>
            <SkeletonCard />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <SkeletonTransaction />
            <SkeletonTransaction />
            <SkeletonTransaction />
          </div>
          <div>
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-20">

      {/* Top Row: Balance (Hero) & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zone 1: Hero/Balance - Takes 2/3 on large screens */}
        <div className="lg:col-span-2 h-full">
          <BalanceCard balance={balance} currency={currency} />
        </div>

        {/* Zone 2: Quick Actions - Takes 1/3 */}
        <div className="h-full">
          <QuickActionsGrid />
        </div>
      </div>

      {/* Bottom Row: Transactions & Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zone 3: Recent Transactions - Takes 2/3 */}
        <div className="lg:col-span-2">
          <TransactionsList transactions={transactions} />
        </div>

        {/* Zone 4: Active Cards - Takes 1/3 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Cartões Ativos</h3>
            <button className="text-sm font-medium text-[var(--color-primary)] hover:underline">Gerenciar</button>
          </div>

          <div className="grid gap-4">
            {cards.map((card) => (
              <CardVirtualItem key={card.id} card={card} />
            ))}

            <button className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all bg-gray-50/50 hover:bg-white">
              <Plus className="w-5 h-5" />
              <span className="font-medium">Criar Novo Cartão</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
