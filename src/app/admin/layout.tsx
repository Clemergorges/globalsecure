import { checkAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await checkAdmin();
  } catch {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {children}
    </div>
  );
}