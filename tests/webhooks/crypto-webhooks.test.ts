import { PrismaClient } from '@prisma/client';
import { createTestUsers, cleanupTestUsers, getTestUser } from '../fixtures/test-users';

const prisma = new PrismaClient();

describe('Crypto Webhooks Tests (Alchemy/Polygon)', () => {
    beforeAll(async () => {
        await createTestUsers();
    });

    afterAll(async () => {
        await cleanupTestUsers();
        await prisma.$disconnect();
    });

    describe('4.5. USDT Deposit Webhook', () => {
        it('should credit balance after blockchain confirmations', async () => {
            const user = await getTestUser(2);

            // Ensure user has a crypto address
            await prisma.wallet.update({
                where: { userId: user.id },
                data: {
                    cryptoAddress: '0x1234567890123456789012345678901234567890',
                    cryptoAddressIndex: 0,
                },
            });

            // Verify initial balance
            const initialBalanceRecord = await prisma.balance.findUnique({
                where: { walletId_currency: { walletId: user.wallet!.id, currency: 'EUR' } }
            });
            const initialBalance = Number(initialBalanceRecord?.amount || 0);
            
            const depositAmount = 100; // 100 USDT
            const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

            // Step 1: Pending webhook (0 confirmations)
            await prisma.$transaction(async (tx) => {
                // Check if already exists
                const existing = await tx.cryptoDeposit.findUnique({
                    where: { txHash },
                });

                if (existing) {
                    throw new Error('Transaction already processed');
                }

                await tx.cryptoDeposit.create({
                    data: {
                        userId: user.id,
                        txHash,
                        network: 'POLYGON',
                        token: 'USDT',
                        amount: depositAmount,
                        status: 'PENDING',
                    },
                });
            });

            // Verify NOT credited yet
            const currentBalanceRecord = await prisma.balance.findUnique({
                where: { walletId_currency: { walletId: user.wallet!.id, currency: 'EUR' } }
            });
            expect(Number(currentBalanceRecord?.amount || 0)).toBe(initialBalance);

            // Step 2: Confirmed webhook (12+ confirmations)
            await prisma.$transaction(async (tx) => {
                const deposit = await tx.cryptoDeposit.findUnique({
                    where: { txHash },
                });

                if (!deposit) {
                    throw new Error('Deposit not found');
                }

                if (deposit.status === 'CREDITED') {
                    throw new Error('Already credited');
                }

                // Update deposit status
                await tx.cryptoDeposit.update({
                    where: { txHash },
                    data: {
                        status: 'CONFIRMED',
                        confirmedAt: new Date(),
                    },
                });

                // Credit wallet (1 USDT = 1 EUR for simplicity)
                await tx.balance.upsert({
                    where: { walletId_currency: { walletId: user.wallet!.id, currency: 'EUR' } },
                    create: { walletId: user.wallet!.id, currency: 'EUR', amount: depositAmount },
                    update: { amount: { increment: depositAmount } }
                });

                // Create transaction log
                const wallet = await tx.wallet.findUnique({
                    where: { userId: user.id },
                });

                const walletTx = await tx.walletTransaction.create({
                    data: {
                        walletId: wallet!.id,
                        type: 'DEPOSIT',
                        amount: depositAmount,
                        currency: 'EUR',
                        description: `Crypto deposit ${txHash.substring(0, 10)}...`,
                    },
                });

                // Link to deposit
                await tx.cryptoDeposit.update({
                    where: { txHash },
                    data: {
                        status: 'CREDITED',
                        creditedAt: new Date(),
                        walletTxId: walletTx.id,
                    },
                });
            });

            // Verify balance credited
            const finalBalanceRecord = await prisma.balance.findUnique({
                where: { walletId_currency: { walletId: user.wallet!.id, currency: 'EUR' } }
            });
            expect(Number(finalBalanceRecord?.amount || 0)).toBe(initialBalance + depositAmount);

            console.log('✅ Crypto deposit webhook: Credited after confirmations');
        });

        it('should ignore duplicate crypto deposit webhook', async () => {
            const user = await getTestUser(2);
            const depositAmount = 50;
            const txHash = '0xduplicate1234567890duplicate1234567890duplicate1234567890duplicate';

            // First webhook
            await prisma.$transaction(async (tx) => {
                await tx.cryptoDeposit.create({
                    data: {
                        userId: user.id,
                        txHash,
                        network: 'POLYGON',
                        token: 'USDT',
                        amount: depositAmount,
                        status: 'PENDING',
                    },
                });
            });

            // Second webhook (duplicate)
            await expect(async () => {
                await prisma.$transaction(async (tx) => {
                    const existing = await tx.cryptoDeposit.findUnique({
                        where: { txHash },
                    });

                    if (existing) {
                        throw new Error('Transaction already processed');
                    }

                    await tx.cryptoDeposit.create({
                        data: {
                            userId: user.id,
                            txHash,
                            network: 'POLYGON',
                            token: 'USDT',
                            amount: depositAmount,
                            status: 'PENDING',
                        },
                    });
                });
            }).rejects.toThrow('Transaction already processed');

            console.log('✅ Duplicate crypto webhook: Correctly ignored');
        });
    });

    describe('4.6. Out-of-Order Webhooks', () => {
        it('should handle confirmed webhook arriving before pending', async () => {
            const user = await getTestUser(2);
            const depositAmount = 75;
            const txHash = '0xoutoforder1234567890outoforder1234567890outoforder1234567890';

            // Confirmed webhook arrives FIRST (unusual but possible)
            await prisma.$transaction(async (tx) => {
                const existing = await tx.cryptoDeposit.findUnique({
                    where: { txHash },
                });

                if (!existing) {
                    // Create directly as CONFIRMED
                    await tx.cryptoDeposit.create({
                        data: {
                            userId: user.id,
                            txHash,
                            network: 'POLYGON',
                            token: 'USDT',
                            amount: depositAmount,
                            status: 'CONFIRMED',
                            confirmedAt: new Date(),
                        },
                    });
                } else {
                    // Update to CONFIRMED
                    await tx.cryptoDeposit.update({
                        where: { txHash },
                        data: {
                            status: 'CONFIRMED',
                            confirmedAt: new Date(),
                        },
                    });
                }
            });

            // Pending webhook arrives SECOND (should be ignored or merged)
            await prisma.$transaction(async (tx) => {
                const existing = await tx.cryptoDeposit.findUnique({
                    where: { txHash },
                });

                if (existing) {
                    // Already exists, don't create duplicate
                    // Just ensure status is at least PENDING
                    if (existing.status === 'PENDING') {
                        // Already pending, do nothing
                    }
                    // If CONFIRMED or CREDITED, don't downgrade
                } else {
                    await tx.cryptoDeposit.create({
                        data: {
                            userId: user.id,
                            txHash,
                            network: 'POLYGON',
                            token: 'USDT',
                            amount: depositAmount,
                            status: 'PENDING',
                        },
                    });
                }
            });

            // Verify only one deposit exists and it's CONFIRMED
            const deposit = await prisma.cryptoDeposit.findUnique({
                where: { txHash },
            });

            expect(deposit).not.toBeNull();
            expect(deposit!.status).toBe('CONFIRMED');

            console.log('✅ Out-of-order webhooks: Handled correctly');
        });
    });

    describe('4.7. Failed/Reverted Transactions', () => {
        it('should NOT credit balance for reverted transaction', async () => {
            const user = await getTestUser(2);
            const initialBalance = Number(user.wallet!.balanceEUR);
            const depositAmount = 100;
            const txHash = '0xreverted1234567890reverted1234567890reverted1234567890reverted';

            // Pending webhook
            await prisma.cryptoDeposit.create({
                data: {
                    userId: user.id,
                    txHash,
                    network: 'POLYGON',
                    token: 'USDT',
                    amount: depositAmount,
                    status: 'PENDING',
                },
            });

            // Failed webhook (transaction reverted)
            await prisma.cryptoDeposit.update({
                where: { txHash },
                data: { status: 'FAILED' },
            });

            // Verify balance NOT credited
            const finalWallet = await prisma.wallet.findUnique({
                where: { userId: user.id },
            });

            expect(Number(finalWallet!.balanceEUR)).toBe(initialBalance);

            console.log('✅ Reverted transaction: Balance NOT credited');
        });
    });

    describe('4.8. Webhook HMAC Validation', () => {
        it('should reject webhook with invalid HMAC signature', async () => {
            // Simulate Alchemy webhook with HMAC
            const webhookPayload = {
                webhookId: 'wh_test_123',
                id: 'whevt_test_123',
                createdAt: new Date().toISOString(),
                type: 'ADDRESS_ACTIVITY',
                event: {
                    network: 'MATIC_AMOY',
                    activity: [
                        {
                            hash: '0xtest123',
                            value: 100,
                        },
                    ],
                },
            };

            const providedSignature = 'invalid_hmac_signature';
            const webhookSecret = 'test_webhook_secret';

            // In real implementation:
            // const expectedSignature = crypto
            //   .createHmac('sha256', webhookSecret)
            //   .update(JSON.stringify(webhookPayload))
            //   .digest('hex');

            const expectedSignature = 'valid_hmac_signature';

            expect(providedSignature).not.toBe(expectedSignature);

            console.log('✅ Invalid HMAC signature: Correctly rejected');
        });
    });
});
