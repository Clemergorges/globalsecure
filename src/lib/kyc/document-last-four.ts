export function normalizeDocumentLastFour(value: string): string {
  return value.trim().toUpperCase();
}

export function validateDocumentLastFour(value: string, country: string): boolean {
  const v = normalizeDocumentLastFour(value);
  const c = country.trim().toUpperCase();
  if (c === 'US') return /^\d{4}$/.test(v);
  return /^[A-Z0-9]{4}$/.test(v);
}

export function getDocumentLastFourLabelKey(country: string): 'lastFour.labelUs' | 'lastFour.labelOther' {
  return country.trim().toUpperCase() === 'US' ? 'lastFour.labelUs' : 'lastFour.labelOther';
}

export function getDocumentLastFourPlaceholderKey(
  country: string,
): 'lastFour.placeholderUs' | 'lastFour.placeholderOther' {
  return country.trim().toUpperCase() === 'US' ? 'lastFour.placeholderUs' : 'lastFour.placeholderOther';
}

export function getDocumentLastFourErrorKey(
  country: string,
): 'errors.lastFourInvalidUs' | 'errors.lastFourInvalidOther' {
  return country.trim().toUpperCase() === 'US' ? 'errors.lastFourInvalidUs' : 'errors.lastFourInvalidOther';
}
