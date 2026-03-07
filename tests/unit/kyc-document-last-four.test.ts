import {
  getDocumentLastFourErrorKey,
  getDocumentLastFourLabelKey,
  getDocumentLastFourPlaceholderKey,
  validateDocumentLastFour,
} from '@/lib/kyc/document-last-four';

describe('kyc document last four', () => {
  test('US: valida 4 dígitos', () => {
    expect(validateDocumentLastFour('1234', 'US')).toBe(true);
    expect(validateDocumentLastFour('12a4', 'US')).toBe(false);
    expect(validateDocumentLastFour('123', 'US')).toBe(false);
  });

  test('LU/DE/FR/outros: valida 4 caracteres alfanuméricos', () => {
    expect(validateDocumentLastFour('A1B2', 'LU')).toBe(true);
    expect(validateDocumentLastFour('l0k9', 'DE')).toBe(true);
    expect(validateDocumentLastFour('12-4', 'FR')).toBe(false);
    expect(validateDocumentLastFour('123', 'LU')).toBe(false);
  });

  test('keys mudam conforme país', () => {
    expect(getDocumentLastFourLabelKey('US')).toBe('lastFour.labelUs');
    expect(getDocumentLastFourLabelKey('LU')).toBe('lastFour.labelOther');
    expect(getDocumentLastFourPlaceholderKey('US')).toBe('lastFour.placeholderUs');
    expect(getDocumentLastFourPlaceholderKey('BR')).toBe('lastFour.placeholderOther');
    expect(getDocumentLastFourErrorKey('US')).toBe('errors.lastFourInvalidUs');
    expect(getDocumentLastFourErrorKey('DE')).toBe('errors.lastFourInvalidOther');
  });
});

