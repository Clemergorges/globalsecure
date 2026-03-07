import { validateDocument } from '@/lib/validation';

describe('International Document Validation', () => {
  test('BR: CPF', () => {
    expect(validateDocument('BR', '12345678909')).toBe(true); // Valid check digit
    expect(validateDocument('BR', '11111111111')).toBe(false); // Invalid
  });

  test('US: SSN/Passport', () => {
    expect(validateDocument('US', '123-45-6789')).toBe(true); // SSN Valid Format
    expect(validateDocument('US', 'A1234567')).toBe(true); // Passport
    expect(validateDocument('US', '123')).toBe(false); // Too short
  });

  test('Other: Generic (Passport/ID)', () => {
    expect(validateDocument('LU', 'A1234567')).toBe(true);
    expect(validateDocument('DE', '12345')).toBe(true);
    expect(validateDocument('FR', '1234')).toBe(false); // Too short (<5)
  });
});