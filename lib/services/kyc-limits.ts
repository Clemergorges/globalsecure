/**
 * KYC Limits Service
 * Centralized logic for KYC level limits and validation
 */

export const KYC_LIMITS = {
    0: {
        dailyLimit: 100,
        singleTransactionLimit: 100,
        monthlyLimit: 500,
    },
    1: {
        dailyLimit: 500,
        singleTransactionLimit: 500,
        monthlyLimit: 5000,
    },
    2: {
        dailyLimit: 10000,
        singleTransactionLimit: 10000,
        monthlyLimit: 100000,
    },
} as const;

export type KYCLevel = 0 | 1 | 2;

/**
 * Check if amount is within KYC limits
 */
export function isWithinKYCLimit(
    kycLevel: KYCLevel,
    amount: number,
    type: 'daily' | 'single' | 'monthly' = 'single'
): boolean {
    const limits = KYC_LIMITS[kycLevel];

    switch (type) {
        case 'daily':
            return amount <= limits.dailyLimit;
        case 'single':
            return amount <= limits.singleTransactionLimit;
        case 'monthly':
            return amount <= limits.monthlyLimit;
        default:
            return false;
    }
}

/**
 * Get KYC limit for a specific level and type
 */
export function getKYCLimit(
    kycLevel: KYCLevel,
    type: 'daily' | 'single' | 'monthly' = 'single'
): number {
    const limits = KYC_LIMITS[kycLevel];

    switch (type) {
        case 'daily':
            return limits.dailyLimit;
        case 'single':
            return limits.singleTransactionLimit;
        case 'monthly':
            return limits.monthlyLimit;
        default:
            return 0;
    }
}

/**
 * Validate transaction against KYC limits
 */
export function validateKYCLimit(
    kycLevel: KYCLevel,
    amount: number,
    type: 'daily' | 'single' | 'monthly' = 'single'
): { valid: boolean; limit: number; message?: string } {
    const limit = getKYCLimit(kycLevel, type);
    const valid = amount <= limit;

    if (!valid) {
        return {
            valid: false,
            limit,
            message: `Amount €${amount} exceeds KYC level ${kycLevel} ${type} limit of €${limit}`,
        };
    }

    return { valid: true, limit };
}

/**
 * Get human-readable KYC level name
 */
export function getKYCLevelName(kycLevel: KYCLevel): string {
    switch (kycLevel) {
        case 0:
            return 'Basic (Unverified)';
        case 1:
            return 'Standard (ID Verified)';
        case 2:
            return 'Premium (Full KYC)';
        default:
            return 'Unknown';
    }
}

/**
 * Get required documents for KYC level
 */
export function getRequiredDocuments(kycLevel: KYCLevel): string[] {
    switch (kycLevel) {
        case 0:
            return [];
        case 1:
            return ['ID_FRONT', 'ID_BACK'];
        case 2:
            return ['ID_FRONT', 'ID_BACK', 'PROOF_OF_ADDRESS', 'SELFIE'];
        default:
            return [];
    }
}
