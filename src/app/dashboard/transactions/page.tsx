
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import TransactionsClient from './TransactionsClient';

function toNumber(value: any) {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

export default async function TransactionsPage() {
  const session = await getSession();
  if (!session) redirect('/auth/login');

  const claims = await prisma.claimLink.findMany({
    where: { creatorId: session.userId },
    include: {
      virtualCard: {
        include: { transfer: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const claimTransactions = claims
    .filter((c) => c.virtualCard)
    .map((c) => {
      const unlocked = Boolean((c.virtualCard as any)?.unlockedAt);
      const status = unlocked ? 'COMPLETED' : 'PENDING';
      const recipient = (c.virtualCard as any)?.transfer?.recipientEmail;

      return {
        id: c.id,
        type: 'CLAIM_SEND',
        amount: toNumber(c.amount),
        currency: c.currency,
        description: `Envio via cartão (Claim)${recipient ? ` – ${recipient}` : ''}`,
        status,
        date: c.createdAt,
        expiresAt: c.expiresAt.toISOString(),
      };
    });

  return <TransactionsClient claimTransactions={claimTransactions as any} />;
}
