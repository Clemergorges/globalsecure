const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkUser() {
  const email = 'clemergorges@hotmail.com';
  console.log(`Checking user: ${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log('❌ User NOT found in database.');
    
    // Create the admin user if missing
    console.log('Creating admin user...');
    const passwordHash = await bcrypt.hash('GlobalSecure2026!', 12);
    
    const newUser = await prisma.user.create({
      data: {
        email,
        firstName: 'Admin',
        lastName: 'User',
        passwordHash,
        emailVerified: true,
        phone: '+0000000000',
        phoneVerified: true,
        country: 'US',
        kycLevel: 2,
        wallet: {
          create: {
            primaryCurrency: 'USD',
            balances: {
              create: { currency: 'USD', amount: 100000 }
            }
          }
        }
      }
    });
    console.log('✅ Admin user created successfully.');
  } else {
    console.log('✅ User FOUND.');
    console.log('ID:', user.id);
    console.log('Email Verified:', user.emailVerified);
    console.log('Password Hash:', user.passwordHash.substring(0, 20) + '...');
    
    // Reset password to be sure
    console.log('Resetting password to: GlobalSecure2026!');
    const newHash = await bcrypt.hash('GlobalSecure2026!', 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    });
    console.log('✅ Password reset successfully.');
  }
}

checkUser()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
