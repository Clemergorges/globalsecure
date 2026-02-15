import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { CardsList } from './components/cards-list';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meus Cartões | GlobalSecureSend',
  description: 'Gerencie seus cartões virtuais',
};

export default async function CardsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // Fetch wallet to ensure user is fully onboarded
  let account = await prisma.account.findUnique({
    where: { userId: session.userId },
  });

  if (!account) {
    try {
      console.log(`Wallet missing for user ${session.userId} in cards page. Creating...`);
      account = await prisma.account.create({
        data: {
          userId: session.userId,
          primaryCurrency: 'EUR',
          balances: {
            create: { currency: 'EUR', amount: 0 }
          }
        }
      });
    } catch (error) {
      console.error('Failed to auto-create wallet in cards page:', error);
      // Fallback
      return (
        <div className="p-8 text-center text-red-600">
          <h2 className="text-2xl font-bold mb-2">Carteira não encontrada</h2>
          <p>Por favor, entre em contato com o suporte para resolver este problema.</p>
        </div>
      );
    }
  }

  // Fetch cards
  const cards = await prisma.virtualCard.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  });

  // Serialize Decimal/Date for Client Component
  const serializedCards = cards.map(card => ({
    ...card,
    amount: card.amount.toNumber(),
    amountUsed: card.amountUsed.toNumber(),
    // Dates are automatically handled by Next.js in recent versions for Server->Client props 
    // but safer to keep as is or convert if needed. 
    // Prisma Date objects are usually fine to pass to Client Components in Next.js App Router 
    // (they get serialized to string automatically, but we might need to new Date() them on client).
    // Let's pass them as is, but if we get a warning, we'll convert to ISO string.
    // Actually, `decimal` types often cause issues. I already converted them to number above.
  }));

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Meus Cartões</h1>
          <p className="text-gray-500">Gerencie seus cartões virtuais e visualize detalhes.</p>
        </div>
      </div>

      <CardsList initialCards={serializedCards} />
    </div>
  );
}
