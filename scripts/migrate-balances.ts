const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting balance migration...');

  const wallets = await prisma.account.findMany();
  console.log(`Found ${wallets.length} wallets to migrate.`);

  for (const wallet of wallets) {
    const balancesToMigrate = [
      { currency: 'EUR', amount: account.balanceEUR },
      { currency: 'USD', amount: account.balanceUSD },
      { currency: 'GBP', amount: account.balanceGBP },
    ];

    for (const { currency, amount } of balancesToMigrate) {
      // Only migrate if there is a balance or if we want to initialize it
      // Using upsert to be safe
      await prisma.balance.upsert({
        where: {
          accountId_currency: {
            accountId: account.id,
            currency: currency,
          },
        },
        update: {
          amount: amount,
        },
        create: {
          accountId: account.id,
          currency: currency,
          amount: amount,
        },
      });
    }
    process.stdout.write('.');
  }

  console.log('\n✅ Balance migration completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
