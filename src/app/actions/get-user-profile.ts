'use server'

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function getUserProfile() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      country: true, account: {
        select: { primaryCurrency: true }
      }
    }
  });

  return {
    country: user?.country || 'US',
    currency: user?.account?.primaryCurrency || 'USD'
  };
}