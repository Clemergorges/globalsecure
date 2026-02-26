export type JurisdictionId = 'EU' | 'BR' | 'OTHER';

export type JurisdictionRules = {
  jurisdiction: JurisdictionId;
  supported: boolean;
  limitsEur: {
    perTxEur: number;
    dailyEur: number;
    monthlyEur: number;
  };
  statementRequiredFields: string[];
  taxDisclaimerKey: string;
};

function asCountry(code?: string | null) {
  const c = (code || '').trim().toUpperCase();
  return c.length === 2 ? c : null;
}

function isEuCountry(country: string) {
  return ['DE', 'FR', 'ES', 'PT', 'LU', 'NL', 'BE', 'IT', 'IE', 'AT'].includes(country);
}

function getBlockedCountries(): Set<string> {
  const raw = process.env.JURISDICTION_BLOCK_COUNTRIES || '';
  return new Set(
    raw
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean),
  );
}

export function getJurisdictionRules(countryCode?: string | null): JurisdictionRules {
  const c = asCountry(countryCode);
  const blocked = getBlockedCountries();
  if (!c) {
    return {
      jurisdiction: 'OTHER',
      supported: true,
      limitsEur: { perTxEur: 5000, dailyEur: 15000, monthlyEur: 50000 },
      statementRequiredFields: [],
      taxDisclaimerKey: 'Common.disclaimer.tax',
    };
  }

  if (blocked.has(c)) {
    return {
      jurisdiction: 'OTHER',
      supported: false,
      limitsEur: { perTxEur: 0, dailyEur: 0, monthlyEur: 0 },
      statementRequiredFields: [],
      taxDisclaimerKey: 'Common.disclaimer.tax',
    };
  }

  if (c === 'BR') {
    return {
      jurisdiction: 'BR',
      supported: true,
      limitsEur: { perTxEur: 3000, dailyEur: 8000, monthlyEur: 25000 },
      statementRequiredFields: ['intermediary', 'sourceCountry'],
      taxDisclaimerKey: 'Common.disclaimer.tax.br',
    };
  }

  if (isEuCountry(c)) {
    return {
      jurisdiction: 'EU',
      supported: true,
      limitsEur: { perTxEur: 10000, dailyEur: 25000, monthlyEur: 100000 },
      statementRequiredFields: ['intermediary', 'sourceCountry'],
      taxDisclaimerKey: `Common.disclaimer.tax.${c.toLowerCase()}`,
    };
  }

  return {
    jurisdiction: 'OTHER',
    supported: true,
    limitsEur: { perTxEur: 5000, dailyEur: 15000, monthlyEur: 50000 },
    statementRequiredFields: ['intermediary', 'sourceCountry'],
    taxDisclaimerKey: 'Common.disclaimer.tax',
  };
}
