import fs from 'fs';
import path from 'path';

function walkValues(value: unknown, visit: (s: string, jsonPath: string) => void, jsonPath = '$') {
  if (typeof value === 'string') {
    visit(value, jsonPath);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkValues(v, visit, `${jsonPath}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => walkValues(v, visit, `${jsonPath}.${k}`));
  }
}

describe('i18n messages placeholders', () => {
  test('não usa placeholders com double braces ({{var}})', () => {
    const root = path.join(process.cwd(), 'messages');
    const files = fs.readdirSync(root).filter((f) => f.endsWith('.json'));

    const errors: string[] = [];

    for (const file of files) {
      const full = path.join(root, file);
      const parsed = JSON.parse(fs.readFileSync(full, 'utf8')) as unknown;
      walkValues(parsed, (s, p) => {
        if (s.includes('{{') || s.includes('}}')) {
          errors.push(`${file}:${p}: ${s}`);
        }
      });
    }

    expect(errors).toEqual([]);
  });
});

