import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create test users with different KYC levels
 */
export async function createTestUsers() {
    // Nuke all data for a clean slate
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "User", "Wallet", "WalletTransaction", "Transfer", "Beneficiary", "KYCVerification", "Session" CASCADE;`);

    const users = [
        {
            email: 'test-kyc0@globalsecure.test',
            passwordHash: '$2a$10$test.hash.kyc0',
            firstName: 'Test',
            lastName: 'KYC0',
            kycLevel: 0,
            kycStatus: 'PENDING' as const,
        },
        {
            email: 'test-kyc1@globalsecure.test',
            passwordHash: '$2a$10$test.hash.kyc1',
            firstName: 'Test',
            lastName: 'KYC1',
            kycLevel: 1,
            kycStatus: 'APPROVED' as const,
        },
        {
            email: 'test-kyc2@globalsecure.test',
            passwordHash: '$2a$10$test.hash.kyc2',
            firstName: 'Test',
            lastName: 'KYC2',
            kycLevel: 2,
            kycStatus: 'APPROVED' as const,
        },
    ];

    const createdUsers = [];

    for (const userData of users) {
        const user = await prisma.user.create({ data: userData });

        // Create wallet
        const wallet = await prisma.wallet.create({
            data: {
                userId: user.id,
                balanceEUR: 1000,
                balanceUSD: 0,
                balanceGBP: 0,
                primaryCurrency: 'EUR',
            },
        });

        createdUsers.push({ user, wallet });
    }

    return createdUsers;
}

/**
 * Clean up test users
 */
export async function cleanupTestUsers() {
    await prisma.user.deleteMany({
        where: {
            email: {
                endsWith: '@globalsecure.test',
            },
        },
    });
}

/**
 * Get test user by KYC level
 */
export async function getTestUser(kycLevel: number) {
    const user = await prisma.user.findFirst({
        where: {
            email: `test-kyc${kycLevel}@globalsecure.test`,
        },
        include: {
            wallet: true,
        },
    });

    if (!user) {
        throw new Error(`Test user with KYC level ${kycLevel} not found`);
    }

    return user;
}
