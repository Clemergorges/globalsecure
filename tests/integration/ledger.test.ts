import { PrismaClient } from '@prisma/client';
import { processInternalTransfer } from '@/lib/services/ledger';

// Mock Pusher
jest.mock('@/lib/services/pusher', () => ({
  pusherService: {
    trigger: jest.fn().mockResolvedValue(true)
  }
}));

const prisma = new PrismaClient();
const PREFIX = 'acid_test_';

describe('Ledger ACID Compliance', () => {
  let senderId: string;
  let recipientId: string;
  let senderEmail: string;
  let recipientEmail: string;

  beforeAll(async () => {
    // Cleanup old test data
    const users = await prisma.user.findMany({
      where: { email: { startsWith: PREFIX } },
      select: { id: true }
    });
    const ids = users.map(u => u.id);

    if (ids.length > 0) {
      // 1. Logs & Transactions linked to Transfer
      await prisma.transactionLog.deleteMany({ where: { transfer: { OR: [{ senderId: { in: ids } }, { recipientId: { in: ids } }] } } });
      await prisma.walletTransaction.deleteMany({ where: { wallet: { userId: { in: ids } } } });
      
      // 2. Balances
      await prisma.balance.deleteMany({ where: { wallet: { userId: { in: ids } } } });
      
      // 3. Transfers
      await prisma.transfer.deleteMany({ where: { OR: [{ senderId: { in: ids } }, { recipientId: { in: ids } }] } });
      
      // 4. Wallet & User
      await prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Setup fresh users for each test
    senderEmail = `${PREFIX}sender_${Date.now()}@test.com`;
    recipientEmail = `${PREFIX}recipient_${Date.now()}@test.com`;

    const sender = await prisma.user.create({
      data: {
        email: senderEmail,
        passwordHash: 'hash',
        firstName: 'Sender',
        lastName: 'Test',
        wallet: {
          create: {
            balances: {
              create: { currency: 'EUR', amount: 100.00 }
            }
          }
        }
      },
      include: { wallet: true }
    });
    senderId = sender.id;

    const recipient = await prisma.user.create({
      data: {
        email: recipientEmail,
        passwordHash: 'hash',
        firstName: 'Recipient',
        lastName: 'Test',
        wallet: {
          create: {
            balances: {
              create: { currency: 'EUR', amount: 0.00 }
            }
          }
        }
      },
      include: { wallet: true }
    });
    recipientId = recipient.id;
  });

  it('ATOMICITY: Should fail transfer if funds are insufficient and not change balances', async () => {
    const amount = 150.00; // More than 100
    
    await expect(
      processInternalTransfer(senderId, senderEmail, recipientEmail, amount, 'EUR')
    ).rejects.toThrow('Insufficient funds');

    // Verify Balances Unchanged
    const senderBalance = await prisma.balance.findFirst({
      where: { wallet: { userId: senderId }, currency: 'EUR' }
    });
    const recipientBalance = await prisma.balance.findFirst({
      where: { wallet: { userId: recipientId }, currency: 'EUR' }
    });

    expect(Number(senderBalance?.amount)).toBe(100.00);
    expect(Number(recipientBalance?.amount)).toBe(0.00);
  });

  it('CONSISTENCY: Should deduct amount + fees and credit exact amount', async () => {
    const amount = 50.00;
    const feePercent = 1.8;
    const fee = Number((amount * feePercent / 100).toFixed(2)); // 0.90
    const totalDeduction = amount + fee; // 50.90

    await processInternalTransfer(senderId, senderEmail, recipientEmail, amount, 'EUR');

    const senderBalance = await prisma.balance.findFirst({
      where: { wallet: { userId: senderId }, currency: 'EUR' }
    });
    const recipientBalance = await prisma.balance.findFirst({
      where: { wallet: { userId: recipientId }, currency: 'EUR' }
    });

    expect(Number(senderBalance?.amount)).toBeCloseTo(100.00 - totalDeduction, 2);
    expect(Number(recipientBalance?.amount)).toBeCloseTo(50.00, 2);
  });

  it('ISOLATION: Should handle concurrent transfers correctly (prevent double spend)', async () => {
    // 5 transfers of 30 EUR. Total needed = 150 + fees. User has 100.
    // Only 3 should succeed (90 + 1.62 = 91.62). 4th would require 122.16.
    const amount = 30.00;
    
    const promises = Array(5).fill(0).map(() => 
      processInternalTransfer(senderId, senderEmail, recipientEmail, amount, 'EUR')
        .catch(e => ({ error: e.message }))
    );

    const results = await Promise.all(promises);

    const successes = results.filter(r => (r as any).success).length;
    const failures = results.filter(r => (r as any).error).length;

    console.log(`Concurrent Results: ${successes} Success, ${failures} Failures`);

    // We expect exactly 3 successes
    expect(successes).toBe(3);
    expect(failures).toBe(2);

    // Verify final balances
    const fee = Number((amount * 1.8 / 100).toFixed(2)); // 0.54
    const totalDeductionPerTx = amount + fee; // 30.54
    const totalDeducted = totalDeductionPerTx * 3; // 91.62

    const senderBalance = await prisma.balance.findFirst({
      where: { wallet: { userId: senderId }, currency: 'EUR' }
    });
    const recipientBalance = await prisma.balance.findFirst({
      where: { wallet: { userId: recipientId }, currency: 'EUR' }
    });

    expect(Number(senderBalance?.amount)).toBeCloseTo(100.00 - totalDeducted, 2); // 8.38
    expect(Number(recipientBalance?.amount)).toBeCloseTo(30.00 * 3, 2); // 90.00
  });
});
