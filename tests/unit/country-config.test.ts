import { getCurrencyForCountry, getPaymentMethodsForCountry } from '@/lib/country-config';

describe('Country Configuration Logic', () => {
  
  test('should return correct currency for known countries', () => {
    expect(getCurrencyForCountry('BR')).toBe('BRL');
    expect(getCurrencyForCountry('US')).toBe('USD');
    expect(getCurrencyForCountry('LU')).toBe('EUR');
    expect(getCurrencyForCountry('DE')).toBe('EUR');
    expect(getCurrencyForCountry('GB')).toBe('GBP');
  });

  test('should default to USD for unknown countries', () => {
    expect(getCurrencyForCountry('XX')).toBe('USD');
    expect(getCurrencyForCountry('JP')).toBe('USD'); // Assuming JP not mapped yet
  });

  test('should configure payment methods correctly for Brazil', () => {
    const methods = getPaymentMethodsForCountry('BR');
    expect(methods.pix).toBe(true);
    expect(methods.sepa).toBe(false);
    expect(methods.crypto).toBe(true);
  });

  test('should configure payment methods correctly for Luxembourg (SEPA)', () => {
    const methods = getPaymentMethodsForCountry('LU');
    expect(methods.pix).toBe(false);
    expect(methods.sepa).toBe(true);
    expect(methods.crypto).toBe(true);
  });

  test('should configure payment methods correctly for US (Swift/Crypto only)', () => {
    const methods = getPaymentMethodsForCountry('US');
    expect(methods.pix).toBe(false);
    expect(methods.sepa).toBe(false);
    expect(methods.crypto).toBe(true);
  });
});