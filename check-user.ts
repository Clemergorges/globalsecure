
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  try {
    console.log('Connecting to DB...');
    const email = 'clemergorges@hotmail.com';
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      console.log('✅ User found:', user.email);
      console.log('User ID:', user.id);
      console.log('Password Hash exists:', !!user.passwordHash);
    } else {
      console.log('❌ User NOT found:', email);
    }

  } catch (error) {
    console.error('❌ DB Connection Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
