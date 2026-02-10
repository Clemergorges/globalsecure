
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'clemergorges@hotmail.com';
  // Senha definida conforme solicitação/print
  const targetPassword = 'GlobalSecure2026!';

  console.log(`Checking user: ${email}...`);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  const passwordHash = await bcrypt.hash(targetPassword, 12);

  if (user) {
    console.log(`User found (ID: ${user.id}). Updating password...`);
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordHash,
        emailVerified: true // Garantir que está verificado
      },
    });
    console.log(`Password updated to: ${targetPassword}`);
  } else {
    console.log('User not found. Creating user...');
    await prisma.user.create({
      data: {
        email,
        firstName: 'Clemer',
        lastName: 'Gorges',
        passwordHash,
        emailVerified: true,
        phoneVerified: true,
        phone: '+554799999999', // Placeholder
        country: 'BR',
        wallet: {
            create: {
                primaryCurrency: 'BRL',
                balances: {
                    create: { currency: 'BRL', amount: 1000 }
                }
            }
        }
      },
    });
    console.log(`User created with password: ${targetPassword}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
