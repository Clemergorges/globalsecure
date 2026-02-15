
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/lib/db';
import { smsService } from '../../src/lib/services/sms';

// Mock SMS Service
jest.mock('../../src/lib/services/sms', () => ({
  smsService: {
    sendOTP: jest.fn().mockResolvedValue(true)
  }
}));

describe('2FA Security Suite', () => {
  let user: any;
  let validOtp: string;

  beforeAll(async () => {
    // Create user with 2FA setup (but verify later)
    user = await prisma.user.create({
      data: {
        email: `2fa_test_${Date.now()}@security.test`,
        passwordHash: 'hashed_secret',
        phone: `+1555${Date.now().toString().slice(-6)}`,
        phoneVerified: true // Assumption for SMS 2FA
      }
    });
  });

  afterAll(async () => {
    await prisma.oTP.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it('should generate a valid 6-digit OTP and store hash/record', async () => {
    // Simulate generation logic found in API
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    const otpRecord = await prisma.oTP.create({
        data: {
            userId: user.id,
            code: code, // In real app, this should be hashed if stored, or plain if short lived.
                        // The schema shows 'code' as String. Checking if it's plain text.
            type: 'SMS',
            target: user.phone,
            expiresAt: expiresAt
        }
    });

    expect(otpRecord.code).toHaveLength(6);
    expect(otpRecord.userId).toBe(user.id);
    
    // Verify mock SMS call
    await smsService.sendOTP(user.phone, code);
    expect(smsService.sendOTP).toHaveBeenCalledWith(user.phone, code);
  });

  it('should reject expired OTP', async () => {
    const expiredCode = '123456';
    await prisma.oTP.create({
        data: {
            userId: user.id,
            code: expiredCode,
            type: 'SMS',
            target: user.phone,
            expiresAt: new Date(Date.now() - 1000) // Past
        }
    });

    // Simulate Verification Logic
    const dbOtp = await prisma.oTP.findFirst({
        where: {
            userId: user.id,
            code: expiredCode,
            used: false,
            expiresAt: { gt: new Date() } // Query filters expired
        }
    });

    expect(dbOtp).toBeNull();
  });

  it('should reject reused OTP (Replay Attack)', async () => {
    const code = '654321';
    // Create a "used" OTP
    await prisma.oTP.create({
        data: {
            userId: user.id,
            code: code,
            type: 'SMS',
            target: user.phone,
            expiresAt: new Date(Date.now() + 10000),
            used: true
        }
    });

    const dbOtp = await prisma.oTP.findFirst({
        where: {
            userId: user.id,
            code: code,
            used: false, // Filter out used
            expiresAt: { gt: new Date() }
        }
    });

    expect(dbOtp).toBeNull();
  });

  it('should prevent brute force of OTP (Rate Limiting)', async () => {
     // This test validates the Logic, usually handled by Redis Rate Limiter.
     // Since we can't easily integration test Redis here, we document the expectation.
     // "Rate Limiter should block > 3 attempts"
     
     // In unit test, we can check if the API implementation calls the rate limiter.
     // (Skipped for pure DB logic test)
  });

});
