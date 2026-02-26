const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function upsertUser(params) {
  const hash = await bcrypt.hash(params.password, 10);
  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      passwordHash: hash,
      emailVerified: true,
      role: params.role,
      country: params.country,
      kycLevel: params.kycLevel,
      kycStatus: params.kycStatus,
    },
    create: {
      email: params.email,
      passwordHash: hash,
      emailVerified: true,
      role: params.role,
      firstName: params.firstName,
      lastName: params.lastName,
      country: params.country,
      kycLevel: params.kycLevel,
      kycStatus: params.kycStatus,
    },
    select: { id: true, email: true },
  });
}

async function ensureAccountAndBalances(userId, primaryCurrency, balances) {
  const account = await prisma.account.upsert({
    where: { userId },
    update: { primaryCurrency },
    create: { userId, primaryCurrency },
    select: { id: true },
  });

  for (const b of balances) {
    await prisma.fiatBalance.upsert({
      where: { userId_currency: { userId, currency: b.currency } },
      update: { amount: b.amount },
      create: { userId, currency: b.currency, amount: b.amount },
    });
  }

  return account.id;
}

async function main() {
  const password = 'Globalsecure2026!';

  const sender = await upsertUser({
    email: 'demo.sender@gss.local',
    firstName: 'Demo',
    lastName: 'Sender',
    country: 'DE',
    role: UserRole.END_USER,
    kycLevel: 2,
    kycStatus: 'APPROVED',
    password,
  });

  const recipient = await upsertUser({
    email: 'demo.recipient@gss.local',
    firstName: 'Demo',
    lastName: 'Recipient',
    country: 'DE',
    role: UserRole.END_USER,
    kycLevel: 2,
    kycStatus: 'APPROVED',
    password,
  });

  await ensureAccountAndBalances(sender.id, 'EUR', [
    { currency: 'EUR', amount: 2000 },
    { currency: 'USD', amount: 2000 },
    { currency: 'GBP', amount: 500 },
    { currency: 'BRL', amount: 5000 },
  ]);

  await ensureAccountAndBalances(recipient.id, 'EUR', [
    { currency: 'EUR', amount: 100 },
    { currency: 'USD', amount: 100 },
    { currency: 'GBP', amount: 100 },
    { currency: 'BRL', amount: 100 },
  ]);

  console.log('DEMO_SENDER_EMAIL=demo.sender@gss.local');
  console.log('DEMO_RECIPIENT_EMAIL=demo.recipient@gss.local');
  console.log('DEMO_PASSWORD=Globalsecure2026!');
  console.log('CARD_EMAIL_NO_ACCOUNT=card.external@gss.local');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

