'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Lock, Globe, Moon, ChevronDown, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations, useLocale } from 'next-intl';
import { setUserLocale } from '@/app/actions/set-language';

const LANGUAGES = [
  { code: 'pt', name: 'Português (BR)', flag: '🇧🇷' },
  { code: 'en', name: 'English (US)', flag: '🇺🇸' },
  { code: 'fr', name: 'Français (LU)', flag: '🇱🇺' },
  { code: 'de', name: 'Deutsch (DE)', flag: '🇩🇪' },
];

export default function SettingsGeneralPage() {
  const t = useTranslations('Settings');
  const router = useRouter();
  const currentLocale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleLanguageChange = (code: string) => {
    startTransition(() => {
      setUserLocale(code);
      router.refresh();
    });
  };

  const currentLang = LANGUAGES.find(l => l.code === currentLocale) || LANGUAGES[0];

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>

      <div className="grid gap-6">
        
        {/* Segurança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-500" />
              {t('security')}
            </CardTitle>
            <CardDescription>{t('securityDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">{t('passwordAuth')}</p>
              <p className="text-sm text-gray-500">{t('passwordAuthDesc')}</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/dashboard/settings/security')}>
              {t('manageSecurity')}
            </Button>
          </CardContent>
        </Card>

        {/* Notificações (Simulado) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-500" />
              {t('notifications')}
            </CardTitle>
            <CardDescription>{t('notificationsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="email-notif">{t('emailNotif')}</Label>
                <p className="text-sm text-gray-500">{t('emailNotifDesc')}</p>
              </div>
              <Switch id="email-notif" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="push-notif">{t('pushNotif')}</Label>
                <p className="text-sm text-gray-500">{t('pushNotifDesc')}</p>
              </div>
              <Switch id="push-notif" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Preferências */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-gray-500" />
              {t('preferences')}
            </CardTitle>
            <CardDescription>{t('preferencesDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('mainCurrency')}</Label>
                <p className="text-sm text-gray-500">{t('mainCurrencyDesc')}</p>
              </div>
              <Button variant="outline" size="sm">Euro (EUR)</Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('language')}</Label>
                <p className="text-sm text-gray-500">{t('languageDesc')}</p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[180px] justify-between" disabled={isPending}>
                    <span className="flex items-center gap-2">
                      <span className="text-base">{currentLang.flag}</span>
                      {currentLang.name}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  {LANGUAGES.map((lang) => (
                    <DropdownMenuItem 
                      key={lang.code} 
                      onClick={() => handleLanguageChange(lang.code)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base">{lang.flag}</span>
                        {lang.name}
                      </span>
                      {currentLocale === lang.code && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}