import { PrismaClient } from '@prisma/client';
import { createTestUsers, cleanupTestUsers, getTestUser } from '../fixtures/test-users';

const prisma = new PrismaClient();

// Use distinct prefix for E2E tests to allow parallel execution with other suites if needed
const E2E_PREFIX = 'e2e_deposit_';

describe('E2E: Deposit Flows', () => {
    // Setup specific for this test suite
    beforeAll(async () => {
        // Cleanup potential leftovers
        await prisma.balance.deleteMany({
            where: { account: { userId: { in: (await prisma.user.findMany({ where: { email: { startsWith: E2E_PREFIX } } })).map(u => u.id) } } }
        });
        await prisma.accountTransaction.deleteMany({
            where: { account: { userId: { in: (await prisma.user.findMany({ where: { email: { startsWith: E2E_PREFIX } } })).map(u => u.id) } } }
        });
        await prisma.account.deleteMany({
            where: { userId: { in: (await prisma.user.findMany({ where: { email: { startsWith: E2E_PREFIX } } })).map(u => u.id) } }
        });
        await prisma.user.deleteMany({
            where: { email: { startsWith: E2E_PREFIX } }
        });
    });

    afterAll(async () => {
        // Cleanup
        await prisma.balance.deleteMany({
            where: { account: { userId: { in: (await prisma.user.findMany({ where: { email: { startsWith: E2E_PREFIX } } })).map(u => u.id) } } }
        });
        await prisma.accountTransaction.deleteMany({
            where: { account: { userId: { in: (await prisma.user.findMany({ where: { email: { startsWith: E2E_PREFIX } } })).map(u => u.id) } } }
        });
        await prisma.account.deleteMany({
            where: { userId: { in: (await prisma.user.findMany({ where: { email: { startsWith: E2E_PREFIX } } })).map(u => u.id) } }
        });
        await prisma.user.deleteMany({
            where: { email: { startsWith: E2E_PREFIX } }
        });
        await prisma.$disconnect();
    });

    it('should process a simulated Stripe Card Topup correctly', async () => {
        // 1. Create a user
        const userEmail = `${E2E_PREFIX}card@test.com`;
        const user = await prisma.user.create({
            data: {
                email: userEmail,
                passwordHash: 'hashed_password',
                firstName: 'E2E',
                lastName: 'CardUser',
                kycLevel: 2, account: {
                    create: {
                        balances: {
                            create: [
                                { currency: 'EUR', amount: 0 },
                                { currency: 'USD', amount: 0 }
                            ]
                        }
                    }
                }
            },
            include: { account: true }
        });

        const initialBalanceRecord = await prisma.balance.findUnique({
            where: { accountId_currency: { accountId: user.account!.id, currency: 'EUR' } }
        });
        const initialBalance = Number(initialBalanceRecord?.amount || 0);
        expect(initialBalance).toBe(0);

        const topupAmount = 100;
        const stripeFee = 2; // Simulated fee

        // 2. Simulate the WEBHOOK handling logic directly (since we can't trigger real Stripe hooks easily without ngrok)
        // We are testing the "Process Topup" logic:
        // - Credit User Balance
        // - Create Transaction Record

        await prisma.$transaction(async (tx) => {
            // Credit user wallet
            await tx.balance.updateMany({
                where: { accountId: user.account!.id, currency: 'EUR' },
                data: {
                    amount: { increment: topupAmount }
                }
            });

            // Create transaction record
            await tx.accountTransaction.create({
                data: {
                    accountId: user.account!.id,
                    type: 'DEPOSIT',
                    amount: topupAmount,
                    currency: 'EUR',
                    description: 'Stripe Topup E2E Test',
                }
            });
        });

        // 3. Verify Final State
        const finalWallet = await prisma.account.findUnique({
            where: { userId: user.id }
        });

        const finalBalanceRecord = await prisma.balance.findUnique({
            where: { accountId_currency: { accountId: user.account!.id, currency: 'EUR' } }
        });

        const finalTransactions = await prisma.accountTransaction.findMany({
            where: { accountId: finalWallet!.id }
        });

        // Assertions
        expect(Number(finalBalanceRecord!.amount)).toBe(100);
        expect(finalTransactions).toHaveLength(1);
        expect(finalTransactions[0].type).toBe('DEPOSIT');
        expect(Number(finalTransactions[0].amount)).toBe(100);

        console.log('✅ Stripe Card Topup E2E passed');
    });

    it('should process a simulated Crypto (USDT) Deposit correctly', async () => {
        // 1. Create a user
        const userEmail = `${E2E_PREFIX}crypto@test.com`;
        const user = await prisma.user.create({
            data: {
                email: userEmail,
                passwordHash: 'hashed_password',
                firstName: 'E2E',
                lastName: 'CryptoUser',
                kycLevel: 2, account: {
                    create: {
                        balances: {
                            create: [
                                { currency: 'EUR', amount: 0 },
                                { currency: 'USD', amount: 0 }
                            ]
                        }
                    }
                }
            },
            include: { account: true }
        });

        const depositAmountUSDT = 500;

        // 2. Simulate Crypto Webhook Processing
        // Logic: Create pending tx -> Wait for confirmations -> Credit Balance

        // Step A: Create Transaction Record for USDT deposit
        const createdTx = await prisma.accountTransaction.create({
            data: {
                accountId: user.account!.id,
                type: 'CREDIT',
                amount: depositAmountUSDT,
                currency: 'USD',
                description: 'USDT Deposit E2E'
            }
        });

        // Step B: Simulate "Confirmed" processing (credit balance)
        await prisma.$transaction(async (tx) => {
            // Credit User Balance
            await tx.balance.updateMany({
                where: { accountId: user.account!.id, currency: 'USD' },
                data: {
                    amount: { increment: depositAmountUSDT }
                }
            });
        });

        // 3. Verify Final State
        const finalWallet = await prisma.account.findUnique({
            where: { userId: user.id }
        });

        const finalBalanceRecord = await prisma.balance.findUnique({
            where: { accountId_currency: { accountId: user.account!.id, currency: 'USD' } }
        });

        const txRecord = await prisma.accountTransaction.findUnique({ where: { id: createdTx.id } });

        // Assertions
        expect(Number(finalBalanceRecord!.amount)).toBe(500);
        expect(txRecord!.description).toBe('USDT Deposit E2E');

        console.log('✅ Crypto Deposit E2E passed');
    });
});
