'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { useTranslations } from 'next-intl';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const t = useTranslations('VerifyEmail');
  const tc = useTranslations('Common');

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');
    setInfo('');

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorCode = data?.code;
        if (errorCode === 'OTP_INVALID') throw new Error(t('errors.invalidCode'));
        if (errorCode === 'OTP_EXPIRED') throw new Error(t('errors.expiredCode'));
        if (errorCode === 'OTP_USED') throw new Error(t('errors.usedCode'));
        throw new Error(data?.error || t('errors.verifyFailed'));
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login?verified=true');
      }, 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (!email) return;

    setResending(true);
    setError('');
    setInfo('');

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || t('errors.resendFailed'));
      }

      setInfo(t('info.resent'));
      setCode('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  if (!email) {
    return (
      <Card className="w-full max-w-md border-gray-200 bg-white shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-6">
            <Logo showText={false} className="w-16 h-16" />
          </div>
          <CardTitle className="text-2xl text-center font-bold text-gray-900">{t('title')}</CardTitle>
          <CardDescription className="text-center text-gray-500">
            {t('missingEmail')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={() => router.push('/auth/register')}>
            {t('backToRegister')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-gray-200 bg-white shadow-xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-6">
          <Logo showText={false} className="w-16 h-16" />
        </div>
        <CardTitle className="text-2xl text-center font-bold text-gray-900">{t('title')}</CardTitle>
        <CardDescription className="text-center text-gray-500">
          {t('sentTo')} <br />
          <span className="font-medium text-gray-900">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-emerald-500" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">{t('success.title')}</h3>
              <p className="text-gray-500">{t('success.subtitle')}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-gray-700">{t('codeLabel')}</Label>
              <Input
                id="code"
                name="code"
                autoComplete="one-time-code"
                placeholder="000000"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="bg-white border-gray-300 text-center text-2xl tracking-[0.5em] h-14 font-mono focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                disabled={loading || resending}
              />
              <div className="text-xs text-gray-500 text-center flex items-center justify-center gap-2">
                <Mail className="w-3 h-3" />
                {t('checkInbox')}
              </div>
            </div>

            {info && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm border border-blue-100">
                <CheckCircle className="w-4 h-4" />
                {info}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <Button
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold h-11 shadow-sm"
              type="submit"
              disabled={loading || resending || code.length < 6}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('submit')}
            </Button>

            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={onResend}
              disabled={loading || resending}
            >
              {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('resend')}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  const tc = useTranslations('Common');
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<div className="text-center">{tc('loading')}</div>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
