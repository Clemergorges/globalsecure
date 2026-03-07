import { getJurisdictionRules } from '@/lib/services/jurisdiction-rules';

describe('jurisdiction-rules', () => {
  const prev = process.env.JURISDICTION_BLOCK_COUNTRIES;

  afterEach(() => {
    process.env.JURISDICTION_BLOCK_COUNTRIES = prev;
  });

  it('returns BR rules and supported=true', () => {
    const r = getJurisdictionRules('br');
    expect(r.supported).toBe(true);
    expect(r.jurisdiction).toBe('BR');
    expect(r.limitsEur.perTxEur).toBeGreaterThan(0);
  });

  it('returns EU rules and supported=true for DE', () => {
    const r = getJurisdictionRules('DE');
    expect(r.supported).toBe(true);
    expect(r.jurisdiction).toBe('EU');
  });

  it('blocks countries via env list', () => {
    process.env.JURISDICTION_BLOCK_COUNTRIES = 'ZZ,IR';
    const r = getJurisdictionRules('ZZ');
    expect(r.supported).toBe(false);
  });
});
