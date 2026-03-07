import { validateCPF, isAdult } from '@/lib/validation';

describe('Register Validation Logic', () => {
  test('should validate CPF correctly', () => {
    expect(validateCPF('00000000000')).toBe(false);
    expect(validateCPF('11111111111')).toBe(false);
    expect(validateCPF('12345678900')).toBe(false); // Invalid check digit
    expect(validateCPF('12345678909')).toBe(true); // Mathematically valid sequential
  });

  test('should validate age correctly', () => {
    const today = new Date();
    
    const adultDate = new Date(today);
    adultDate.setFullYear(today.getFullYear() - 18);
    // Adjust to ensure it's fully 18 years ago
    adultDate.setDate(adultDate.getDate() - 1);
    expect(isAdult(adultDate)).toBe(true);

    const childDate = new Date(today);
    childDate.setFullYear(today.getFullYear() - 17);
    expect(isAdult(childDate)).toBe(false);
  });
});