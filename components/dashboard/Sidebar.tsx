'use client';

import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { LayoutDashboard, Send, CreditCard, History, Shield, LogOut, X, Lock } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const t = useTranslations('Dashboard.Sidebar');

  const links = [
    { href: '/dashboard', label: t('overview'), icon: LayoutDashboard },
    { href: '/dashboard/send', label: t('send'), icon: Send },
    { href: '/dashboard/cards', label: t('cards'), icon: CreditCard },
    { href: '/dashboard/activity', label: t('history'), icon: History },
    { href: '/dashboard/settings/security', label: t('security'), icon: Shield },
  ];

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Check if user is admin from cookie or fetch
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user?.email === 'clemergorges@hotmail.com') {
          setIsAdmin(true);
        }
      })
      .catch(console.error);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 transform bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center justify-between px-6 border-b border-gray-100 dark:border-gray-800">
          <Logo className="w-8 h-8" textClassName="text-lg dark:text-white" />
          <button onClick={() => setMobileOpen(false)} className="md:hidden text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          {links.map((link) => {
            const Icon = link.icon;
            // Basic check for active state (could be improved to handle sub-paths)
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                  isActive 
                    ? 'bg-[var(--color-primary)] text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {isClient ? link.label : <span className="opacity-0">{link.label}</span>}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all text-indigo-600 hover:bg-indigo-50 mt-4`}
            >
              <Lock className="w-5 h-5" />
              {isClient ? t('admin') : <span className="opacity-0">Admin</span>}
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 rounded-lg transition-all"
          >
            <LogOut className="w-5 h-5" />
            {isClient ? t('logout') : <span className="opacity-0">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
