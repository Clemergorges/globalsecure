'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Lock, Globe } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/dashboard/LanguageSwitcher';
import { CurrencySwitcher } from '@/components/dashboard/CurrencySwitcher';

export default function SettingsGeneralPage() {
  const router = useRouter();
  const t = useTranslations('Settings');

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>

      <div className="grid gap-6">
        
        {/* Segurança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-500" />
              {t('Security.title')}
            </CardTitle>
            <CardDescription>{t('Security.description')}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">{t('Security.authTitle')}</p>
              <p className="text-sm text-gray-500">{t('Security.authDesc')}</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/dashboard/settings/security')}>
              {t('Security.manage')}
            </Button>
          </CardContent>
        </Card>

        {/* Notificações (Simulado) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-500" />
              {t('Notifications.title')}
            </CardTitle>
            <CardDescription>{t('Notifications.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="email-notif">{t('Notifications.emailTitle')}</Label>
                <p className="text-sm text-gray-500">{t('Notifications.emailDesc')}</p>
              </div>
              <Switch id="email-notif" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="push-notif">{t('Notifications.pushTitle')}</Label>
                <p className="text-sm text-gray-500">{t('Notifications.pushDesc')}</p>
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
              {t('Preferences.title')}
            </CardTitle>
            <CardDescription>{t('Preferences.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('Preferences.currencyTitle')}</Label>
                <p className="text-sm text-gray-500">{t('Preferences.currencyDesc')}</p>
              </div>
              <CurrencySwitcher />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t('Preferences.languageTitle')}</Label>
                <p className="text-sm text-gray-500">{t('Preferences.languageDesc')}</p>
              </div>
              <LanguageSwitcher />
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
