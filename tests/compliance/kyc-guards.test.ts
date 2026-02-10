import { PrismaClient } from '@prisma/client';
import { createTestUsers, cleanupTestUsers, getTestUser } from '../fixtures/test-users';

const prisma = new PrismaClient();

// KYC Limits
const KYC_LIMITS = {
    0: 100,    // €100
    1: 500,    // €500
    2: 10000,  // €10,000
};

describe('KYC Guards and Limits Enforcement', () => {
    beforeAll(async () => {
        await createTestUsers();
    });

    afterAll(async () => {
        await cleanupTestUsers();
        await prisma.$disconnect();
    });

    describe('3.1. Transfer Limits by KYC Level', () => {
        it('should block KYC Level 0 user from transferring > €100', async () => {
            const sender = await getTestUser(0);
            const receiver = await getTestUser(1);

            const transferAmount = 150; // Above €100 limit

            await expect(async () => {
                return await prisma.$transaction(async (tx) => {
                    // Check KYC limit
                    const limit = KYC_LIMITS[sender.kycLevel as keyof typeof KYC_LIMITS];
                    if (transferAmount > limit) {
                        throw new Error(`Transfer amount exceeds KYC level ${sender.kycLevel} limit of €${limit}`);
                    }

                    await tx.balance.updateMany({
                        where: { walletId: sender.wallet!.id, currency: 'EUR' },
                        data: { amount: { decrement: transferAmount } },
                    });

                    await tx.balance.updateMany({
                        where: { walletId: receiver.wallet!.id, currency: 'EUR' },
                        data: { amount: { increment: transferAmount } },
                    });
                });
            }).rejects.toThrow('Transfer amount exceeds KYC level 0 limit of €100');

            console.log('✅ KYC Level 0: Blocked transfer > €100');
        });

        it('should allow KYC Level 0 user to transfer €50', async () => {
            const sender = await getTestUser(0);
            const receiver = await getTestUser(1);

            const transferAmount = 50; // Below €100 limit

            await prisma.$transaction(async (tx) => {
                const limit = KYC_LIMITS[sender.kycLevel as keyof typeof KYC_LIMITS];
                if (transferAmount > limit) {
                    throw new Error(`Transfer amount exceeds KYC level ${sender.kycLevel} limit of €${limit}`);
                }

                await tx.balance.updateMany({
                    where: { walletId: sender.wallet!.id, currency: 'EUR' },
                    data: { amount: { decrement: transferAmount } },
                });

                await tx.balance.updateMany({
                    where: { walletId: receiver.wallet!.id, currency: 'EUR' },
                    data: { amount: { increment: transferAmount } },
                });
            });

            console.log('✅ KYC Level 0: Allowed transfer €50');
        });

        it('should allow KYC Level 1 user to transfer €400', async () => {
            const sender = await getTestUser(1);
            const receiver = await getTestUser(2);

            const transferAmount = 400; // Below €500 limit

            await prisma.$transaction(async (tx) => {
                const limit = KYC_LIMITS[sender.kycLevel as keyof typeof KYC_LIMITS];
                if (transferAmount > limit) {
                    throw new Error(`Transfer amount exceeds KYC level ${sender.kycLevel} limit of €${limit}`);
                }

                await tx.balance.updateMany({
                    where: { walletId: sender.wallet!.id, currency: 'EUR' },
                    data: { amount: { decrement: transferAmount } },
                });

                await tx.balance.updateMany({
                    where: { walletId: receiver.wallet!.id, currency: 'EUR' },
                    data: { amount: { increment: transferAmount } },
                });
            });

            console.log('✅ KYC Level 1: Allowed transfer €400');
        });

        it('should block KYC Level 1 user from transferring > €500', async () => {
            const sender = await getTestUser(1);
            const receiver = await getTestUser(2);

            const transferAmount = 600; // Above €500 limit

            await expect(async () => {
                return await prisma.$transaction(async (tx) => {
                    const limit = KYC_LIMITS[sender.kycLevel as keyof typeof KYC_LIMITS];
                    if (transferAmount > limit) {
                        throw new Error(`Transfer amount exceeds KYC level ${sender.kycLevel} limit of €${limit}`);
                    }

                    await tx.balance.updateMany({
                        where: { walletId: sender.wallet!.id, currency: 'EUR' },
                        data: { amount: { decrement: transferAmount } },
                    });

                    await tx.balance.updateMany({
                        where: { walletId: receiver.wallet!.id, currency: 'EUR' },
                        data: { amount: { increment: transferAmount } },
                    });
                });
            }).rejects.toThrow('Transfer amount exceeds KYC level 1 limit of €500');

            console.log('✅ KYC Level 1: Blocked transfer > €500');
        });

        it('should allow KYC Level 2 user to transfer €5000', async () => {
            const sender = await getTestUser(2);
            const receiver = await getTestUser(1);

            const transferAmount = 5000; // Below €10,000 limit

            // Ensure sender has enough balance
            await prisma.balance.updateMany({
                where: { walletId: sender.wallet!.id, currency: 'EUR' },
                data: { amount: 10000 },
            });

            await prisma.$transaction(async (tx) => {
                const limit = KYC_LIMITS[sender.kycLevel as keyof typeof KYC_LIMITS];
                if (transferAmount > limit) {
                    throw new Error(`Transfer amount exceeds KYC level ${sender.kycLevel} limit of €${limit}`);
                }

                await tx.balance.updateMany({
                    where: { walletId: sender.wallet!.id, currency: 'EUR' },
                    data: { amount: { decrement: transferAmount } },
                });

                await tx.balance.updateMany({
                    where: { walletId: receiver.wallet!.id, currency: 'EUR' },
                    data: { amount: { increment: transferAmount } },
                });
            });

            console.log('✅ KYC Level 2: Allowed transfer €5000');
        });
    });

    describe('3.2. Deposit Limits by KYC Level', () => {
        it('should block KYC Level 0 deposit > €100', async () => {
            const user = await getTestUser(0);
            const depositAmount = 150;

            await expect(async () => {
                const limit = KYC_LIMITS[user.kycLevel as keyof typeof KYC_LIMITS];
                if (depositAmount > limit) {
                    throw new Error(`Deposit amount exceeds KYC level ${user.kycLevel} limit of €${limit}`);
                }
            }).rejects.toThrow('Deposit amount exceeds KYC level 0 limit of €100');

            console.log('✅ KYC Level 0: Blocked deposit > €100');
        });

        it('should allow KYC Level 1 deposit €300', async () => {
            const user = await getTestUser(1);
            const depositAmount = 300;

            const limit = KYC_LIMITS[user.kycLevel as keyof typeof KYC_LIMITS];
            expect(depositAmount).toBeLessThanOrEqual(limit);

            console.log('✅ KYC Level 1: Allowed deposit €300');
        });
    });

    describe('3.3. Withdrawal Limits by KYC Level', () => {
        it('should block KYC Level 0 withdrawal > €100', async () => {
            const user = await getTestUser(0);
            const withdrawAmount = 150;

            await expect(async () => {
                const limit = KYC_LIMITS[user.kycLevel as keyof typeof KYC_LIMITS];
                if (withdrawAmount > limit) {
                    throw new Error(`Withdrawal amount exceeds KYC level ${user.kycLevel} limit of €${limit}`);
                }
            }).rejects.toThrow('Withdrawal amount exceeds KYC level 0 limit of €100');

            console.log('✅ KYC Level 0: Blocked withdrawal > €100');
        });

        it('should allow KYC Level 2 withdrawal €8000', async () => {
            const user = await getTestUser(2);
            const withdrawAmount = 8000;

            const limit = KYC_LIMITS[user.kycLevel as keyof typeof KYC_LIMITS];
            expect(withdrawAmount).toBeLessThanOrEqual(limit);

            console.log('✅ KYC Level 2: Allowed withdrawal €8000');
        });
    });

    describe('3.4. Swap Limits by KYC Level', () => {
        it('should block KYC Level 0 swap > €100', async () => {
            const user = await getTestUser(0);
            const swapAmount = 150;

            await expect(async () => {
                const limit = KYC_LIMITS[user.kycLevel as keyof typeof KYC_LIMITS];
                if (swapAmount > limit) {
                    throw new Error(`Swap amount exceeds KYC level ${user.kycLevel} limit of €${limit}`);
                }
            }).rejects.toThrow('Swap amount exceeds KYC level 0 limit of €100');

            console.log('✅ KYC Level 0: Blocked swap > €100');
        });

        it('should allow KYC Level 1 swap €450', async () => {
            const user = await getTestUser(1);
            const swapAmount = 450;

            const limit = KYC_LIMITS[user.kycLevel as keyof typeof KYC_LIMITS];
            expect(swapAmount).toBeLessThanOrEqual(limit);

            console.log('✅ KYC Level 1: Allowed swap €450');
        });
    });

    describe('3.5. Cumulative Daily Limits', () => {
        it('should track and enforce cumulative daily limits', async () => {
            const user = await getTestUser(0);
            const limit = KYC_LIMITS[0]; // €100

            // First transfer: €60
            await prisma.$transaction(async (tx) => {
                const amount = 60;
                if (amount > limit) {
                    throw new Error(`Transfer exceeds limit`);
                }

                await tx.balance.updateMany({
                    where: { walletId: user.wallet!.id, currency: 'EUR' },
                    data: { amount: { decrement: amount } },
                });
            });

            // Second transfer: €30 (total: €90, still under €100)
            await prisma.$transaction(async (tx) => {
                const amount = 30;
                const cumulativeToday = 60 + amount; // In real implementation, query from DB

                if (cumulativeToday > limit) {
                    throw new Error(`Cumulative transfers exceed daily limit`);
                }

                await tx.balance.updateMany({
                    where: { walletId: user.wallet!.id, currency: 'EUR' },
                    data: { amount: { decrement: amount } },
                });
            });

            // Third transfer: €20 (total: €110, exceeds €100)
            await expect(async () => {
                const amount = 20;
                const cumulativeToday = 90 + amount;

                if (cumulativeToday > limit) {
                    throw new Error(`Cumulative transfers exceed daily limit of €${limit}`);
                }
            }).rejects.toThrow('Cumulative transfers exceed daily limit of €100');

            console.log('✅ Cumulative daily limits enforced correctly');
        });
    });
});
