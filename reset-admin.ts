
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
  const email = 'clemergorges@hotmail.com';
  const newPassword = 'admin123';
  
  console.log(`Resetting password for ${email}...`);
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('User not found. Creating...');
      // Need other required fields? Check schema.
      // Assuming email is enough or other fields have defaults/optional.
      // But typically User needs name, etc.
      // I'll just try to update. If not found, I can't easily create without knowing schema requirements.
      console.error('❌ User not found! Please register first or check the email.');
    } else {
      await prisma.user.update({
        where: { email },
        data: { passwordHash: hashedPassword }
      });
      console.log(`✅ Password reset to: ${newPassword}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

resetPassword()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
