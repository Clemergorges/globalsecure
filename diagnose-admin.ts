
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function diagnose() {
  const email = 'clemergorges@hotmail.com';
  const passwordToCheck = 'admin123';

  console.log(`🔍 Diagnosing user: ${email}`);
  console.log(`Checking against password: ${passwordToCheck}`);

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.error('❌ ERROR: User NOT found in the database connected to this environment.');
      console.log('Database URL used:', process.env.DATABASE_URL?.split('@')[1]); // Log host only for safety
      return;
    }

    console.log('✅ User FOUND.');
    console.log('Stored Hash:', user.passwordHash.substring(0, 10) + '...');

    const isValid = await bcrypt.compare(passwordToCheck, user.passwordHash);

    if (isValid) {
      console.log('✅ SUCCESS: Password "admin123" matches the stored hash.');
      console.log('The database currently connected has the correct credentials.');
    } else {
      console.error('❌ FAILURE: Password "admin123" DOES NOT match the stored hash.');
      console.log('Re-running reset...');
      
      const newHash = await bcrypt.hash(passwordToCheck, 10);
      await prisma.user.update({
        where: { email },
        data: { passwordHash: newHash }
      });
      console.log('✅ Password FORCE RESET to "admin123". Try logging in now.');
    }

  } catch (error) {
    console.error('Diagnostic Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
