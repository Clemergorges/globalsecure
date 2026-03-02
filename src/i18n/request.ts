import {getRequestConfig} from 'next-intl/server';
import {cookies} from 'next/headers';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v);
      continue;
    }
    out[k] = v;
  }
  return out;
}

export default getRequestConfig(async () => {
  // Provide a static locale, fetch a user setting,
  // read from `cookies()`, `headers()`, etc.
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const supportedLocales = new Set(['pt', 'en', 'fr', 'de', 'es']);
  const locale = rawLocale && supportedLocales.has(rawLocale) ? rawLocale : 'pt';
 
  const base = (await import(`../../messages/pt.json`)).default as Record<string, unknown>;
  const localized = (await import(`../../messages/${locale}.json`).catch(async () => {
    return { default: {} };
  })).default as Record<string, unknown>;

  return {
    locale,
    messages: locale === 'pt' ? base : deepMerge(base, localized)
  };
});
