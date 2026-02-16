const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const { PrismaClient, Prisma } = require('@prisma/client');

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

const email = (getArg('--email') || '').trim().toLowerCase();
const amountRaw = getArg('--amount') || '500';
const confirm = process.argv.includes('--confirm');

const amount = Number(amountRaw);
if (!email) {
  console.error('Missing --email');
  process.exitCode = 2;
} else if (!Number.isFinite(amount) || amount <= 0) {
  console.error('Invalid --amount');
  process.exitCode = 2;
}

async function main() {
  if (process.exitCode) return;

  const prisma = new PrismaClient({ log: [] });
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { account: true }
    });

    if (!user || !user.account) {
      console.log(JSON.stringify({ ok: false, error: 'USER_OR_ACCOUNT_NOT_FOUND', email }, null, 2));
      process.exitCode = 1;
      return;
    }

    const accountId = user.account.id;

    const before = await prisma.balance.findMany({
      where: { accountId },
      select: { currency: true, amount: true }
    });

    console.log(JSON.stringify({ ok: true, email, userId: user.id, accountId, before }, null, 2));

    if (!confirm) {
      console.log(JSON.stringify({ ok: false, error: 'Missing --confirm' }, null, 2));
      process.exitCode = 2;
      return;
    }

    const currencies = ['EUR', 'USD', 'GBP', 'BRL'];
    const amt = new Prisma.Decimal(amount.toFixed(2));

    await prisma.$transaction(async (tx) => {
      for (const currency of currencies) {
        await tx.balance.upsert({
          where: { accountId_currency: { accountId, currency } },
          create: { accountId, currency, amount: amt },
          update: { amount: { increment: amt } }
        });

        await tx.accountTransaction.create({
          data: {
            accountId,
            type: 'DEPOSIT',
            amount: amt,
            currency,
            description: 'Manual topup (admin test)'
          }
        });
      }
    });

    const after = await prisma.balance.findMany({
      where: { accountId },
      select: { currency: true, amount: true }
    });

    console.log(JSON.stringify({ ok: true, email, accountId, after }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e?.message || String(e));
  process.exitCode = 1;
});

