
import { 
    KYC_LIMITS, 
    isWithinKYCLimit, 
    getKYCLimit, 
    validateKYCLimit, 
    getKYCLevelName, 
    getRequiredDocuments 
} from '@/lib/services/kyc-limits';

describe('KYC Limits Service', () => {
    
    describe('KYC_LIMITS Constants', () => {
        it('should have correct limits for Level 0', () => {
            expect(KYC_LIMITS[0].dailyLimit).toBe(100);
            expect(KYC_LIMITS[0].monthlyLimit).toBe(500);
        });

        it('should have correct limits for Level 1', () => {
            expect(KYC_LIMITS[1].dailyLimit).toBe(500);
            expect(KYC_LIMITS[1].monthlyLimit).toBe(5000);
        });

        it('should have correct limits for Level 2', () => {
            expect(KYC_LIMITS[2].dailyLimit).toBe(10000);
            expect(KYC_LIMITS[2].monthlyLimit).toBe(100000);
        });
    });

    describe('isWithinKYCLimit', () => {
        it('should return true if amount is within daily limit', () => {
            expect(isWithinKYCLimit(0, 50, 'daily')).toBe(true);
            expect(isWithinKYCLimit(0, 100, 'daily')).toBe(true);
        });

        it('should return false if amount exceeds daily limit', () => {
            expect(isWithinKYCLimit(0, 101, 'daily')).toBe(false);
        });

        it('should default to single transaction limit if type is omitted', () => {
            expect(isWithinKYCLimit(0, 100)).toBe(true);
            expect(isWithinKYCLimit(0, 101)).toBe(false);
        });

        it('should handle monthly limits', () => {
            expect(isWithinKYCLimit(1, 5000, 'monthly')).toBe(true);
            expect(isWithinKYCLimit(1, 5001, 'monthly')).toBe(false);
        });

        it('should return false for unknown limit types (default case)', () => {
            // @ts-ignore
            expect(isWithinKYCLimit(0, 100, 'unknown')).toBe(false);
        });
    });

    describe('getKYCLimit', () => {
        it('should return correct numeric limit', () => {
            expect(getKYCLimit(0, 'daily')).toBe(100);
            expect(getKYCLimit(2, 'monthly')).toBe(100000);
        });

        it('should default to single limit', () => {
            expect(getKYCLimit(1)).toBe(500);
        });

        it('should return 0 for unknown types', () => {
             // @ts-ignore
            expect(getKYCLimit(0, 'unknown')).toBe(0);
        });
    });

    describe('validateKYCLimit', () => {
        it('should return valid=true when within limit', () => {
            const result = validateKYCLimit(0, 50, 'daily');
            expect(result.valid).toBe(true);
            expect(result.limit).toBe(100);
            expect(result.message).toBeUndefined();
        });

        it('should return valid=false with message when exceeding limit', () => {
            const result = validateKYCLimit(0, 150, 'daily');
            expect(result.valid).toBe(false);
            expect(result.limit).toBe(100);
            expect(result.message).toContain('exceeds KYC level 0 daily limit');
        });
    });

    describe('getKYCLevelName', () => {
        it('should return correct names', () => {
            expect(getKYCLevelName(0)).toContain('Basic');
            expect(getKYCLevelName(1)).toContain('Standard');
            expect(getKYCLevelName(2)).toContain('Premium');
        });

        it('should return Unknown for invalid levels', () => {
            // @ts-ignore
            expect(getKYCLevelName(99)).toBe('Unknown');
        });
    });

    describe('getRequiredDocuments', () => {
        it('should return empty array for Level 0', () => {
            expect(getRequiredDocuments(0)).toEqual([]);
        });

        it('should return ID docs for Level 1', () => {
            expect(getRequiredDocuments(1)).toEqual(['ID_FRONT', 'ID_BACK']);
        });

        it('should return full docs for Level 2', () => {
            expect(getRequiredDocuments(2)).toEqual(['ID_FRONT', 'ID_BACK', 'PROOF_OF_ADDRESS', 'SELFIE']);
        });

        it('should return empty array for invalid levels', () => {
            // @ts-ignore
            expect(getRequiredDocuments(99)).toEqual([]);
        });
    });

});
