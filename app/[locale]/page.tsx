import { redirect } from 'next/navigation';

export default async function Home({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  // Redirect to the dashboard transactions page, preserving the locale.
  // The middleware will normalize the URL (e.g., remove /pt if it's the default).
  redirect(`/${locale}/dashboard/transactions`);
}
