'use client';

import { Menu, Bell, Search, User, LogOut, Settings, CreditCard, HelpCircle, CheckCircle2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const t = useTranslations('Dashboard.Header');
  const [user, setUser] = useState<{ firstName: string; lastName: string; kycLevel: number } | null>(null);

  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; body: string; type: string; read: boolean; createdAt: string }>>([]);

  const fetchNotifications = () => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (data.notifications) setNotifications(data.notifications);
      })
      .catch(err => console.error('Failed to load notifications', err));
  };

  const markRead = () => {
    fetch('/api/notifications', { method: 'POST' })
      .then(() => fetchNotifications());
  };

  useEffect(() => {
    // Load User
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(err => console.error('Failed to load user', err));

    // Load Notifications
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const getStatusLabel = (level: number) => {
    if (level >= 2) return 'Premium';
    if (level === 1) return 'Verificado';
    return 'Standard';
  };

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Carregando...';
  const statusLabel = user ? getStatusLabel(user.kycLevel) : '...';

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 md:px-10">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden text-gray-500 hover:text-gray-900">
          <Menu className="w-6 h-6" />
        </button>
        <div className="hidden md:flex items-center gap-2 text-gray-400 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg border border-transparent focus-within:border-[var(--color-primary)] transition-all w-64">
          <Search className="w-4 h-4" />
          <input 
            type="text" 
            placeholder={t('search')}
            className="bg-transparent border-none outline-none text-sm w-full text-gray-900 dark:text-white placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        
        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 text-gray-500 hover:text-[var(--color-primary)] transition-colors outline-none">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex justify-between items-center">
              <span>{t('notifications')}</span>
              {notifications.some(n => !n.read) && (
                <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Novas</span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {t('noNotifications')}
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem key={n.id} className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!n.read ? 'bg-gray-50' : ''}`}>
                    <div className="flex items-center gap-2 w-full">
                      {n.type === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Bell className="w-4 h-4 text-blue-500" />}
                      <span className="font-medium text-sm">{n.title}</span>
                      <span className="ml-auto text-xs text-gray-400">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 pl-6">{n.body}</p>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="p-2 text-center">
              <button onClick={markRead} className="text-xs text-[var(--color-primary)] hover:underline font-medium">
                {t('markAllRead')}
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="h-6 w-[1px] bg-gray-200 dark:bg-gray-700"></div>
        
        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
               <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{fullName}</p>
                  <p className="text-xs text-gray-500">{statusLabel}</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center border border-[var(--color-primary)]/20 text-[var(--color-primary)]">
                  {user ? (
                    <span className="font-bold text-sm">{user.firstName[0]}{user.lastName[0]}</span>
                  ) : (
                    <User className="w-5 h-5" />
                  )}
               </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 pb-2 border-b border-gray-100 mb-1 sm:hidden">
               <p className="text-sm font-semibold text-gray-900">{fullName}</p>
               <p className="text-xs text-gray-500">{statusLabel}</p>
            </div>
            <DropdownMenuLabel>{t('myAccount')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/dashboard/settings/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>{t('profile')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/dashboard/cards')}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>{t('myCards')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/dashboard/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{t('settings')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/dashboard/support')}>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>{t('help')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}
