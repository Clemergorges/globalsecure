'use server';

import {cookies} from 'next/headers';

export async function setUserLocale(locale: string) {
  (await cookies()).set('NEXT_LOCALE', locale);
}
