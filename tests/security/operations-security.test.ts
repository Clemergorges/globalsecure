
import { describe, expect, it } from '@jest/globals';
import { KYC_LIMITS, validateKYCLimit } from '../../src/lib/services/kyc-limits';

describe('Operations Security: KYC & Limits', () => {

  it('should enforce Single Transaction Limits for Unverified Users (Level 0)', () => {
    const level = 0;
    const limit = KYC_LIMITS[level].singleTransactionLimit;
    
    // Valid Amount
    const validResult = validateKYCLimit(level, limit, 'single');
    expect(validResult.valid).toBe(true);

    // Invalid Amount (Exceeds Limit)
    const invalidResult = validateKYCLimit(level, limit + 0.01, 'single');
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.message).toContain(`exceeds KYC level ${level} single limit`);
  });

  it('should enforce Daily Limits for Verified Users (Level 1)', () => {
    const level = 1;
    const limit = KYC_LIMITS[level].dailyLimit;

    const result = validateKYCLimit(level, limit + 100, 'daily');
    expect(result.valid).toBe(false);
  });

  it('should enforce Monthly Limits for Premium Users (Level 2)', () => {
    const level = 2;
    const limit = KYC_LIMITS[level].monthlyLimit;

    const result = validateKYCLimit(level, limit + 1, 'monthly');
    expect(result.valid).toBe(false);
  });

  it('should validate valid transactions correctly', () => {
    const level = 2;
    const amount = 5000; // Well within 100k limit

    const result = validateKYCLimit(level, amount, 'monthly');
    expect(result.valid).toBe(true);
  });

});
