import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MOCK_TRANSACTIONS, MOCK_CARDS } from '@/lib/mock-data';
import { BalanceCard } from './components/BalanceCard';
import { QuickActionsGrid } from './components/QuickActionsGrid';
import { TransactionsList } from './components/TransactionsList';
import { CardVirtualItem } from './components/CardVirtualItem';
import { Plus } from 'lucide-react';

async function getData() {
  const session = await getSession();
  if (!session) return null;

  // @ts-ignore
  const user = await prisma.user.findUnique({
    // @ts-ignore
    where: { id: session.userId },
    include: { wallet: true }
  });

  const dbTransfers = await prisma.transfer.findMany({
    where: {
      OR: [
        // @ts-ignore
        { senderId: session.userId },
        // @ts-ignore
        { recipientId: session.userId }
      ]
    },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  const transfers = dbTransfers.length > 0 ? dbTransfers : MOCK_TRANSACTIONS;
  const cards = MOCK_CARDS; 

  // @ts-ignore
  return { user, transfers, cards, userId: session.userId };
}

export default async function DashboardPage() {
  const data = await getData();

  if (!data || !data.user) {
    return <div className="p-8 text-center text-gray-500">Sessão expirada. Por favor faça login novamente.</div>;
  }

  const wallet = data.user.wallet;
  const balance = wallet?.balanceEUR || 1250.50;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-20">
      
      {/* Top Row: Balance (Hero) & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zone 1: Hero/Balance - Takes 2/3 on large screens */}
        <div className="lg:col-span-2 h-full">
          <BalanceCard balance={Number(balance)} currency="EUR" />
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
          <TransactionsList transactions={data.transfers} currentUserId={data.userId} />
        </div>

        {/* Zone 4: Active Cards - Takes 1/3 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Cartões Ativos</h3>
            <button className="text-sm font-medium text-[var(--color-primary)] hover:underline">Gerenciar</button>
          </div>
          
          <div className="grid gap-4">
            {data.cards.map((card) => (
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
