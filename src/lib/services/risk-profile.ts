import { UserRiskTier } from '@prisma/client';

function parseCsvUpper(value: string | undefined) {
  if (!value) return new Set<string>();
  return new Set(value.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean));
}

export function determineUserRiskTier(user: { country?: string | null }) {
  const country = user.country?.toUpperCase() || null;
  const sanctioned = parseCsvUpper(process.env.AML_SANCTIONED_COUNTRIES);
  const highRisk = parseCsvUpper(process.env.AML_HIGH_RISK_COUNTRIES);

  if (!country) return UserRiskTier.MEDIUM;
  if (country && sanctioned.has(country)) return UserRiskTier.HIGH;
  if (country && highRisk.has(country)) return UserRiskTier.HIGH;
  return UserRiskTier.LOW;
}
