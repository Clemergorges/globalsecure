
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env.local') });
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = process.env.DEMO_PASSWORD || 'CHANGE_ME';
    const hash = await bcrypt.hash(password, 10);

    const users = [
        {
            email: process.env.DEMO_RECEIVER_EMAIL || 'receiver@example.com',
            firstName: 'Demo',
            lastName: 'Receiver'
        },
        {
            email: process.env.DEMO_SENDER_EMAIL || process.env.ADMIN_EMAIL || 'admin@example.com',
            firstName: 'Demo',
            lastName: 'Sender'
        }
    ];

    for (const u of users) {
        console.log(`Setting up ${u.email}...`);
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: { passwordHash: hash, emailVerified: true },
            create: {
                email: u.email,
                firstName: u.firstName,
                lastName: u.lastName,
                passwordHash: hash,
                emailVerified: true,
                country: 'BR', account: {
                    create: {
                        primaryCurrency: 'BRL',
                        balances: {
                            createMany: {
                                data: [
                                    { currency: 'BRL', amount: 1000 },
                                    { currency: 'EUR', amount: 1000 },
                                    { currency: 'USD', amount: 1000 }
                                ]
                            }
                        }
                    }
                }
            },
            include: { account: true }
        });
        
        // Ensure wallet exists (if user existed but had no wallet)
        if (!user.account) {
            console.log('Creating wallet for existing user...');
            await prisma.account.create({
                data: {
                    userId: user.id,
                    primaryCurrency: 'BRL',
                    balances: {
                        createMany: {
                            data: [
                                { currency: 'BRL', amount: 1000 },
                                { currency: 'EUR', amount: 1000 },
                                { currency: 'USD', amount: 1000 }
                            ]
                        }
                    }
                }
            });
        }
    }
    console.log('Users setup complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
