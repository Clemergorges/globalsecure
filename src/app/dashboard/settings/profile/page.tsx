'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, ShieldCheck, Loader2, Flag, Coins } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const t = useTranslations('Settings.Profile');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  if (!user) return <div className="p-8">{t('loadError')}</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Cartão de Identidade */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] mb-4">
              <span className="text-3xl font-bold">{user.firstName?.[0]}{user.lastName?.[0]}</span>
            </div>
            <h3 className="text-xl font-bold">{user.firstName} {user.lastName}</h3>
            <p className="text-sm text-gray-500 mb-4">{user.email}</p>
            
            <div className="w-full py-2 px-4 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4" />
              {t('kycLevelLabel')}: {user.kycLevel === 2 ? t('kycLevels.premium') : user.kycLevel === 1 ? t('kycLevels.verified') : t('kycLevels.basic')}
            </div>

            {user.kycLevel < 2 && (
              <Button 
                onClick={() => router.push('/dashboard/settings/kyc')} 
                className="w-full bg-[var(--color-primary)] text-white"
              >
                {user.kycStatus === 'PENDING' ? t('kycPending') : t('increaseLimits')}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Dados Pessoais */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('personalDataTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('firstName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input defaultValue={user.firstName} disabled className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('lastName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input defaultValue={user.lastName} disabled className="pl-9" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input defaultValue={user.email} disabled className="pl-9" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('phone')}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input defaultValue={user.phone || t('notProvided')} disabled className="pl-9" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('country')}</Label>
                <div className="relative">
                  <Flag className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input defaultValue={user.country || t('notAvailable')} disabled className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('primaryCurrency')}</Label>
                <div className="relative">
                  <Coins className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input defaultValue={user.account?.primaryCurrency || t('notAvailable')} disabled className="pl-9" />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button disabled variant="outline">{t('editComingSoon')}</Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
