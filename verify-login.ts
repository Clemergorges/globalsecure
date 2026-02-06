
import { PrismaClient } from '@prisma/client';
import { comparePassword } from './lib/auth';

const prisma = new PrismaClient();

async function verifyLogin() {
  const email = 'clemergorges@hotmail.com';
  const password = 'admin123';

  console.log(`Verifying login for ${email} with password '${password}'...`);

  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log('❌ User not found in DB');
    return;
  }

  console.log('User found. Hash:', user.passwordHash.substring(0, 10) + '...');

  const isValid = await comparePassword(password, user.passwordHash);
  
  if (isValid) {
    console.log('✅ Login SUCCESS! Password matches hash.');
  } else {
    console.log('❌ Login FAILED! Password does not match hash.');
  }
}

verifyLogin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
