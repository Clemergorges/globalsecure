import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import YieldClient from './YieldClient';

export default async function YieldPage() {
  const session = await getSession();
  if (!session) redirect('/auth/login');
  return <YieldClient />;
}
