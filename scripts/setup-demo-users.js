require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = 'Globalsecure2026!';
  const hash = await bcrypt.hash(password, 10);

  const users = [
    { email: 'clemergorges@hotmail.com', firstName: 'Clemer', lastName: 'Gorges' },
    { email: 'admin@globalsecuresend.com', firstName: 'Admin', lastName: 'Global' },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, emailVerified: true },
      create: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: hash,
        emailVerified: true,
        country: 'BR',
        account: {
          create: {
            primaryCurrency: 'BRL',
            balances: {
              createMany: {
                data: [
                  { currency: 'BRL', amount: 1000 },
                  { currency: 'EUR', amount: 1000 },
                  { currency: 'USD', amount: 1000 },
                ],
              },
            },
          },
        },
      },
      include: { account: true },
    });

    if (!user.account) {
      await prisma.account.create({
        data: {
          userId: user.id,
          primaryCurrency: 'BRL',
          balances: {
            createMany: {
              data: [
                { currency: 'BRL', amount: 1000 },
                { currency: 'EUR', amount: 1000 },
                { currency: 'USD', amount: 1000 },
              ],
            },
          },
        },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

