import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/logger';

export async function createDataExportJob(params: {
  userId: string;
  ip?: string;
  userAgent?: string;
}) {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const job = await prisma.dataExportJob.create({
    data: {
      userId: params.userId,
      status: 'COMPLETED',
      completedAt: new Date(),
      expiresAt,
    }
  });

  await logAudit({
    userId: params.userId,
    action: 'GDPR_EXPORT_REQUEST',
    status: '201',
    ipAddress: params.ip,
    userAgent: params.userAgent,
    path: '/api/user/privacy/export',
    metadata: { jobId: job.id, expiresAt: job.expiresAt }
  });

  return job;
}

export async function getExportBundle(params: {
  userId: string;
  jobId: string;
  ip?: string;
  userAgent?: string;
}) {
  const job = await prisma.dataExportJob.findUnique({ where: { id: params.jobId } });
  if (!job || job.userId !== params.userId) {
    throw new Error('EXPORT_NOT_FOUND');
  }
  if (job.expiresAt && job.expiresAt.getTime() < Date.now()) {
    throw new Error('EXPORT_EXPIRED');
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    include: { account: { include: { balances: true } } }
  });
  if (!user) throw new Error('USER_NOT_FOUND');

  const { passwordHash, ...safeUser } = user as any;

  const consentRecords = await prisma.userConsentRecord.findMany({
    where: { userId: params.userId },
    orderBy: { acceptedAt: 'desc' },
  });

  const transfers = await prisma.transfer.findMany({
    where: {
      OR: [{ senderId: params.userId }, { recipientId: params.userId }]
    },
    orderBy: { createdAt: 'desc' }
  });

  const cards = await prisma.virtualCard.findMany({
    where: {
      OR: [{ transfer: { recipientId: params.userId } }, { userId: params.userId }]
    },
    select: { id: true }
  });
  const cardIds = cards.map(c => c.id);
  const spendTransactions = cardIds.length > 0
    ? await prisma.spendTransaction.findMany({ where: { cardId: { in: cardIds } }, orderBy: { createdAt: 'desc' } })
    : [];

  const account = await prisma.account.findUnique({ where: { userId: params.userId } });
  const fees = account
    ? await prisma.accountTransaction.findMany({ where: { accountId: account.id, type: 'FEE' }, orderBy: { createdAt: 'desc' } })
    : [];

  const transactions = [
    ...transfers.map(t => ({
      date: t.createdAt,
      type: 'TRANSFER',
      amount: Number(t.amountSent),
      currency: t.currencySent,
      status: t.status,
      direction: t.senderId === params.userId ? 'OUT' : 'IN',
      recipientEmail: t.recipientEmail,
      recipientName: t.recipientName,
      senderId: t.senderId,
      transferId: t.id,
    })),
    ...spendTransactions.map(t => ({
      date: t.createdAt,
      type: 'CARD',
      amount: Number(t.amount),
      currency: t.currency,
      status: t.status,
      merchantName: t.merchantName,
      merchantCategory: t.merchantCategory,
      spendTransactionId: t.id,
    })),
    ...fees.map(t => ({
      date: t.createdAt,
      type: 'FEE',
      amount: Number(t.amount),
      currency: t.currency,
      status: 'COMPLETED',
      description: t.description,
      accountTransactionId: t.id,
    })),
  ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const bundle = {
    meta: {
      generatedAt: new Date().toISOString(),
      jobId: job.id,
      expiresAt: job.expiresAt?.toISOString() || null,
      format: 'JSON',
    },
    profile: {
      user: safeUser,
    },
    consents: {
      flags: {
        gdprConsent: user.gdprConsent,
        gdprConsentAt: user.gdprConsentAt,
        marketingConsent: user.marketingConsent,
        cookieConsent: user.cookieConsent,
      },
      records: consentRecords,
    },
    transactions,
  };

  await logAudit({
    userId: params.userId,
    action: 'GDPR_EXPORT_DOWNLOAD',
    status: '200',
    ipAddress: params.ip,
    userAgent: params.userAgent,
    path: '/api/user/privacy/export/:id',
    metadata: { jobId: job.id, transactionCount: transactions.length }
  });

  return bundle;
}

