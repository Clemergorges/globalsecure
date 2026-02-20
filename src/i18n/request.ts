import {getRequestConfig} from 'next-intl/server';
import {cookies} from 'next/headers';

export default getRequestConfig(async () => {
  // Provide a static locale, fetch a user setting,
  // read from `cookies()`, `headers()`, etc.
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const supportedLocales = new Set(['pt', 'en', 'fr', 'de']);
  const locale = rawLocale && supportedLocales.has(rawLocale) ? rawLocale : 'pt';
 
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`).catch(async () => {
      return (await import(`../../messages/pt.json`));
    })).default
  };
});
