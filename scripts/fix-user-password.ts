
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env.local') });
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.RESET_PASSWORD;
    if (!password) {
        throw new Error('RESET_PASSWORD env var required');
    }
    
    console.log(`Updating password for ${email}...`);
    
    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: { 
            passwordHash: hash,
            emailVerified: true 
        },
        create: {
            email,
            firstName: 'Admin',
            lastName: 'User',
            passwordHash: hash,
            emailVerified: true,
            country: 'BR',
            kycLevel: 2,
            kycStatus: 'APPROVED'
        }
    });

    console.log('✅ User updated successfully:', user.email);
    console.log('New password hash set.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
