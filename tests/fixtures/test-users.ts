import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SUITE_TAG = `suite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Create test users with different KYC levels
 */
export async function createTestUsers() {
    // Only clean up users from this specific suite run if they exist (unlikely for new tag)
    // But do NOT delete everything globally as it kills parallel workers
    
    const ts = Date.now();
    const users = [
        {
            email: `${SUITE_TAG}-test-${ts}-kyc0@globalsecure.test`,
            passwordHash: '$2a$10$test.hash.kyc0',
            firstName: 'Test',
            lastName: 'KYC0',
            kycLevel: 0,
            kycStatus: 'PENDING' as const,
        },
        {
            email: `${SUITE_TAG}-test-${ts}-kyc1@globalsecure.test`,
            passwordHash: '$2a$10$test.hash.kyc1',
            firstName: 'Test',
            lastName: 'KYC1',
            kycLevel: 1,
            kycStatus: 'APPROVED' as const,
        },
        {
            email: `${SUITE_TAG}-test-${ts}-kyc2@globalsecure.test`,
            passwordHash: '$2a$10$test.hash.kyc2',
            firstName: 'Test',
            lastName: 'KYC2',
            kycLevel: 2,
            kycStatus: 'APPROVED' as const,
        },
    ];

    const createdUsers = [];

    // Create users serially to avoid race conditions within the same worker
    for (const userData of users) {
        // Wrap in try-catch to handle potential duplicate key errors if retry happens
        try {
            const user = await prisma.user.create({ data: userData });

            // Create wallet
            const account = await prisma.account.create({
                data: {
                    userId: user.id,
                    primaryCurrency: 'EUR',
                    balances: {
                        create: [
                            { currency: 'EUR', amount: 1000 },
                            { currency: 'USD', amount: 0 },
                            { currency: 'GBP', amount: 0 }
                        ]
                    }
                },
            });

            createdUsers.push({ user, account });
        } catch (error) {
            console.error(`Failed to create user ${userData.email}:`, error);
            throw error;
        }
    }

    return createdUsers;
}

/**
 * Clean up test users
 */
export async function cleanupTestUsers() {
    const users = await prisma.user.findMany({
        where: { email: { startsWith: SUITE_TAG } },
        select: { id: true, email: true }
    });
    const ids = users.map(u => u.id);

    if (ids.length === 0) {
        return;
    }

    try {
        await prisma.accountTransaction.deleteMany({
            where: { account: { userId: { in: ids } } }
        });
        // Cleanup balances first (if cascade not set)
        await prisma.balance.deleteMany({
            where: { account: { userId: { in: ids } } }
        });
        await prisma.transactionLog.deleteMany({
            where: {
                transfer: {
                    OR: [
                        { senderId: { in: ids } },
                        { recipientId: { in: ids } },
                        { recipientEmail: { endsWith: '@globalsecure.test' } }
                    ]
                }
            }
        });
        await prisma.spendTransaction.deleteMany({
            where: { card: { userId: { in: ids } } }
        });
        await prisma.cardActivationToken.deleteMany({
            where: { card: { userId: { in: ids } } }
        });
        await prisma.virtualCard.deleteMany({
            where: {
                OR: [
                    { userId: { in: ids } },
                    { transfer: { senderId: { in: ids } } },
                    { transfer: { recipientId: { in: ids } } }
                ]
            }
        });
        await prisma.transfer.deleteMany({
            where: {
                OR: [
                    { senderId: { in: ids } },
                    { recipientId: { in: ids } },
                    { recipientEmail: { endsWith: '@globalsecure.test' } }
                ]
            }
        });
        await prisma.cryptoDeposit.deleteMany({
            where: { userId: { in: ids } }
        });
        await prisma.topUp.deleteMany({
            where: { userId: { in: ids } }
        });
        await prisma.cryptoWithdraw.deleteMany({
            where: { userId: { in: ids } }
        });
        await prisma.swap.deleteMany({
            where: { userId: { in: ids } }
        });
        await prisma.kYCDocument.deleteMany({
            where: { userId: { in: ids } }
        });
        await prisma.session.deleteMany({
            where: { userId: { in: ids } }
        });
        await prisma.oTP.deleteMany({
            where: { userId: { in: ids } }
        });
        await prisma.notification.deleteMany({
            where: { userId: { in: ids } }
        });
        await prisma.account.deleteMany({
            where: { userId: { in: ids } }
        });
        await prisma.user.deleteMany({
            where: { id: { in: ids } }
        });
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

/**
 * Disconnect Prisma Client
 */
export async function disconnectPrisma() {
    await prisma.$disconnect();
}


/**
 * Get test user by KYC level
 */
export async function getTestUser(kycLevel: number) {
    // Force explicit include to ensure wallet is returned
    const user = await prisma.user.findFirst({
        where: { kycLevel, email: { startsWith: SUITE_TAG } },
        include: { account: { include: { balances: true } } },
        orderBy: { createdAt: 'desc' }
    });

    if (!user) {
        throw new Error(`Test user with KYC level ${kycLevel} not found in suite ${SUITE_TAG}`);
    }

    if (!user.account) {
        // Fallback: try to find wallet if relation didn't load properly (though include should work)
        const account = await prisma.account.findUnique({ where: { userId: user.id }, include: { balances: true } });
        if (!account) {
             throw new Error(`Wallet not found for user ${user.email} (ID: ${user.id})`);
        }
        return { ...user, account };
    }

    return user;
}
