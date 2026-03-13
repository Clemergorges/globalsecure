'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  ArrowRightLeft,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';

type Props = {
  userEmail: string;
  userRole: string;
};

export function MobileDashboardNav({ userEmail, userRole }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('Dashboard.Sidebar');
  const [open, setOpen] = useState(false);

  const navigation = [
    { key: 'overview', href: '/dashboard', icon: LayoutDashboard },
    { key: 'transactions', href: '/dashboard/transactions', icon: ArrowRightLeft },
    { key: 'limits', href: '/dashboard/limits', icon: SlidersHorizontal },
    { key: 'cards', href: '/dashboard/cards', icon: CreditCard },
    { key: 'security', href: '/dashboard/settings/security', icon: Shield },
    { key: 'settings', href: '/dashboard/settings', icon: Settings },
    { key: 'profile', href: '/dashboard/settings/profile', icon: User },
    { key: 'support', href: '/dashboard/support', icon: HelpCircle },
  ];

  const handleLogout = async () => {
    setOpen(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/auth/login');
      router.refresh();
    }
  };

  return (
    <div className="md:hidden sticky top-0 z-20 border-b border-white/5 bg-[#09090b]/95 backdrop-blur">
      <div className="h-14 px-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3" aria-label="Dashboard">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-20" />
            <Logo className="w-7 h-7 relative z-10" showText={false} />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">GlobalSecure</span>
        </Link>

        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={open ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={open}
              className="text-white hover:bg-white/5"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </DialogPrimitive.Trigger>

          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
              className={cn(
                'fixed inset-y-0 left-0 z-50 w-[85vw] max-w-xs border-r border-white/10 bg-[#09090b] p-4 text-white shadow-2xl outline-none',
                'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-20" />
                    <Logo className="w-7 h-7 relative z-10" showText={false} />
                  </div>
                  <span className="font-bold text-lg tracking-tight text-white">GlobalSecure</span>
                </div>

                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" aria-label="Fechar" className="text-white hover:bg-white/5">
                    <X className="w-5 h-5" />
                  </Button>
                </DialogPrimitive.Close>
              </div>

              <div className="mt-5 rounded-xl bg-white/5 border border-white/5 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-cyan-900/20">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{userEmail}</p>
                  <p className="text-xs text-slate-500 truncate">{userRole}</p>
                </div>
              </div>

              <nav className="mt-6 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push(item.href);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors',
                        isActive ? 'bg-cyan-500/20 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      <item.icon className={cn('w-5 h-5', isActive ? 'text-cyan-300' : 'text-slate-400')} aria-hidden="true" />
                      <span>{t(item.key as any)}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-6 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-300 hover:bg-red-950/20 hover:text-red-200 transition-colors"
                >
                  <LogOut className="w-5 h-5" aria-hidden="true" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </div>
  );
}

