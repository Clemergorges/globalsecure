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
      <h2 className="text-2xl font-bold tracking-tight text-white">{t('title')}</h2>

      <div className="grid gap-6">
        
        {/* Security Section */}
        <Card className="bg-[#111116] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Lock className="w-5 h-5 text-slate-400" />
              {t('Security.title')}
            </CardTitle>
            <CardDescription className="text-slate-500">{t('Security.description')}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-slate-200">{t('Security.authTitle')}</Label>
              <p className="text-sm text-slate-500">{t('Security.authDesc')}</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/dashboard/settings/security')} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
              {t('Security.manage')}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card className="bg-[#111116] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Bell className="w-5 h-5 text-slate-400" />
              {t('Notifications.title')}
            </CardTitle>
            <CardDescription className="text-slate-500">{t('Notifications.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="email-notif" className="text-slate-200">{t('Notifications.emailTitle')}</Label>
                <p className="text-sm text-slate-500">{t('Notifications.emailDesc')}</p>
              </div>
              <Switch id="email-notif" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="push-notif" className="text-slate-200">{t('Notifications.pushTitle')}</Label>
                <p className="text-sm text-slate-500">{t('Notifications.pushDesc')}</p>
              </div>
              <Switch id="push-notif" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card className="bg-[#111116] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Globe className="w-5 h-5 text-slate-400" />
              {t('Preferences.title')}
            </CardTitle>
            <CardDescription className="text-slate-500">{t('Preferences.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-slate-200">{t('Preferences.currencyTitle')}</Label>
                <p className="text-sm text-slate-500">{t('Preferences.currencyDesc')}</p>
              </div>
              <Button variant="outline" size="sm" className="border-white/10 text-slate-300">Euro (EUR)</Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-slate-200">{t('Preferences.languageTitle')}</Label>
                <p className="text-sm text-slate-500">{t('Preferences.languageDesc')}</p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[180px] justify-between border-white/10 text-slate-300 hover:text-white hover:bg-white/5" disabled={isPending}>
                    <span className="flex items-center gap-2">
                      <span className="text-base">{currentLang.flag}</span>
                      {currentLang.name}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px] bg-[#0A0A0F] border-white/10 text-white">
                  {LANGUAGES.map((lang) => (
                    <DropdownMenuItem 
                      key={lang.code} 
                      onClick={() => handleLanguageChange(lang.code)}
                      className="flex items-center justify-between cursor-pointer focus:bg-white/10 focus:text-white"
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