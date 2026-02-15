import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import ClaimClient from './ClaimClient';

function toNumber(value: any) {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const claim = await prisma.claimLink.findUnique({
    where: { token },
    include: {
      virtualCard: {
        include: {
          transfer: true,
        },
      },
    },
  });

  if (!claim || !claim.virtualCard || !claim.virtualCard.transferId) {
    notFound();
  }

  const isUnlocked = Boolean(claim.virtualCard.unlockedAt);

  return (
    <ClaimClient
      transferId={claim.virtualCard.transferId}
      cardLast4={claim.virtualCard.last4}
      expMonth={claim.virtualCard.expMonth}
      expYear={claim.virtualCard.expYear}
      isUnlocked={isUnlocked}
      amount={toNumber(claim.amount)}
      currency={claim.currency}
      recipientEmail={claim.virtualCard.transfer?.recipientEmail}
      expiresAtISO={claim.expiresAt.toISOString()}
      claimStatus={claim.status}
    />
  );
}
