
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env.local') });
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'clemergorges@hotmail.com';
    const password = 'GlobalSecure2026!'; // User provided password
    
    console.log(`Updating password for ${email} to ${password}...`);
    
    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: { 
            passwordHash: hash,
            emailVerified: true 
        },
        create: {
            email,
            firstName: 'Clemer',
            lastName: 'Gorges',
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
