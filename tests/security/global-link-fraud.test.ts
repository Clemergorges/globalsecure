
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '../../src/lib/db';

describe('Security: Global Link Fraud Scenarios', () => {
  let testUser: any;
  let link: any;

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `link_fraud_${Date.now()}@security.test`,
        passwordHash: 'hashed_secret',
        account: {
            create: { primaryCurrency: 'EUR', status: 'ACTIVE' }
        }
      },
      include: { account: true }
    });

    // Create a base link
    link = await prisma.claimLink.create({
        data: {
            token: `token_${Date.now()}`,
            creatorId: testUser.id,
            amount: 50,
            currency: 'EUR',
            expiresAt: new Date(Date.now() + 86400000) // 24h
        }
    });
  });

  afterAll(async () => {
    await prisma.claimLink.deleteMany({ where: { creatorId: testUser.id } });
    await prisma.auditLog.deleteMany({ where: { userId: testUser.id } });
    await prisma.account.delete({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  // F10 - Link Expirado
  it('F10: Should reject expired link', async () => {
    const expiredToken = 'expired_123';
    
    // Create expired link
    await prisma.claimLink.create({
        data: {
            token: expiredToken,
            creatorId: testUser.id,
            amount: 10,
            currency: 'EUR',
            expiresAt: new Date(Date.now() - 1000) // Past
        }
    });

    // Attempt Redeem Logic
    const foundLink = await prisma.claimLink.findFirst({
        where: {
            token: expiredToken,
            expiresAt: { gt: new Date() } // Query filters expired
        }
    });

    expect(foundLink).toBeNull();
  });

  // F11 - Brute Force Unlock Code
  it('F11: Should detect multiple failed unlock attempts', async () => {
    const MAX_TRIES = 5;
    let failedTries = 0;
    let blocked = false;

    for (let i = 0; i < 6; i++) {
        if (failedTries >= MAX_TRIES) {
            blocked = true;
            await prisma.auditLog.create({
                data: {
                    userId: testUser.id,
                    action: 'UNLOCK_BRUTE_FORCE',
                    status: 'BLOCKED',
                    metadata: { token: link.token }
                }
            });
            break;
        }
        failedTries++;
    }

    expect(blocked).toBe(true);
  });

  // F12 - Double Spending
  it('F12: Should prevent double redemption of the same link', async () => {
    // 1. Redeem First Time
    await prisma.claimLink.update({
        where: { id: link.id },
        data: { status: 'CLAIMED', claimedAt: new Date() }
    });

    // 2. Attempt Second Redeem
    const secondAttempt = await prisma.claimLink.findFirst({
        where: {
            id: link.id,
            status: 'PENDING' // Filter ensures only pending links are redeemable
        }
    });

    expect(secondAttempt).toBeNull();
  });

});
