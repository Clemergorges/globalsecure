export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  'LU': 'EUR', 'DE': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'IT': 'EUR', 'PT': 'EUR', 'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR', 'IE': 'EUR', 'FI': 'EUR',
  'BR': 'BRL',
  'US': 'USD', 'GB': 'GBP'
};

export function getCurrencyForCountry(country: string): string {
  return COUNTRY_CURRENCY_MAP[country.toUpperCase()] || 'USD';
}

export function getPaymentMethodsForCountry(country: string) {
  const currency = getCurrencyForCountry(country);
  const isSepa = ['LU', 'DE', 'FR', 'ES', 'PT', 'IT', 'NL', 'BE'].includes(country);
  
  return {
    pix: country === 'BR',
    sepa: isSepa || currency === 'EUR',
    crypto: true,
    swift: true
  };
}