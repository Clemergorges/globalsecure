import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Send, 
  CreditCard, 
  History, 
  Settings, 
  LogOut, 
  Globe,
  Bell,
  HelpCircle,
  User
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <aside className="hidden w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 md:flex flex-col shadow-sm z-20">
        <div className="p-6 flex items-center gap-2 font-bold text-xl text-primary">
          <Globe className="w-7 h-7" />
          <span>GlobalSecure</span>
        </div>
        
        <div className="px-4 py-2">
          <Button className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 h-10 font-medium">
            <Send className="w-4 h-4" />
            Send Money
          </Button>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-6">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Menu</p>
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 h-10">
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </Button>
          </Link>
          <Link href="/dashboard/cards">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 h-10">
              <CreditCard className="w-4 h-4" />
              Cards
            </Button>
          </Link>
          <Link href="/dashboard/activity">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 h-10">
              <History className="w-4 h-4" />
              Transactions
            </Button>
          </Link>
          <Link href="/dashboard/recipients">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 h-10">
              <User className="w-4 h-4" />
              Recipients
            </Button>
          </Link>
        </nav>

        <nav className="px-4 space-y-1 mt-auto mb-6">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">System</p>
          <Link href="/dashboard/settings">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 h-10">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </Link>
          <Link href="/dashboard/help">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 h-10">
              <HelpCircle className="w-4 h-4" />
              Help Center
            </Button>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
           <form action="/api/auth/logout" method="POST">
             <Button variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 h-10">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
           </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Dashboard</h1>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-primary relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </Button>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
              CG
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
