"use client";

import { useState, useEffect } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { useTranslations } from 'next-intl';

export default function LoginPage() {
  const t = useTranslations('Login');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Login error response:', errorData);
        throw new Error(errorData.error || 'Credenciais inválidas');
      }
      
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login catch error:', err);
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  // Prevent hydration mismatch by rendering only on client
  if (!isClient) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-gray-200 bg-white shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-6">
            <Logo showText={false} className="w-16 h-16" />
          </div>
          <CardTitle className="text-2xl text-center font-bold text-gray-900">{t('title')}</CardTitle>
          <CardDescription className="text-center text-gray-500">
            {t('subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">{t('email')}</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="seu@email.com" 
                required 
                className="bg-white border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700">{t('password')}</Label>
                <Link href="/forgot-password" className="text-xs text-[var(--color-primary)] hover:underline font-medium">
                  {t('forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <Input 
                  id="password" 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="bg-white border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] pr-10" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>}
            <Button className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold h-11 shadow-sm" type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('submit')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            {t.rich('registerLink', {
              link: (chunks) => <Link href="/register" className="text-[var(--color-primary)] hover:underline font-medium">{chunks}</Link>
            })}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
