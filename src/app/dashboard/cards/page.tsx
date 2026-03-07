import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { CardsList } from './components/cards-list';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Meus Cartões | GlobalSecureSend',
  description: 'Gerencie seus cartões virtuais',
};

export default async function CardsPage() {
  const t = await getTranslations('Cards');
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
          <h2 className="text-2xl font-bold mb-2">{t('error')}</h2>
          <p>{t('noCardsFound')}</p>
        </div>
      );
    }
  }

  // Fetch cards
  const cards = await prisma.virtualCard.findMany({
    where: { userId: session.userId },
    include: { claimLink: true, transfer: true },
    orderBy: { createdAt: 'desc' },
  });

  // Serialize Decimal/Date for Client Component
  const serializedCards = cards.map(card => {
    const transfer = card.transfer
      ? {
          ...card.transfer,
          amountSent: Number(card.transfer.amountSent),
          fee: Number(card.transfer.fee),
          feePercentage: Number(card.transfer.feePercentage),
          exchangeRate: Number(card.transfer.exchangeRate),
          amountReceived: Number(card.transfer.amountReceived),
        }
      : null;

    const claimLink = card.claimLink
      ? {
          ...card.claimLink,
          amount: Number(card.claimLink.amount),
        }
      : null;

    return {
      ...card,
      amount: Number(card.amount),
      amountUsed: Number(card.amountUsed),
      transfer,
      claimLink,
    };
  });

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
          <p className="text-slate-400">{t('description')}</p>
        </div>
      </div>

      <CardsList initialCards={serializedCards} />
    </div>
  );
}
