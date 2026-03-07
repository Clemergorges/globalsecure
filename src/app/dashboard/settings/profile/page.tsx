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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function getCallingCode(country: string | null | undefined) {
    switch ((country || '').toUpperCase()) {
      case 'BR': return '+55';
      case 'US': return '+1';
      case 'PT': return '+351';
      case 'FR': return '+33';
      case 'DE': return '+49';
      case 'LU': return '+352';
      case 'GB': return '+44';
      case 'ES': return '+34';
      default: return '+';
    }
  }

  const callingCode = getCallingCode(user?.country);

  function formatPostalCode(country: string | null | undefined, raw: string) {
    const c = (country || '').toUpperCase();
    if (c === 'BR') {
      const digits = raw.replaceAll(/\D/g, '').slice(0, 8);
      if (digits.length <= 5) return digits;
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    if (c === 'LU') {
      const digits = raw.replaceAll(/\D/g, '').slice(0, 4);
      if (!digits) return '';
      return `L-${digits}`;
    }
    if (c === 'PT') {
      const digits = raw.replaceAll(/\D/g, '').slice(0, 7);
      if (digits.length <= 4) return digits;
      return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }
    if (c === 'FR' || c === 'DE') {
      return raw.replaceAll(/\D/g, '').slice(0, 5);
    }
    if (c === 'US') {
      const digits = raw.replaceAll(/\D/g, '').slice(0, 9);
      if (digits.length <= 5) return digits;
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return raw;
  }

  function postalPlaceholder(country: string | null | undefined) {
    const c = (country || '').toUpperCase();
    if (c === 'BR') return '00000-000';
    if (c === 'LU') return 'L-0000';
    if (c === 'PT') return '0000-000';
    if (c === 'FR') return '00000';
    if (c === 'DE') return '00000';
    if (c === 'US') return '00000-0000';
    return '';
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        setFirstName(typeof data?.user?.firstName === 'string' ? data.user.firstName : '');
        setLastName(typeof data?.user?.lastName === 'string' ? data.user.lastName : '');
        const rawPhone = typeof data?.user?.phone === 'string' ? data.user.phone : '';
        const cc = getCallingCode(typeof data?.user?.country === 'string' ? data.user.country : '');
        const normalized = rawPhone.replaceAll(/\s+/g, '');
        if (normalized.startsWith(cc) && cc !== '+') {
          setPhoneLocal(normalized.slice(cc.length).replaceAll(/\D/g, ''));
        } else if (normalized.startsWith('+')) {
          setPhoneLocal(normalized.replaceAll(/\D/g, '').slice(1));
        } else {
          setPhoneLocal(normalized.replaceAll(/\D/g, ''));
        }
        setAddress(typeof data?.user?.address === 'string' ? data.user.address : '');
        setCity(typeof data?.user?.city === 'string' ? data.user.city : '');
        setPostalCode(formatPostalCode(typeof data?.user?.country === 'string' ? data.user.country : null, typeof data?.user?.postalCode === 'string' ? data.user.postalCode : ''));
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  if (!user) return <div className="p-8">{t('loadError')}</div>;

  async function saveProfile() {
    setSaveError(null);
    setSaving(true);
    try {
      const phoneDigits = phoneLocal.replaceAll(/\D/g, '');
      const fullPhone = phoneDigits.length > 0 && callingCode !== '+' ? `${callingCode}${phoneDigits}` : null;

      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          phone: fullPhone,
          address: address.trim() || null,
          city: city.trim() || null,
          postalCode: postalCode.trim() || null,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data && typeof data === 'object' && typeof (data as any).error === 'string'
            ? (data as any).error
            : t('profileUpdateFailed');
        throw new Error(msg);
      }
      const updatedUser = data && typeof data === 'object' ? (data as any).user : null;
      if (updatedUser) {
        setUser((prev: any) => ({ ...prev, ...updatedUser }));
        setFirstName(typeof updatedUser.firstName === 'string' ? updatedUser.firstName : '');
        setLastName(typeof updatedUser.lastName === 'string' ? updatedUser.lastName : '');
        const updatedPhone = typeof updatedUser.phone === 'string' ? updatedUser.phone : '';
        const normalized = updatedPhone.replaceAll(/\s+/g, '');
        if (normalized.startsWith(callingCode) && callingCode !== '+') {
          setPhoneLocal(normalized.slice(callingCode.length).replaceAll(/\D/g, ''));
        } else if (normalized.startsWith('+')) {
          setPhoneLocal(normalized.replaceAll(/\D/g, '').slice(1));
        } else {
          setPhoneLocal(normalized.replaceAll(/\D/g, ''));
        }
        setAddress(typeof updatedUser.address === 'string' ? updatedUser.address : '');
        setCity(typeof updatedUser.city === 'string' ? updatedUser.city : '');
        setPostalCode(typeof updatedUser.postalCode === 'string' ? updatedUser.postalCode : '');
      }
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : t('profileUpdateFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <h2 className="text-2xl font-bold tracking-tight text-white">{t('title')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Cartão de Identidade */}
        <Card className="md:col-span-1 bg-[#111116] border-white/5 backdrop-blur-sm">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] mb-4">
              <span className="text-3xl font-bold">{(firstName?.[0] || '—')}{(lastName?.[0] || '—')}</span>
            </div>
            <h3 className="text-xl font-bold text-white">{firstName} {lastName}</h3>
            <p className="text-sm text-slate-400 mb-4">{user.email}</p>
            
            <div className="w-full py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 mb-4 border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
              <ShieldCheck className="w-4 h-4" />
              {t('kycLevelLabel')}: {user.kycLevel === 2 ? t('kycLevels.premium') : user.kycLevel === 1 ? t('kycLevels.verified') : t('kycLevels.basic')}
            </div>

            {user.kycLevel < 2 && (
              <Button 
                onClick={() => router.push('/dashboard/settings/kyc')} 
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
              >
                {user.kycStatus === 'PENDING' ? t('kycPending') : t('increaseLimits')}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Dados Pessoais */}
        <Card className="md:col-span-2 bg-[#111116] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">{t('personalDataTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">{t('firstName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-9 bg-[#1a1a1f] border-white/10 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">{t('lastName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="pl-9 bg-[#1a1a1f] border-white/10 text-white" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">{t('email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input defaultValue={user.email} disabled className="pl-9 bg-[#1a1a1f] border-white/10 text-slate-200 disabled:opacity-70" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">{t('phone')}</Label>
              <div className="flex gap-2">
                <div className="relative w-[110px]">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input value={callingCode} disabled className="pl-9 bg-[#1a1a1f] border-white/10 text-slate-200 disabled:opacity-70" />
                </div>
                <Input
                  inputMode="numeric"
                  value={phoneLocal}
                  onChange={(e) => setPhoneLocal(e.target.value.replaceAll(/\D/g, '').slice(0, 18))}
                  className="bg-[#1a1a1f] border-white/10 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">{t('address')}</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="bg-[#1a1a1f] border-white/10 text-white" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">{t('city')}</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} className="bg-[#1a1a1f] border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">{t('postalCode')}</Label>
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(formatPostalCode(user?.country, e.target.value))}
                  placeholder={postalPlaceholder(user?.country)}
                  className="bg-[#1a1a1f] border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">{t('country')}</Label>
                <div className="relative">
                  <Flag className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input defaultValue={user.country || t('notAvailable')} disabled className="pl-9 bg-[#1a1a1f] border-white/10 text-slate-200 disabled:opacity-70" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">{t('primaryCurrency')}</Label>
                <div className="relative">
                  <Coins className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input defaultValue={user.account?.primaryCurrency || t('notAvailable')} disabled className="pl-9 bg-[#1a1a1f] border-white/10 text-slate-200 disabled:opacity-70" />
                </div>
              </div>
            </div>

            {saveError && <div className="text-sm text-red-300">{saveError}</div>}

            <div className="pt-4 flex justify-end gap-3">
              <Button
                type="button"
                onClick={() => router.push('/dashboard/settings/security')}
                variant="outline"
                className="border-white/10 text-slate-200 hover:bg-white/[0.06]"
              >
                {t('goToSecurity')}
              </Button>
              <Button type="button" onClick={saveProfile} disabled={saving} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
                {saving && <Loader2 className="animate-spin mr-2 w-4 h-4" />}
                {t('saveProfile')}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
