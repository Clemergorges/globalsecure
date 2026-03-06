'use client';

import { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import { dashboardNavigationItems } from './SidebarNav';

export function MobileDashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const tSidebar = useTranslations('Dashboard.Sidebar');
  const tCommon = useTranslations('Common');
  const [open, setOpen] = useState(false);

  const handleNavigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

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
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-20" />
            <Logo className="w-7 h-7 relative z-10" showText={false} />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">GlobalSecure</span>
        </div>

        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={open ? tCommon('closeMenu') : tCommon('openMenu')}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={tCommon('closeMenu')}
                    className="text-white hover:bg-white/5"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </DialogPrimitive.Close>
              </div>

              <nav className="mt-6 space-y-1">
                {dashboardNavigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => handleNavigate(item.href)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors',
                        isActive ? 'bg-cyan-500/20 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      <item.icon className={cn('w-5 h-5', isActive ? 'text-cyan-300' : 'text-slate-400')} />
                      <span>{tSidebar(item.key)}</span>
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
                  <LogOut className="w-5 h-5" />
                  <span>{tSidebar('logout')}</span>
                </button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </div>
  );
}

