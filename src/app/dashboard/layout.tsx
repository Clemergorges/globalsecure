import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SidebarNav } from './components/SidebarNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex selection:bg-cyan-500/30">
      {/* Background Effects (Subtle) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/05 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/05 blur-[120px] rounded-full" />
      </div>

      {/* Sidebar Desktop */}
      <SidebarNav userEmail={session.email} userRole={session.role} />

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen relative z-1">
        {children}
      </main>
    </div>
  );
}
