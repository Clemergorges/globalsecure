import { UserRiskTier } from '@prisma/client';
import { getExchangeRate } from '@/lib/services/exchange';

type KycBand = 'NONE' | 'BASIC' | 'FULL';
type KYCLimitType = 'single' | 'daily' | 'monthly';

export const KYC_LIMITS: Record<number, { singleTransactionLimit: number; dailyLimit: number; monthlyLimit: number }> = {
  0: { singleTransactionLimit: 100, dailyLimit: 100, monthlyLimit: 500 },
  1: { singleTransactionLimit: 500, dailyLimit: 500, monthlyLimit: 5000 },
  2: { singleTransactionLimit: 10000, dailyLimit: 10000, monthlyLimit: 100000 },
};

export function getKYCLimit(kycLevel: number, type: KYCLimitType = 'single') {
  const cfg = KYC_LIMITS[kycLevel];
  if (!cfg) return 0;
  if (type === 'daily') return cfg.dailyLimit;
  if (type === 'monthly') return cfg.monthlyLimit;
  if (type === 'single') return cfg.singleTransactionLimit;
  return 0;
}

export function isWithinKYCLimit(kycLevel: number, amount: number, type: KYCLimitType = 'single') {
  const limit = getKYCLimit(kycLevel, type);
  if (!limit) return false;
  return amount <= limit;
}

export function validateKYCLimit(kycLevel: number, amount: number, type: KYCLimitType = 'single') {
  const limit = getKYCLimit(kycLevel, type);
  const valid = limit > 0 && amount <= limit;
  if (valid) return { valid: true as const, limit };
  return { valid: false as const, limit, message: `Amount exceeds KYC level ${kycLevel} ${type} limit` };
}

export function getKYCLevelName(kycLevel: number) {
  if (kycLevel === 0) return 'Basic (Level 0)';
  if (kycLevel === 1) return 'Standard (Level 1)';
  if (kycLevel === 2) return 'Premium (Level 2)';
  return 'Unknown';
}

export function getRequiredDocuments(kycLevel: number) {
  if (kycLevel === 1) return ['ID_FRONT', 'ID_BACK'];
  if (kycLevel >= 2) return ['ID_FRONT', 'ID_BACK', 'PROOF_OF_ADDRESS', 'SELFIE'];
  return [];
}

function numEnv(name: string, fallback: number) {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return raw;
}

function riskMultiplier(riskTier: UserRiskTier) {
  if (riskTier === UserRiskTier.MEDIUM) return numEnv('RISK_TIER_MEDIUM_MULTIPLIER', 0.7);
  if (riskTier === UserRiskTier.HIGH) return numEnv('RISK_TIER_HIGH_MULTIPLIER', 0.4);
  return numEnv('RISK_TIER_LOW_MULTIPLIER', 1);
}

export function normalizeKycBand(kycLevel: number): KycBand {
  if (!Number.isFinite(kycLevel) || kycLevel <= 0) return 'NONE';
  if (kycLevel === 1) return 'BASIC';
  return 'FULL';
}

export function getKycTierLimits(kycLevel: number, riskTier: UserRiskTier) {
  const band = normalizeKycBand(kycLevel);
  const mult = riskMultiplier(riskTier);

  const base =
    band === 'NONE'
      ? {
          perTxEur: numEnv('KYC_NONE_TX_EUR', 100),
          dailyEur: numEnv('KYC_NONE_DAILY_EUR', 100),
          monthlyEur: numEnv('KYC_NONE_MONTHLY_EUR', 500),
        }
      : band === 'BASIC'
        ? {
            perTxEur: numEnv('KYC_BASIC_TX_EUR', 500),
            dailyEur: numEnv('KYC_BASIC_DAILY_EUR', 1000),
            monthlyEur: numEnv('KYC_BASIC_MONTHLY_EUR', 5000),
          }
        : {
            perTxEur: numEnv('KYC_FULL_TX_EUR', 2000),
            dailyEur: numEnv('KYC_FULL_DAILY_EUR', 5000),
            monthlyEur: numEnv('KYC_FULL_MONTHLY_EUR', 20000),
          };

  const effective = {
    perTxEur: base.perTxEur * mult,
    dailyEur: base.dailyEur * mult,
    monthlyEur: base.monthlyEur * mult,
  };

  return {
    band,
    riskTier,
    multiplier: mult,
    base,
    effective,
  };
}

export async function convertAmountToEur(amount: number, currency: string) {
  if (currency.toUpperCase() === 'EUR') return amount;
  const rate = await getExchangeRate(currency, 'EUR');
  return amount * rate;
}
