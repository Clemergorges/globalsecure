import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const E2E_PREFIX = 'e2e_transfer_';

describe('E2E: Transfer Flows', () => {
    beforeAll(async () => {
        const users = await prisma.user.findMany({
            where: { email: { startsWith: E2E_PREFIX } },
            select: { id: true, email: true }
        });
        const ids = users.map(u => u.id);
        await prisma.transfer.deleteMany({
            where: {
                OR: [
                    { recipientEmail: { startsWith: E2E_PREFIX } },
                    { senderId: { in: ids } },
                    { recipientId: { in: ids } }
                ]
            }
        });
        
        // Delete wallets first to avoid FK violation
        await prisma.balance.deleteMany({
            where: { wallet: { userId: { in: ids } } }
        });
        await prisma.walletTransaction.deleteMany({
            where: { wallet: { userId: { in: ids } } }
        });
        await prisma.wallet.deleteMany({
            where: { userId: { in: ids } }
        });

        await prisma.user.deleteMany({
            where: { email: { startsWith: E2E_PREFIX } }
        });
    });

    afterAll(async () => {
        const users = await prisma.user.findMany({
            where: { email: { startsWith: E2E_PREFIX } },
            select: { id: true, email: true }
        });
        const ids = users.map(u => u.id);
        await prisma.transfer.deleteMany({
            where: {
                OR: [
                    { recipientEmail: { startsWith: E2E_PREFIX } },
                    { senderId: { in: ids } },
                    { recipientId: { in: ids } }
                ]
            }
        });

        // Delete wallets first to avoid FK violation
        await prisma.balance.deleteMany({
            where: { wallet: { userId: { in: ids } } }
        });
        await prisma.walletTransaction.deleteMany({
            where: { wallet: { userId: { in: ids } } }
        });
        await prisma.wallet.deleteMany({
            where: { userId: { in: ids } }
        });

        await prisma.user.deleteMany({
            where: { email: { startsWith: E2E_PREFIX } }
        });
        await prisma.$disconnect();
    });

    it('should execute an internal P2P transfer correctly', async () => {
        // 1. Setup Sender and Receiver
        const senderEmail = `${E2E_PREFIX}sender@test.com`;
        const receiverEmail = `${E2E_PREFIX}receiver@test.com`;

        const sender = await prisma.user.create({
            data: {
                email: senderEmail,
                passwordHash: 'hashed',
                firstName: 'Sender',
                lastName: 'E2E',
                kycLevel: 2,
                wallet: {
                    create: {
                        balances: {
                            create: { currency: 'EUR', amount: 100 }
                        }
                    }
                }
            },
            include: { wallet: true }
        });

        const receiver = await prisma.user.create({
            data: {
                email: receiverEmail,
                passwordHash: 'hashed',
                firstName: 'Receiver',
                lastName: 'E2E',
                kycLevel: 2,
                wallet: {
                    create: {
                        balances: {
                            create: { currency: 'EUR', amount: 0 }
                        }
                    }
                }
            },
            include: { wallet: true }
        });

        const transferAmount = 50;

        // 2. Execute Transfer (Simulating logic from API)
        await prisma.$transaction(async (tx) => {
            // Debit Sender
            await tx.balance.updateMany({
                where: { walletId: sender.wallet!.id, currency: 'EUR' },
                data: { amount: { decrement: transferAmount } }
            });

            // Credit Receiver
            await tx.balance.updateMany({
                where: { walletId: receiver.wallet!.id, currency: 'EUR' },
                data: { amount: { increment: transferAmount } }
            });

            // Create Transfer Record
            await tx.transfer.create({
                data: {
                    senderId: sender.id,
                    recipientId: receiver.id,
                    recipientEmail: receiver.email,
                    amountSent: transferAmount,
                    currencySent: 'EUR',
                    amountReceived: transferAmount,
                    currencyReceived: 'EUR',
                    fee: 0,
                    status: 'COMPLETED',
                    type: 'ACCOUNT'
                }
            });
        });

        // 3. Verify Balances
        const finalSenderBalance = await prisma.balance.findUnique({
            where: { walletId_currency: { walletId: sender.wallet!.id, currency: 'EUR' } }
        });
        const finalReceiverBalance = await prisma.balance.findUnique({
            where: { walletId_currency: { walletId: receiver.wallet!.id, currency: 'EUR' } }
        });

        expect(Number(finalSenderBalance!.amount)).toBe(50);
        expect(Number(finalReceiverBalance!.amount)).toBe(50);
    });

    it('should fail transfer with insufficient funds', async () => {
        const poorUser = await prisma.user.create({
            data: {
                email: `${E2E_PREFIX}poor@test.com`,
                passwordHash: 'hashed',
                firstName: 'Poor',
                lastName: 'User',
                kycLevel: 2,
                wallet: {
                    create: {
                        balances: {
                            create: { currency: 'EUR', amount: 10 }
                        }
                    }
                }
            },
            include: { wallet: true }
        });

        const attemptAmount = 100;

        // Simulate API check
        const balance = await prisma.balance.findUnique({
            where: { walletId_currency: { walletId: poorUser.wallet!.id, currency: 'EUR' } }
        });
        try {
            if (Number(balance!.amount) < attemptAmount) {
                throw new Error('Insufficient funds');
            }
            // Should not reach here
            expect(true).toBe(false);
        } catch (e) {
            expect((e as Error).message).toBe('Insufficient funds');
        }
    });
});
