
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';
import DashboardOverviewClient from '@/app/dashboard/DashboardOverviewClient';

export default async function DashboardPage() {
  const t = await getTranslations('Dashboard');
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
          <p className="text-slate-400">{t('welcome')}, {session.email}</p>
        </div>
      </div>
      <DashboardOverviewClient />
    </div>
  );
}
