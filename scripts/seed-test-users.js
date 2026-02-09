const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning local database...');

    // Explicitly quoted table names to match Prisma's case-sensitive creation
    const tables = [
        '"Transfer"',
        '"WalletTransaction"',
        '"Wallet"',
        '"Session"',
        '"KYCVerification"',
        '"User"'
    ];

    for (const table of tables) {
        try {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} CASCADE;`);
            console.log(`✅ Truncated ${table}`);
        } catch (e) {
            console.log(`⚠️ Skip truncate ${table} (might not exist): ${e.message}`);
        }
    }

    console.log('🌱 Seeding test users...');

    const users = [
        {
            email: 'test-kyc0@globalsecure.test',
            passwordHash: '$2a$10$test.hash.kyc0',
            firstName: 'Test',
            lastName: 'KYC0',
            kycLevel: 0,
            kycStatus: 'PENDING',
        },
        {
            email: 'test-kyc1@globalsecure.test',
            passwordHash: '$2a$10$test.hash.kyc1',
            firstName: 'Test',
            lastName: 'KYC1',
            kycLevel: 1,
            kycStatus: 'APPROVED',
        },
        {
            email: 'test-kyc2@globalsecure.test',
            passwordHash: '$2a$10$test.hash.kyc2',
            firstName: 'Test',
            lastName: 'KYC2',
            kycLevel: 2,
            kycStatus: 'APPROVED',
        },
    ];

    for (const userData of users) {
        const user = await prisma.user.create({ data: userData });

        await prisma.wallet.create({
            data: {
                userId: user.id,
                balanceEUR: 1000,
                balanceUSD: 0,
                balanceGBP: 0,
                primaryCurrency: 'EUR',
            },
        });

        console.log(`✅ User ${userData.email} and wallet created.`);
    }

    console.log('✨ Environment Ready!');
}

main()
    .catch((e) => {
        console.error('❌ Script failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
