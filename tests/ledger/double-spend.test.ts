import { PrismaClient } from '@prisma/client';
import { createTestUsers, cleanupTestUsers, getTestUser } from '../fixtures/test-users';
import { executeWithRaceCondition } from '../helpers/concurrent-operations';

const prisma = new PrismaClient();

describe('Double Spend Prevention Tests', () => {
    beforeAll(async () => {
        await createTestUsers();
    });

    afterAll(async () => {
        await cleanupTestUsers();
        await prisma.$disconnect();
    });

    describe('2.1. Concurrent Transfers with Insufficient Balance', () => {
        it('should allow only ONE of two simultaneous transfers when balance is insufficient', async () => {
            const sender = await getTestUser(2);
            const receiver1 = await getTestUser(1);
            const receiver2 = await getTestUser(0);

            // Set sender balance to €100
            await prisma.balance.update({
                where: { accountId_currency: { accountId: sender.account!.id, currency: 'EUR' } },
                data: { amount: 100 },
            });

            const transferAmount = 80; // Try to send €80 twice

            // Create two concurrent transfer operations
            const transfer1 = async () => {
                return await prisma.$transaction(async (tx) => {
                    const ids = [sender.id, receiver1.id].sort();
                    if (ids[0] === sender.id) {
                        const debitResult = await tx.balance.updateMany({
                            where: { 
                                accountId: sender.account!.id, 
                                currency: 'EUR',
                                amount: { gte: transferAmount } 
                            },
                            data: { amount: { decrement: transferAmount } },
                        });
                        if (debitResult.count !== 1) {
                            throw new Error('Insufficient balance');
                        }
                        await tx.balance.upsert({
                            where: { accountId_currency: { accountId: receiver1.account!.id, currency: 'EUR' } },
                            update: { amount: { increment: transferAmount } },
                            create: { accountId: receiver1.account!.id, currency: 'EUR', amount: transferAmount }
                        });
                    } else {
                        // Canonical ordering: Lock receiver first (since receiver.id < sender.id)
                        await tx.balance.upsert({
                            where: { accountId_currency: { accountId: receiver1.account!.id, currency: 'EUR' } },
                            update: { amount: { increment: transferAmount } },
                            create: { accountId: receiver1.account!.id, currency: 'EUR', amount: transferAmount }
                        });
                        
                        // Then lock sender
                        const debitResult = await tx.balance.updateMany({
                            where: { 
                                accountId: sender.account!.id, 
                                currency: 'EUR',
                                amount: { gte: transferAmount } 
                            },
                            data: { amount: { decrement: transferAmount } },
                        });
                        if (debitResult.count !== 1) {
                            throw new Error('Insufficient balance');
                        }
                    }

                    return { success: true, receiver: receiver1.email };
                }, { isolationLevel: 'Serializable' });
            };

            const transfer2 = async () => {
                return await prisma.$transaction(async (tx) => {
                    const ids = [sender.id, receiver2.id].sort();
                    if (ids[0] === sender.id) {
                        const debitResult = await tx.balance.updateMany({
                            where: { 
                                accountId: sender.account!.id, 
                                currency: 'EUR',
                                amount: { gte: transferAmount } 
                            },
                            data: { amount: { decrement: transferAmount } },
                        });
                        if (debitResult.count !== 1) {
                            throw new Error('Insufficient balance');
                        }
                        await tx.balance.upsert({
                            where: { accountId_currency: { accountId: receiver2.account!.id, currency: 'EUR' } },
                            update: { amount: { increment: transferAmount } },
                            create: { accountId: receiver2.account!.id, currency: 'EUR', amount: transferAmount }
                        });
                    } else {
                        // Canonical ordering: Lock receiver first
                        await tx.balance.upsert({
                            where: { accountId_currency: { accountId: receiver2.account!.id, currency: 'EUR' } },
                            update: { amount: { increment: transferAmount } },
                            create: { accountId: receiver2.account!.id, currency: 'EUR', amount: transferAmount }
                        });
                        
                        // Then lock sender
                        const debitResult = await tx.balance.updateMany({
                            where: { 
                                accountId: sender.account!.id, 
                                currency: 'EUR',
                                amount: { gte: transferAmount } 
                            },
                            data: { amount: { decrement: transferAmount } },
                        });
                        if (debitResult.count !== 1) {
                            throw new Error('Insufficient balance');
                        }
                    }

                    return { success: true, receiver: receiver2.email };
                }, { isolationLevel: 'Serializable' });
            };

            // Execute both transfers simultaneously
            const [result1, result2] = await executeWithRaceCondition(transfer1, transfer2);

            // Count successes
            const successes = [result1, result2].filter(r => !(r instanceof Error)).length;
            const failures = [result1, result2].filter(r => r instanceof Error).length;

            // Verify final balance
            const finalSenderBalance = await prisma.balance.findUnique({
                where: { accountId_currency: { accountId: sender.account!.id, currency: 'EUR' } },
            });

            // Only ONE transfer should succeed
            expect(successes).toBe(1);
            expect(failures).toBe(1);

            // Final balance should be €20 (€100 - €80)
            expect(Number(finalSenderBalance!.amount)).toBe(20);

            console.log(`✅ Double spend prevented: ${successes} succeeded, ${failures} failed`);
        });
    });

    describe('2.2. Concurrent Withdrawals', () => {
        it('should allow only ONE of two simultaneous withdrawals when balance is insufficient', async () => {
            const user = await getTestUser(2);

            // Set balance to €100
            await prisma.balance.update({
                where: { accountId_currency: { accountId: user.account!.id, currency: 'EUR' } },
                data: { amount: 100 },
            });

            const withdrawAmount = 80;

            // Create two concurrent withdrawal operations
            const withdrawal1 = async () => {
                return await prisma.$transaction(async (tx) => {
                    const debitResult = await tx.balance.updateMany({
                        where: { 
                            accountId: user.account!.id, 
                            currency: 'EUR',
                            amount: { gte: withdrawAmount } 
                        },
                        data: { amount: { decrement: withdrawAmount } },
                    });
                    if (debitResult.count !== 1) {
                        throw new Error('Insufficient balance');
                    }

                    await tx.cryptoWithdraw.create({
                        data: {
                            userId: user.id,
                            asset: 'USDT_POLYGON',
                            amount: withdrawAmount,
                            toAddress: '0x1234567890123456789012345678901234567890',
                            status: 'PENDING',
                        },
                    });

                    return { success: true };
                }, { isolationLevel: 'Serializable' });
            };

            const withdrawal2 = async () => {
                return await prisma.$transaction(async (tx) => {
                    const debitResult = await tx.balance.updateMany({
                        where: { 
                            accountId: user.account!.id, 
                            currency: 'EUR',
                            amount: { gte: withdrawAmount } 
                        },
                        data: { amount: { decrement: withdrawAmount } },
                    });
                    if (debitResult.count !== 1) {
                        throw new Error('Insufficient balance');
                    }

                    await tx.cryptoWithdraw.create({
                        data: {
                            userId: user.id,
                            asset: 'USDT_POLYGON',
                            amount: withdrawAmount,
                            toAddress: '0x0987654321098765432109876543210987654321',
                            status: 'PENDING',
                        },
                    });

                    return { success: true };
                }, { isolationLevel: 'Serializable' });
            };

            // Execute both withdrawals simultaneously
            const [result1, result2] = await executeWithRaceCondition(withdrawal1, withdrawal2);

            // Count successes
            const successes = [result1, result2].filter(r => !(r instanceof Error)).length;

            // Verify final balance
            const finalWalletBalance = await prisma.balance.findUnique({
                where: { accountId_currency: { accountId: user.account!.id, currency: 'EUR' } },
            });

            // Only ONE withdrawal should succeed
            expect(successes).toBe(1);
            expect(Number(finalWalletBalance!.amount)).toBe(20);

            console.log(`✅ Double withdrawal prevented: only ${successes} succeeded`);
        });
    });

    describe('2.3. Swap + Transfer Simultaneously', () => {
        it('should allow only ONE operation when both would exceed balance', async () => {
            const user = await getTestUser(2);
            const receiver = await getTestUser(1);

            // Set balance to €100
            await prisma.balance.update({
                where: { accountId_currency: { accountId: user.account!.id, currency: 'EUR' } },
                data: { amount: 100 },
            });
            await prisma.balance.upsert({
                where: { accountId_currency: { accountId: user.account!.id, currency: 'USD' } },
                update: { amount: 0 },
                create: { accountId: user.account!.id, currency: 'USD', amount: 0 }
            });

            const amount = 80;

            // Swap operation
            const swapOperation = async () => {
                return await prisma.$transaction(async (tx) => {
                    const debitResult = await tx.balance.updateMany({
                        where: { 
                            accountId: user.account!.id, 
                            currency: 'EUR',
                            amount: { gte: amount } 
                        },
                        data: { amount: { decrement: amount } },
                    });
                    if (debitResult.count !== 1) {
                        throw new Error('Insufficient balance');
                    }
                    await tx.balance.update({
                        where: { accountId_currency: { accountId: user.account!.id, currency: 'USD' } },
                        data: { amount: { increment: amount * 1.1 } },
                    });

                    await tx.swap.create({
                        data: {
                            userId: user.id,
                            fromAsset: 'EUR',
                            toAsset: 'USD',
                            fromAmount: amount,
                            toAmount: amount * 1.1,
                            rateBase: 1.1,
                            spread: 0,
                            rateApplied: 1.1,
                        },
                    });

                    return { success: true, type: 'swap' };
                }, { isolationLevel: 'Serializable' });
            };

            // Transfer operation
            const transferOperation = async () => {
                return await prisma.$transaction(async (tx) => {
                    const ids = [user.id, receiver.id].sort();
                    if (ids[0] === user.id) {
                        const debitResult = await tx.balance.updateMany({
                            where: { 
                                accountId: user.account!.id, 
                                currency: 'EUR',
                                amount: { gte: amount } 
                            },
                            data: { amount: { decrement: amount } },
                        });
                        if (debitResult.count !== 1) {
                            throw new Error('Insufficient balance');
                        }
                        await tx.balance.upsert({
                            where: { accountId_currency: { accountId: receiver.account!.id, currency: 'EUR' } },
                            update: { amount: { increment: amount } },
                            create: { accountId: receiver.account!.id, currency: 'EUR', amount: amount }
                        });
                    } else {
                        const debitResult = await tx.balance.updateMany({
                            where: { 
                                accountId: user.account!.id, 
                                currency: 'EUR',
                                amount: { gte: amount } 
                            },
                            data: { amount: { decrement: amount } },
                        });
                        if (debitResult.count !== 1) {
                            throw new Error('Insufficient balance');
                        }
                        await tx.balance.upsert({
                            where: { accountId_currency: { accountId: receiver.account!.id, currency: 'EUR' } },
                            update: { amount: { increment: amount } },
                            create: { accountId: receiver.account!.id, currency: 'EUR', amount: amount }
                        });
                    }

                    return { success: true, type: 'transfer' };
                }, { isolationLevel: 'Serializable' });
            };

            // Execute both operations simultaneously
            const [result1, result2] = await executeWithRaceCondition(swapOperation, transferOperation);

            // Count successes
            const successes = [result1, result2].filter(r => !(r instanceof Error)).length;

            // Verify final balance
            const finalWalletBalance = await prisma.balance.findUnique({
                where: { accountId_currency: { accountId: user.account!.id, currency: 'EUR' } },
            });

            // Only ONE operation should succeed
            expect(successes).toBe(1);
            expect(Number(finalWalletBalance!.amount)).toBe(20);

            console.log(`✅ Swap/Transfer race condition prevented: only ${successes} succeeded`);
        });
    });

    describe('2.4. Multiple Card Authorizations', () => {
        it('should prevent overspending with simultaneous card authorizations', async () => {
            const user = await getTestUser(2);

            // Set balance to €100
            await prisma.balance.upsert({
                where: { accountId_currency: { accountId: user.account!.id, currency: 'EUR' } },
                update: { amount: 100 },
                create: { accountId: user.account!.id, currency: 'EUR', amount: 100 }
            });

            // Create a virtual card
            const transfer = await prisma.transfer.create({
                data: {
                    senderId: user.id,
                    recipientEmail: 'card@globalsecure.com',
                    amountSent: 100,
                    currencySent: 'EUR',
                    fee: 0,
                    amountReceived: 100,
                    currencyReceived: 'EUR',
                    type: 'CARD',
                    status: 'COMPLETED',
                },
            });

            const card = await prisma.virtualCard.create({
                data: {
                    transferId: transfer.id,
                    userId: user.id,
                    stripeCardId: 'card_test_123',
                    stripeCardholderId: 'cardholder_test_123',
                    last4: '4242',
                    brand: 'visa',
                    expMonth: 12,
                    expYear: 2026,
                    amount: 100,
                    currency: 'EUR',
                    status: 'ACTIVE',
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });

            const authAmount = 60; // Try to authorize €60 twice

            // Create two concurrent authorization operations
            const auth1 = async () => {
                return await prisma.$transaction(async (tx) => {
                    const currentCard = await tx.virtualCard.findUnique({
                        where: { id: card.id },
                        select: { amountUsed: true, amount: true }
                    });
                    const prevAmountUsed = Number(currentCard!.amountUsed);
                    const maxAllowed = Number(currentCard!.amount);
                    const availableAmount = maxAllowed - prevAmountUsed;
                    if (availableAmount < authAmount) {
                        throw new Error('Insufficient card balance');
                    }
                    const updateRes = await tx.virtualCard.updateMany({
                        where: { id: card.id, amountUsed: prevAmountUsed },
                        data: { amountUsed: { increment: authAmount } },
                    });
                    if (updateRes.count !== 1) {
                        throw new Error('Insufficient card balance');
                    }

                    await tx.spendTransaction.create({
                        data: {
                            cardId: card.id,
                            stripeAuthId: 'auth_test_1',
                            amount: authAmount,
                            currency: 'EUR',
                            merchantName: 'Test Merchant 1',
                            status: 'approved',
                        },
                    });

                    return { success: true };
                }, { isolationLevel: 'Serializable' });
            };

            const auth2 = async () => {
                return await prisma.$transaction(async (tx) => {
                    const currentCard = await tx.virtualCard.findUnique({
                        where: { id: card.id },
                        select: { amountUsed: true, amount: true }
                    });
                    const prevAmountUsed = Number(currentCard!.amountUsed);
                    const maxAllowed = Number(currentCard!.amount);
                    const availableAmount = maxAllowed - prevAmountUsed;
                    if (availableAmount < authAmount) {
                        throw new Error('Insufficient card balance');
                    }
                    const updateRes = await tx.virtualCard.updateMany({
                        where: { id: card.id, amountUsed: prevAmountUsed },
                        data: { amountUsed: { increment: authAmount } },
                    });
                    if (updateRes.count !== 1) {
                        throw new Error('Insufficient card balance');
                    }

                    await tx.spendTransaction.create({
                        data: {
                            cardId: card.id,
                            stripeAuthId: 'auth_test_2',
                            amount: authAmount,
                            currency: 'EUR',
                            merchantName: 'Test Merchant 2',
                            status: 'approved',
                        },
                    });

                    return { success: true };
                }, { isolationLevel: 'Serializable' });
            };

            // Execute both authorizations simultaneously
            const [result1, result2] = await executeWithRaceCondition(auth1, auth2);

            // Count successes
            const successes = [result1, result2].filter(r => !(r instanceof Error)).length;

            // Verify final card balance
            const finalCard = await prisma.virtualCard.findUnique({
                where: { id: card.id },
            });

            // Only ONE authorization should succeed
            expect(successes).toBe(1);
            expect(Number(finalCard!.amountUsed)).toBe(authAmount);

            console.log(`✅ Card overspending prevented: only ${successes} authorization succeeded`);
        });
    });
});
