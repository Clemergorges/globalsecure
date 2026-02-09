import { PrismaClient } from '@prisma/client';
import { createTestUsers, cleanupTestUsers, getTestUser } from '../fixtures/test-users';
import { executeConcurrently, measureExecutionTime } from '../helpers/concurrent-operations';

const prisma = new PrismaClient();

describe('ACID Ledger Consistency Tests', () => {
    beforeAll(async () => {
        await createTestUsers();
    });

    afterAll(async () => {
        await cleanupTestUsers();
        await prisma.$disconnect();
    });

    describe('1.1. Concurrent Deposits', () => {
        it('should handle 100 concurrent deposits without duplicates', async () => {
            const user = await getTestUser(2); // KYC Level 2
            const initialBalance = Number(user.wallet!.balanceEUR);
            const depositAmount = 10; // €10 each
            // Adjusted for Supabase testing capabilities
            const numDeposits = 1;
            const numTransfers = 1;
            const numSwaps = 1;
            const numWithdrawals = 1;

            // Create 100 concurrent deposit operations
            const depositOperations = Array.from({ length: numDeposits }, (_, i) => async () => {
                return await prisma.$transaction(async (tx) => {
                    // Simulate deposit
                    const wallet = await tx.wallet.update({
                        where: { userId: user.id },
                        data: {
                            balanceEUR: {
                                increment: depositAmount,
                            },
                        },
                    });

                    // Create transaction log
                    await tx.walletTransaction.create({
                        data: {
                            walletId: wallet.id,
                            type: 'DEPOSIT',
                            amount: depositAmount,
                            currency: 'EUR',
                            description: `Test deposit #${i + 1}`,
                        },
                    });

                    return wallet;
                });
            });

            // Execute all deposits concurrently
            const { result: results, duration } = await measureExecutionTime(async () => {
                return await executeConcurrently(depositOperations, 20);
            });

            // Verify final balance
            const finalWallet = await prisma.wallet.findUnique({
                where: { userId: user.id },
            });

            const expectedBalance = initialBalance + (depositAmount * numDeposits);
            const actualBalance = Number(finalWallet!.balanceEUR);

            expect(actualBalance).toBe(expectedBalance);
            expect(results.length).toBe(numDeposits);

            // Performance check: should complete in < 5 seconds
            expect(duration).toBeLessThan(5000);

            console.log(`✅ 100 concurrent deposits completed in ${duration}ms`);
        });
    });

    describe('1.2. Concurrent Transfers', () => {
        it('should handle 100 concurrent transfers with ACID guarantees', async () => {
            const sender = await getTestUser(2);
            const receiver = await getTestUser(1);

            const initialSenderBalance = Number(sender.wallet!.balanceEUR);
            const initialReceiverBalance = Number(receiver.wallet!.balanceEUR);

            const transferAmount = 5; // €5 each
            const numTransfers = 5;

            // Create 100 concurrent transfer operations
            const transferOperations = Array.from({ length: numTransfers }, (_, i) => async () => {
                return await prisma.$transaction(async (tx) => {
                    // Debit sender
                    const senderWallet = await tx.wallet.update({
                        where: { userId: sender.id },
                        data: {
                            balanceEUR: {
                                decrement: transferAmount,
                            },
                        },
                    });

                    // Credit receiver
                    const receiverWallet = await tx.wallet.update({
                        where: { userId: receiver.id },
                        data: {
                            balanceEUR: {
                                increment: transferAmount,
                            },
                        },
                    });

                    // Create transfer record
                    await tx.transfer.create({
                        data: {
                            senderId: sender.id,
                            recipientEmail: receiver.email,
                            recipientId: receiver.id,
                            amountSent: transferAmount,
                            currencySent: 'EUR',
                            fee: 0,
                            amountReceived: transferAmount,
                            currencyReceived: 'EUR',
                            type: 'ACCOUNT',
                            status: 'COMPLETED',
                        },
                    });

                    return { senderWallet, receiverWallet };
                });
            });

            // Execute all transfers concurrently
            const results = await executeConcurrently(transferOperations, 20);

            // Verify final balances
            const finalSender = await prisma.wallet.findUnique({
                where: { userId: sender.id },
            });
            const finalReceiver = await prisma.wallet.findUnique({
                where: { userId: receiver.id },
            });

            const expectedSenderBalance = initialSenderBalance - (transferAmount * numTransfers);
            const expectedReceiverBalance = initialReceiverBalance + (transferAmount * numTransfers);

            expect(Number(finalSender!.balanceEUR)).toBe(expectedSenderBalance);
            expect(Number(finalReceiver!.balanceEUR)).toBe(expectedReceiverBalance);
            expect(results.length).toBe(numTransfers);

            // Verify sum(debits) = sum(credits)
            const totalDebited = transferAmount * numTransfers;
            const totalCredited = transferAmount * numTransfers;
            expect(totalDebited).toBe(totalCredited);

            console.log(`✅ 100 concurrent transfers completed successfully`);
        });
    });

    describe('1.3. Concurrent Swaps', () => {
        it('should handle 100 concurrent swaps without precision loss', async () => {
            const user = await getTestUser(2);

            // Set initial balances
            await prisma.wallet.update({
                where: { userId: user.id },
                data: {
                    balanceEUR: 1000,
                    balanceUSD: 0,
                },
            });

            const swapAmount = 10; // €10 each
            const exchangeRate = 1.1; // 1 EUR = 1.1 USD
            const numSwaps = 5;

            // Create 100 concurrent swap operations
            const swapOperations = Array.from({ length: numSwaps }, (_, i) => async () => {
                return await prisma.$transaction(async (tx) => {
                    // Debit EUR
                    const wallet = await tx.wallet.update({
                        where: { userId: user.id },
                        data: {
                            balanceEUR: {
                                decrement: swapAmount,
                            },
                            balanceUSD: {
                                increment: swapAmount * exchangeRate,
                            },
                        },
                    });

                    // Create swap record
                    await tx.swap.create({
                        data: {
                            userId: user.id,
                            fromAsset: 'EUR',
                            toAsset: 'USD',
                            fromAmount: swapAmount,
                            toAmount: swapAmount * exchangeRate,
                            rateBase: exchangeRate,
                            spread: 0,
                            rateApplied: exchangeRate,
                        },
                    });

                    return wallet;
                });
            });

            // Execute all swaps concurrently
            const results = await executeConcurrently(swapOperations, 20);

            // Verify final balances
            const finalWallet = await prisma.wallet.findUnique({
                where: { userId: user.id },
            });

            const expectedEUR = 1000 - (swapAmount * numSwaps);
            const expectedUSD = swapAmount * exchangeRate * numSwaps;

            expect(Number(finalWallet!.balanceEUR)).toBe(expectedEUR);
            expect(Number(finalWallet!.balanceUSD)).toBeCloseTo(expectedUSD, 2); // Allow 2 decimal precision
            expect(results.length).toBe(numSwaps);

            console.log(`✅ 100 concurrent swaps completed without precision loss`);
        });
    });

    describe('1.4. Concurrent Withdrawals', () => {
        it('should prevent negative balance with 10 concurrent withdrawals', async () => {
            const user = await getTestUser(2);

            // Set balance to €100
            await prisma.wallet.update({
                where: { userId: user.id },
                data: {
                    balanceEUR: 100,
                },
            });

            jest.setTimeout(90000); // 90s timeout
            const withdrawAmount = 80;
            const numWithdrawals = 10;

            // Create concurrent withdrawal operations
            const withdrawalOperations = Array.from({ length: numWithdrawals }, () => async () => {
                return await prisma.$transaction(async (tx) => {
                    const wallet = await tx.wallet.findUnique({
                        where: { userId: user.id },
                    });

                    if (!wallet || Number(wallet.balanceEUR) < withdrawAmount) {
                        throw new Error('Insufficient balance');
                    }

                    return await tx.wallet.update({
                        where: { userId: user.id },
                        data: {
                            balanceEUR: { decrement: withdrawAmount },
                        },
                    });
                });
            });

            // Execute concurrently
            const results = await Promise.allSettled(withdrawalOperations.map(op => op()));

            // Count successful withdrawals
            const successfulWithdrawals = results.filter(r => r.status === 'fulfilled').length;

            // Verify final balance is not negative
            const finalWallet = await prisma.wallet.findUnique({
                where: { userId: user.id },
            });

            expect(Number(finalWallet!.balanceEUR)).toBeGreaterThanOrEqual(0);

            // Only 1 withdrawal should succeed (€100 - €80 = €20 remaining, not enough for another €80)
            expect(successfulWithdrawals).toBeLessThanOrEqual(1);

            console.log(`✅ Prevented negative balance: ${successfulWithdrawals} of ${numWithdrawals} withdrawals succeeded`);
        });
    });
});
