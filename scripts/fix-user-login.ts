
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const targetPassword = process.env.RESET_PASSWORD;
  if (!targetPassword) {
    throw new Error('RESET_PASSWORD env var required');
  }

  console.log(`Checking user: ${email}...`);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  const passwordHash = await bcrypt.hash(targetPassword, 10);

  if (user) {
    console.log(`User found (ID: ${user.id}). Updating password...`);
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordHash,
        emailVerified: true // Garantir que está verificado
      },
    });
    console.log('Password updated.');
  } else {
    console.log('User not found. Creating user...');
    await prisma.user.create({
      data: {
        email,
        firstName: 'Admin',
        lastName: 'User',
        passwordHash,
        emailVerified: true,
        phoneVerified: true,
        phone: '+554799999999', // Placeholder
        country: 'BR', account: {
            create: {
                primaryCurrency: 'BRL',
                balances: {
                    create: { currency: 'BRL', amount: 1000 }
                }
            }
        }
      },
    });
    console.log('User created.');
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
