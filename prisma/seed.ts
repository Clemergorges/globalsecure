import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'clemergorges@hotmail.com';
  const password = 'clemer091@';
  const hashedPassword = await hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hashedPassword,
    },
    create: {
      email,
      passwordHash: hashedPassword,
      firstName: 'Clemer',
      lastName: 'Gorges',
      country: 'LU', // Defaulting to Luxembourg as per project context
      kycLevel: 2, // Admin level/Fully verified
      kycStatus: 'APPROVED',
      phone: '+352691234567', // Placeholder phone
      phoneVerified: true,
      wallet: {
        create: {
          balanceEUR: 10000.00, // Initial balance for testing
          balanceUSD: 5000.00,
          primaryCurrency: 'EUR'
        }
      }
    },
  });

  console.log({ user });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
