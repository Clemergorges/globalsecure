const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const { PrismaClient } = require('@prisma/client');

const emails = [process.env.PURGE_EMAIL_1, process.env.PURGE_EMAIL_2]
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const confirm = process.argv.includes('--confirm');

async function purgeUserByEmail(prisma, email) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { account: true }
  });

  if (!user) {
    return { email, found: false, deleted: false };
  }

  const accountId = user.account?.id || null;
  const userId = user.id;

  const cards = await prisma.virtualCard.findMany({
    where: { userId },
    select: { id: true, transferId: true }
  });
  const cardIds = cards.map((c) => c.id);
  const cardTransferIds = cards.map((c) => c.transferId).filter(Boolean);

  const transfers = await prisma.transfer.findMany({
    where: { OR: [{ senderId: userId }, { recipientId: userId }, { recipientEmail: email }] },
    select: { id: true }
  });
  const transferIds = Array.from(new Set([...transfers.map((t) => t.id), ...cardTransferIds]));

  await prisma.spendingLimit.deleteMany({ where: { userId } });

  if (cardIds.length) {
    await prisma.spendTransaction.deleteMany({ where: { cardId: { in: cardIds } } });
    await prisma.cardActivationToken.deleteMany({ where: { cardId: { in: cardIds } } });
    await prisma.claimLink.deleteMany({ where: { virtualCardId: { in: cardIds } } });
  }

  await prisma.claimLink.deleteMany({ where: { creatorId: userId } });

  if (transferIds.length) {
    await prisma.transactionLog.deleteMany({ where: { transferId: { in: transferIds } } });
    await prisma.accountTransaction.deleteMany({ where: { transferId: { in: transferIds } } });
    await prisma.virtualCard.deleteMany({ where: { transferId: { in: transferIds } } });
  }

  await prisma.virtualCard.deleteMany({ where: { userId } });

  if (transferIds.length) {
    await prisma.transfer.deleteMany({ where: { id: { in: transferIds } } });
  }

  if (accountId) {
    await prisma.userTransaction.deleteMany({ where: { OR: [{ userId }, { accountId }] } });
    await prisma.savingsGoal.deleteMany({ where: { OR: [{ userId }, { accountId }] } });
    await prisma.accountTransaction.deleteMany({ where: { accountId } });
    await prisma.balance.deleteMany({ where: { accountId } });
    await prisma.account.delete({ where: { id: accountId } });
  } else {
    await prisma.userTransaction.deleteMany({ where: { userId } });
    await prisma.savingsGoal.deleteMany({ where: { userId } });
  }

  await prisma.recurringPayment.deleteMany({ where: { userId } });
  await prisma.cryptoDeposit.deleteMany({ where: { userId } });
  await prisma.topUp.deleteMany({ where: { userId } });
  await prisma.cryptoWithdraw.deleteMany({ where: { userId } });
  await prisma.swap.deleteMany({ where: { userId } });
  await prisma.kYCDocument.deleteMany({ where: { userId } });
  await prisma.kycVerification.deleteMany({ where: { userId } });
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.oTP.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.address.deleteMany({ where: { userId } });
  await prisma.auditLog.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });

  return { email, found: true, deleted: true, userId };
}

async function main() {
  const prisma = new PrismaClient({ log: [] });
  try {
    const before = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true }
    });

    console.log(JSON.stringify({ foundBefore: before }, null, 2));

    if (!confirm) {
      console.log(JSON.stringify({ ok: false, error: 'Missing --confirm' }, null, 2));
      process.exitCode = 2;
      return;
    }

    const results = [];
    for (const email of emails) {
      results.push(await purgeUserByEmail(prisma, email));
    }

    const after = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true }
    });

    console.log(JSON.stringify({ results, foundAfter: after }, null, 2));
    if (after.length) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e?.message || String(e));
  process.exitCode = 1;
});
