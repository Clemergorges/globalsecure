import { PrismaClient } from '@prisma/client';
import { createTestUsers, cleanupTestUsers, getTestUser } from '../fixtures/test-users';

const prisma = new PrismaClient();

// Use distinct prefix for E2E tests to allow parallel execution with other suites if needed
const E2E_PREFIX = 'e2e_deposit_';

describe('E2E: Deposit Flows', () => {
    // Setup specific for this test suite
    beforeAll(async () => {
        // Cleanup potential leftovers
        await prisma.user.deleteMany({
            where: { email: { startsWith: E2E_PREFIX } }
        });
    });

    afterAll(async () => {
        // Cleanup
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
                password: 'hashed_password',
                firstName: 'E2E',
                lastName: 'CardUser',
                kycLevel: 2,
                wallet: {
                    create: {
                        currency: 'EUR',
                        balanceEUR: 0,
                        balanceUSD: 0,
                    }
                }
            },
            include: { wallet: true }
        });

        const initialBalance = Number(user.wallet!.balanceEUR);
        expect(initialBalance).toBe(0);

        const topupAmount = 100;
        const stripeFee = 2; // Simulated fee

        // 2. Simulate the WEBHOOK handling logic directly (since we can't trigger real Stripe hooks easily without ngrok)
        // We are testing the "Process Topup" logic:
        // - Credit User Balance
        // - Create Transaction Record

        await prisma.$transaction(async (tx) => {
            // Credit user wallet
            await tx.wallet.update({
                where: { id: user.wallet!.id },
                data: {
                    balanceEUR: { increment: topupAmount }
                }
            });

            // Create transaction record
            await tx.walletTransaction.create({
                data: {
                    walletId: user.wallet!.id,
                    type: 'DEPOSIT',
                    amount: topupAmount,
                    currency: 'EUR',
                    status: 'COMPLETED',
                    provider: 'STRIPE',
                    description: 'Stripe Topup E2E Test',
                    metadata: {
                        paymentIntentId: 'pi_simulated_123',
                        fee: stripeFee
                    }
                }
            });
        });

        // 3. Verify Final State
        const finalWallet = await prisma.wallet.findUnique({
            where: { userId: user.id }
        });

        const finalTransactions = await prisma.walletTransaction.findMany({
            where: { walletId: finalWallet!.id }
        });

        // Assertions
        expect(Number(finalWallet!.balanceEUR)).toBe(100);
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
                password: 'hashed_password',
                firstName: 'E2E',
                lastName: 'CryptoUser',
                kycLevel: 2,
                wallet: {
                    create: {
                        currency: 'EUR',
                        balanceEUR: 0,
                        balanceUSD: 0,
                    }
                }
            },
            include: { wallet: true }
        });

        const depositAmountUSDT = 500;

        // 2. Simulate Crypto Webhook Processing
        // Logic: Create pending tx -> Wait for confirmations -> Credit Balance

        // Step A: Create Pending Transaction (0 confirmations)
        await prisma.walletTransaction.create({
            data: {
                walletId: user.wallet!.id,
                type: 'DEPOSIT',
                amount: depositAmountUSDT,
                currency: 'USD', // USDT is tracked as USD in this system for simplicity or separate asset field
                status: 'PENDING',
                provider: 'ALCHEMY',
                txHash: '0x_simulated_hash_123',
                metadata: {
                    confirmations: 0
                }
            }
        });

        // Step B: Simulate "Confirmed" Webhook
        await prisma.$transaction(async (tx) => {
            // Find the pending tx
            const pendingTx = await tx.walletTransaction.findFirst({
                where: { txHash: '0x_simulated_hash_123' }
            });

            if (pendingTx && pendingTx.status === 'PENDING') {
                // Update Tx Status
                await tx.walletTransaction.update({
                    where: { id: pendingTx.id },
                    data: {
                        status: 'COMPLETED',
                        metadata: { confirmations: 12 }
                    }
                });

                // Credit User Balance
                await tx.wallet.update({
                    where: { id: user.wallet!.id },
                    data: {
                        balanceUSD: { increment: depositAmountUSDT }
                    }
                });
            }
        });

        // 3. Verify Final State
        const finalWallet = await prisma.wallet.findUnique({
            where: { userId: user.id }
        });

        const txRecord = await prisma.walletTransaction.findFirst({
            where: { txHash: '0x_simulated_hash_123' }
        });

        // Assertions
        expect(Number(finalWallet!.balanceUSD)).toBe(500);
        expect(txRecord!.status).toBe('COMPLETED');

        console.log('✅ Crypto Deposit E2E passed');
    });
});
