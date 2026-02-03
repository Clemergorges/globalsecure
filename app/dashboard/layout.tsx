import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Send, 
  CreditCard, 
  History, 
  Settings, 
  LogOut, 
  Globe
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r border-slate-800 bg-slate-900 md:flex flex-col">
        <div className="p-6 flex items-center gap-2 font-bold text-xl text-blue-500">
          <Globe className="w-6 h-6" />
          GlobalSecure
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full justify-start gap-2 text-slate-400 hover:text-white hover:bg-slate-800">
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </Button>
          </Link>
          <Link href="/dashboard/send">
            <Button variant="ghost" className="w-full justify-start gap-2 text-slate-400 hover:text-white hover:bg-slate-800">
              <Send className="w-4 h-4" />
              Send Money
            </Button>
          </Link>
          <Link href="/dashboard/cards">
            <Button variant="ghost" className="w-full justify-start gap-2 text-slate-400 hover:text-white hover:bg-slate-800">
              <CreditCard className="w-4 h-4" />
              Cards
            </Button>
          </Link>
          <Link href="/dashboard/activity">
            <Button variant="ghost" className="w-full justify-start gap-2 text-slate-400 hover:text-white hover:bg-slate-800">
              <History className="w-4 h-4" />
              Activity
            </Button>
          </Link>
          <Link href="/dashboard/settings">
            <Button variant="ghost" className="w-full justify-start gap-2 text-slate-400 hover:text-white hover:bg-slate-800">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-800">
           <form action="/api/auth/logout" method="POST">
             <Button variant="ghost" className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/20">
              <LogOut className="w-4 h-4" />
              Log Out
            </Button>
           </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-slate-800 flex items-center px-6 bg-slate-900/50 backdrop-blur">
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </header>
        <div className="p-6 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
