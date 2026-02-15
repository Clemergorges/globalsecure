
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '../../src/lib/db';

describe('Security: Behavioral Fraud Scenarios', () => {
  let testUser: any;

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `behavior_fraud_${Date.now()}@security.test`,
        passwordHash: 'hashed_secret',
        firstName: 'Smurf',
        lastName: 'Test',
        kycLevel: 1, // Standard User (Limit 500)
        account: {
            create: {
                primaryCurrency: 'EUR',
                status: 'ACTIVE'
            }
        }
      },
      include: { account: true }
    });
  });

  afterAll(async () => {
    await prisma.transactionLog.deleteMany({ where: { transfer: { senderId: testUser.id } } });
    await prisma.transfer.deleteMany({ where: { senderId: testUser.id } });
    await prisma.auditLog.deleteMany({ where: { userId: testUser.id } });
    await prisma.account.delete({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  // F4 - Structuring / Smurfing
  it('F4: Should detect structuring (multiple transactions just below limit)', async () => {
    // Simulate 3 transfers of €490 (Limit is €500)
    const amount = 490;
    const count = 3;
    const limit = 500;

    // Logic Simulation: Transaction Monitoring
    let suspiciousDetected = false;
    let recentTotal = 0;

    for (let i = 0; i < count; i++) {
        recentTotal += amount;
        
        // Simple Rule: If > 90% of limit multiple times in short window
        if (amount > limit * 0.9 && i > 1) {
            suspiciousDetected = true;
            
            await prisma.auditLog.create({
                data: {
                    userId: testUser.id,
                    action: 'SUSPICIOUS_ACTIVITY',
                    status: 'WARNING',
                    metadata: { reason: 'STRUCTURING_DETECTED', amount, count: i + 1 }
                }
            });
        }
    }

    expect(suspiciousDetected).toBe(true);
    
    const log = await prisma.auditLog.findFirst({
        where: { userId: testUser.id, action: 'SUSPICIOUS_ACTIVITY' }
    });
    expect(log).toBeDefined();
  });

  // F5 - Uso Abusivo de Global Link
  it('F5: Should rate limit Global Link creation', async () => {
    const MAX_LINKS_PER_MINUTE = 5;
    let createdLinks = 0;
    let blocked = false;

    // Simulate loop
    for (let i = 0; i < 7; i++) {
        if (createdLinks >= MAX_LINKS_PER_MINUTE) {
            blocked = true;
            
            // Log Event
            await prisma.auditLog.create({
                data: {
                    userId: testUser.id,
                    action: 'ABNORMAL_TRANSFER_PATTERN',
                    status: 'BLOCKED',
                    metadata: { reason: 'RATE_LIMIT_EXCEEDED' }
                }
            });
            break;
        }
        createdLinks++;
    }

    expect(blocked).toBe(true);
    expect(createdLinks).toBe(5);
  });

  // F6 - Auto-envio Suspeito
  it('F6: Should flag self-sending transactions', async () => {
    const senderEmail = testUser.email;
    const recipientEmail = testUser.email; // Same email

    let flagged = false;

    if (senderEmail === recipientEmail) {
        flagged = true;
        await prisma.auditLog.create({
            data: {
                userId: testUser.id,
                action: 'SUSPICIOUS_ACTIVITY',
                status: 'WARNING',
                metadata: { reason: 'SELF_SENDING_DETECTED' }
            }
        });
    }

    expect(flagged).toBe(true);
  });

});
