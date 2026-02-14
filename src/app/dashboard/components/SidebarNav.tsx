'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  CreditCard, 
  ArrowRightLeft, 
  Settings, 
  LogOut,
  HelpCircle,
  Shield
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface SidebarNavProps {
  userEmail: string;
  userRole: string;
}

export function SidebarNav({ userEmail, userRole }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('Dashboard.Sidebar');

  const navigation = [
    { name: t('overview'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('transactions'), href: '/dashboard/transactions', icon: ArrowRightLeft },
    { name: t('cards'), href: '/dashboard/cards', icon: CreditCard },
    { name: t('security'), href: '/dashboard/settings/security', icon: Shield },
    { name: t('settings'), href: '/dashboard/settings', icon: Settings },
    { name: t('support'), href: '/dashboard/support', icon: HelpCircle },
  ];

  const handleLogout = async () => {
    try {
      // Clear cookie on client side if possible, or call API to clear httpOnly cookie
      // Assuming we need to call an API route or just rely on server clearing it.
      // For now, let's assume we redirect to a logout route or just clear via client script if not httpOnly.
      // Since it's likely httpOnly, we should fetch a logout endpoint.
      // Let's create a logout endpoint later or assume deleting cookie by name works if not httpOnly.
      // Actually, safest is to just redirect to /auth/login which might clear it or we just redirect.
      // Let's assume standard Next.js auth behavior.
      
      // Better: Call a server action or API route.
      // For this MVP, let's just expire the cookie manually if we can access it, or redirect.
      document.cookie = 'auth_token=; Max-Age=0; path=/;';
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed', error);
      router.push('/auth/login');
    }
  };

  return (
    <aside className="w-64 bg-[#09090b] border-r border-white/5 hidden md:flex flex-col fixed h-full z-10">
      <div className="p-6 flex items-center gap-3">
        <div className="relative">
             <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-20"></div>
             <Logo className="w-8 h-8 relative z-10" showText={false} />
        </div>
        <span className="font-bold text-xl tracking-tight text-white">GlobalSecure</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group relative overflow-hidden",
                isActive 
                  ? "text-white bg-cyan-500/30 border border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.6)]" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-transparent opacity-100" />
              )}
              <item.icon className={cn(
                "w-5 h-5 transition-colors relative z-10", 
                isActive ? "text-white" : "text-slate-500 group-hover:text-cyan-400"
              )} />
              <span className="relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 space-y-4">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-cyan-900/20">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {userEmail}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {userRole}
            </p>
          </div>
        </div>

        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="w-full flex items-center justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          {t('logout')}
        </Button>
      </div>
    </aside>
  );
}
