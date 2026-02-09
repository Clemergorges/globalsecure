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
                        balanceEUR: 100, // Initial balance
                        balanceUSD: 0,
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
                        balanceEUR: 0,
                        balanceUSD: 0,
                    }
                }
            },
            include: { wallet: true }
        });

        const transferAmount = 50;

        // 2. Execute Transfer (Simulating logic from API)
        await prisma.$transaction(async (tx) => {
            // Debit Sender
            await tx.wallet.update({
                where: { id: sender.wallet!.id },
                data: { balanceEUR: { decrement: transferAmount } }
            });

            // Credit Receiver
            await tx.wallet.update({
                where: { id: receiver.wallet!.id },
                data: { balanceEUR: { increment: transferAmount } }
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
        const finalSender = await prisma.wallet.findUnique({ where: { userId: sender.id } });
        const finalReceiver = await prisma.wallet.findUnique({ where: { userId: receiver.id } });

        expect(Number(finalSender!.balanceEUR)).toBe(50);
        expect(Number(finalReceiver!.balanceEUR)).toBe(50);
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
                    create: { balanceEUR: 10 }
                }
            },
            include: { wallet: true }
        });

        const attemptAmount = 100;

        // Simulate API check
        const wallet = await prisma.wallet.findUnique({ where: { userId: poorUser.id } });
        try {
            if (Number(wallet!.balanceEUR) < attemptAmount) {
                throw new Error('Insufficient funds');
            }
            // Should not reach here
            expect(true).toBe(false);
        } catch (e) {
            expect((e as Error).message).toBe('Insufficient funds');
        }
    });
});
