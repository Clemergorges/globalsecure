export const SUPPORTED_KYC_COUNTRIES = ['LU', 'BR', 'US', 'PT', 'FR', 'DE'] as const;

export type SupportedKycCountry = (typeof SUPPORTED_KYC_COUNTRIES)[number];

export function normalizeCountryCode(value: string): string {
  return value.trim().toUpperCase();
}

export function isSupportedKycCountry(value: string): value is SupportedKycCountry {
  const normalized = normalizeCountryCode(value);
  return (SUPPORTED_KYC_COUNTRIES as readonly string[]).includes(normalized);
}
