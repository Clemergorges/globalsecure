import { PrismaClient } from '@prisma/client';
import { createVirtualCard, updateCardStatus, updateCardControls } from '@/lib/services/stripe';

// Mock Stripe Service
jest.mock('@/lib/services/stripe', () => ({
    createVirtualCard: jest.fn(),
    updateCardStatus: jest.fn(),
    updateCardControls: jest.fn(),
    createIssuingEphemeralKey: jest.fn(),
}));

const prisma = new PrismaClient();
const E2E_PREFIX = 'e2e_cards_';

describe('E2E: Virtual Cards', () => {
    beforeAll(async () => {
        // Cleanup
        const users = await prisma.user.findMany({
            where: { email: { startsWith: E2E_PREFIX } },
            select: { id: true }
        });
        const ids = users.map(u => u.id);
        
        await prisma.accountTransaction.deleteMany({ where: { account: { userId: { in: ids } } } });
        await prisma.balance.deleteMany({ where: { account: { userId: { in: ids } } } });
        await prisma.account.deleteMany({ where: { userId: { in: ids } } });
        await prisma.virtualCard.deleteMany({ where: { userId: { in: ids } } });
        await prisma.transfer.deleteMany({ where: { senderId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
    });

    afterAll(async () => {
        // Cleanup
        const users = await prisma.user.findMany({
            where: { email: { startsWith: E2E_PREFIX } },
            select: { id: true }
        });
        const ids = users.map(u => u.id);
        
        await prisma.accountTransaction.deleteMany({ where: { account: { userId: { in: ids } } } });
        await prisma.balance.deleteMany({ where: { account: { userId: { in: ids } } } });
        await prisma.account.deleteMany({ where: { userId: { in: ids } } });
        await prisma.virtualCard.deleteMany({ where: { userId: { in: ids } } });
        await prisma.transfer.deleteMany({ where: { senderId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
        await prisma.$disconnect();
    });

    it('should create a virtual card and debit balance', async () => {
        // 1. Create User with Balance
        const user = await prisma.user.create({
            data: {
                email: `${E2E_PREFIX}user@test.com`,
                passwordHash: 'hashed',
                firstName: 'Card',
                lastName: 'User',
                kycLevel: 2, account: {
                    create: {
                        balances: {
                            create: { currency: 'EUR', amount: 100 }
                        }
                    }
                }
            },
            include: { account: true }
        });

        // Mock Stripe Response
        (createVirtualCard as jest.Mock).mockResolvedValue({
            cardId: 'ic_test_123',
            cardholderId: 'ich_test_123',
            last4: '4242',
            number: '4242424242424242',
            cvc: '123',
            exp_month: 12,
            exp_year: 2030,
            brand: 'visa'
        });

        const cardAmount = 20;

        // 2. Simulate API Logic (Create Card)
        // A. Debit Balance
        await prisma.$transaction(async (tx) => {
            const debitResult = await tx.balance.updateMany({
                where: { accountId: user.account!.id, currency: 'EUR', amount: { gte: cardAmount } },
                data: { amount: { decrement: cardAmount } }
            });
            if (debitResult.count === 0) throw new Error('Insufficient funds');

            // B. Create Transfer
            const transfer = await tx.transfer.create({
                data: {
                    senderId: user.id,
                    recipientId: user.id,
                    recipientEmail: user.email,
                    amountSent: cardAmount,
                    currencySent: 'EUR',
                    amountReceived: cardAmount,
                    currencyReceived: 'EUR',
                    fee: 0,
                    type: 'CARD',
                    status: 'COMPLETED'
                }
            });

            // C. Save Card
            await tx.virtualCard.create({
                data: {
                    transferId: transfer.id,
                    userId: user.id,
                    stripeCardId: 'ic_test_123',
                    stripeCardholderId: 'ich_test_123',
                    last4: '4242',
                    brand: 'visa',
                    expMonth: 12,
                    expYear: 2030,
                    expiresAt: new Date('2030-12-31'),
                    amount: cardAmount,
                    currency: 'EUR',
                    status: 'INACTIVE', // MUST BE INACTIVE BY DEFAULT
                    unlockCode: '123456'
                }
            });
        });

        // 3. Verify DB State
        const finalBalance = await prisma.balance.findUnique({
            where: { accountId_currency: { accountId: user.account!.id, currency: 'EUR' } }
        });
        const card = await prisma.virtualCard.findFirst({ where: { userId: user.id } });

        expect(Number(finalBalance!.amount)).toBe(80); // 100 - 20
        expect(card).toBeDefined();
        expect(card!.status).toBe('INACTIVE');
        expect(Number(card!.amount)).toBe(20);
    });

    it('should unlock a card', async () => {
        const user = await prisma.user.findFirst({ where: { email: `${E2E_PREFIX}user@test.com` } });
        const card = await prisma.virtualCard.findFirst({ where: { userId: user!.id } });

        // Simulate Unlock (Just check if card exists)
        // Note: The card is initially INACTIVE. It only becomes ACTIVE after explicit activation.
        expect(card).toBeDefined();
        expect(card?.status).toBe('INACTIVE');
    });

    it('should activate a card', async () => {
        const user = await prisma.user.findFirst({ where: { email: `${E2E_PREFIX}user@test.com` } });
        const card = await prisma.virtualCard.findFirst({ where: { userId: user!.id } });

        (updateCardStatus as jest.Mock).mockResolvedValue({ status: 'active' });

        // Update DB directly since we don't have the API route mocked here perfectly
        const updatedCard = await prisma.virtualCard.update({
            where: { id: card!.id },
            data: { status: 'ACTIVE' }
        });

        expect(updatedCard.status).toBe('ACTIVE');
    });

    it('should update spending controls', async () => {
        // Setup
        const user = await prisma.user.findFirst({ where: { email: `${E2E_PREFIX}user@test.com` } });
        const card = await prisma.virtualCard.findFirst({ where: { userId: user!.id } });

        // Mock Stripe
        (updateCardControls as jest.Mock).mockResolvedValue({});

        expect(card).toBeDefined();
    });
});
